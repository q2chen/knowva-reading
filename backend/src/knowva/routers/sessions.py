import json
import logging
import time
from collections.abc import AsyncGenerator
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from google.adk.runners import Runner
from google.genai import types
from sse_starlette import EventSourceResponse, ServerSentEvent

from knowva.agents import reading_agent
from knowva.config import settings
from knowva.middleware.firebase_auth import get_current_user
from knowva.middleware.rate_limit import limiter
from knowva.models.message import MessageCreate, MessageResponse
from knowva.models.session import SessionCreate, SessionResponse
from knowva.services import firestore
from knowva.services.session_service import get_session_service

logger = logging.getLogger(__name__)

router = APIRouter()


def json_serializer(obj):
    """JSONシリアライズ時にdatetimeをISO形式に変換する。"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


APP_NAME = "knowva"


def get_runner() -> Runner:
    """ADK Runnerを取得する。FirestoreSessionServiceを使用。"""
    return Runner(
        agent=reading_agent,
        app_name=APP_NAME,
        session_service=get_session_service(),
    )


@router.post("/{reading_id}/sessions", response_model=SessionResponse)
async def create_session(
    reading_id: str,
    body: SessionCreate,
    user: dict = Depends(get_current_user),
):
    """対話セッションを開始する。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    result = await firestore.create_session(
        user_id=user["uid"],
        reading_id=reading_id,
        data={"session_type": body.session_type},
    )

    # ADKセッションも作成（会話コンテキスト用）
    # session_typeもstateに含めて、エージェントが参照できるようにする
    session_service = get_session_service()
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=user["uid"],
        session_id=result["id"],
        state={
            "reading_id": reading_id,
            "user_id": user["uid"],
            "session_type": body.session_type,
        },
    )

    return result


@router.get("/{reading_id}/sessions", response_model=list[SessionResponse])
async def list_sessions(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """セッション一覧を取得する。"""
    return await firestore.list_sessions(user["uid"], reading_id)


@router.post(
    "/{reading_id}/sessions/{session_id}/messages",
    response_model=MessageResponse,
)
@limiter.limit(settings.rate_limit_ai_endpoints)
async def send_message(
    request: Request,
    reading_id: str,
    session_id: str,
    body: MessageCreate,
    user: dict = Depends(get_current_user),
):
    """メッセージを送信し、AIからの応答を得る（非ストリーミング版）。"""
    # NOTE: SSEストリーミング版は send_message_stream() に実装済み
    session = await firestore.get_session(user["uid"], reading_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ユーザーメッセージをFirestoreに保存
    await firestore.save_message(
        user_id=user["uid"],
        reading_id=reading_id,
        session_id=session_id,
        data={"role": "user", "message": body.message, "input_type": body.input_type},
    )

    # ADKセッションが存在するか確認、なければ作成（Firestoreから復元）
    session_service = get_session_service()
    adk_session = await session_service.get_session(
        app_name=APP_NAME, user_id=user["uid"], session_id=session_id
    )
    if not adk_session:
        adk_session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user["uid"],
            session_id=session_id,
            state={
                "reading_id": reading_id,
                "user_id": user["uid"],
                "session_type": session.get("session_type", "during_reading"),
            },
        )

    # ADK Runnerにメッセージを送信
    runner = get_runner()
    user_content = types.Content(role="user", parts=[types.Part(text=body.message)])

    response_text = ""
    try:
        async for event in runner.run_async(
            user_id=user["uid"],
            session_id=session_id,
            new_message=user_content,
        ):
            logger.debug(f"ADK event: {event}")
            # テキスト応答を収集（最終応答以外も含む）
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        # 最終応答を優先、なければ途中の応答も使用
                        if event.is_final_response():
                            response_text = part.text
                        elif not response_text:
                            response_text = part.text
    except Exception as e:
        logger.error(f"ADK runner error: {e}", exc_info=True)
        response_text = "申し訳ございません。エラーが発生しました。もう一度お試しください。"

    # 応答がない場合のフォールバック
    if not response_text:
        logger.warning("No response text from ADK runner")
        response_text = "申し訳ございません。応答を生成できませんでした。もう一度お試しください。"

    # AIの応答をFirestoreに保存
    ai_message = await firestore.save_message(
        user_id=user["uid"],
        reading_id=reading_id,
        session_id=session_id,
        data={"role": "assistant", "message": response_text, "input_type": "text"},
    )

    return ai_message


@router.get(
    "/{reading_id}/sessions/{session_id}/messages",
    response_model=list[MessageResponse],
)
async def list_messages(
    reading_id: str,
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """セッションのメッセージ履歴を取得する。"""
    return await firestore.list_messages(user["uid"], reading_id, session_id)


@router.post("/{reading_id}/sessions/{session_id}/messages/stream")
@limiter.limit(settings.rate_limit_ai_endpoints)
async def send_message_stream(
    request: Request,
    reading_id: str,
    session_id: str,
    body: MessageCreate,
    user: dict = Depends(get_current_user),
):
    """メッセージを送信し、AIからの応答をSSEでストリーミング配信する。"""
    session = await firestore.get_session(user["uid"], reading_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ユーザーメッセージをFirestoreに保存
    await firestore.save_message(
        user_id=user["uid"],
        reading_id=reading_id,
        session_id=session_id,
        data={"role": "user", "message": body.message, "input_type": body.input_type},
    )

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        """ADKイベントをSSEイベントに変換するジェネレーター"""
        # ADKセッションの取得/作成
        session_service = get_session_service()
        adk_session = await session_service.get_session(
            app_name=APP_NAME, user_id=user["uid"], session_id=session_id
        )
        if not adk_session:
            adk_session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=user["uid"],
                session_id=session_id,
                state={
                    "reading_id": reading_id,
                    "user_id": user["uid"],
                    "session_type": session.get("session_type", "during_reading"),
                },
            )

        runner = get_runner()
        user_content = types.Content(role="user", parts=[types.Part(text=body.message)])

        message_id = f"msg_{session_id}_{int(time.time() * 1000)}"
        accumulated_text = ""
        # 進行中のツール呼び出しを追跡
        pending_tool_calls: dict[str, str] = {}  # tool_id -> tool_name

        # メッセージ開始イベント
        yield ServerSentEvent(data=json.dumps({"message_id": message_id}), event="message_start")

        try:
            async for event in runner.run_async(
                user_id=user["uid"],
                session_id=session_id,
                new_message=user_content,
            ):
                # ツール呼び出しイベントの処理（part.function_callをチェック）
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        # function_callパートがあればツール開始イベントを送信
                        if hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            tool_name = getattr(fc, "name", "unknown")
                            tool_id = getattr(fc, "id", f"tc_{int(time.time() * 1000)}")
                            pending_tool_calls[tool_id] = tool_name
                            yield ServerSentEvent(
                                data=json.dumps({"tool_name": tool_name, "tool_call_id": tool_id}),
                                event="tool_call_start",
                            )

                        # function_responseパートがあればツール完了イベントを送信
                        if hasattr(part, "function_response") and part.function_response:
                            fr = part.function_response
                            tool_id = getattr(fr, "id", None)
                            tool_name = getattr(fr, "name", None)
                            result = getattr(fr, "response", {})

                            # tool_idがない場合はpending_tool_callsから探す
                            if not tool_id and tool_name:
                                for tid, tname in pending_tool_calls.items():
                                    if tname == tool_name:
                                        tool_id = tid
                                        break

                            # present_optionsツールの場合は特別なSSEイベントを送信
                            if tool_name == "present_options" and isinstance(result, dict):
                                if result.get("status") == "options_presented":
                                    yield ServerSentEvent(
                                        data=json.dumps(
                                            {
                                                "prompt": result.get("prompt", ""),
                                                "options": result.get("options", []),
                                                "allow_multiple": result.get(
                                                    "allow_multiple", True
                                                ),
                                                "allow_freeform": result.get(
                                                    "allow_freeform", True
                                                ),
                                            }
                                        ),
                                        event="options_request",
                                    )

                            if tool_id:
                                yield ServerSentEvent(
                                    data=json.dumps(
                                        {
                                            "tool_call_id": tool_id,
                                            "result": result,
                                        },
                                        default=json_serializer,
                                    ),
                                    event="tool_call_done",
                                )
                                pending_tool_calls.pop(tool_id, None)

                # テキストコンテンツの処理
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            # テキスト差分を配信
                            new_text = part.text
                            if new_text != accumulated_text:
                                # 差分のみ送信
                                delta = (
                                    new_text[len(accumulated_text) :]
                                    if new_text.startswith(accumulated_text)
                                    else new_text
                                )
                                if delta:
                                    yield ServerSentEvent(
                                        data=json.dumps({"delta": delta}), event="text_delta"
                                    )
                                accumulated_text = new_text

        except Exception as e:
            logger.error(f"ADK runner error: {e}", exc_info=True)
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "code": "runner_error",
                        "message": "エラーが発生しました。もう一度お試しください。",
                    }
                ),
                event="error",
            )
            return

        # 応答がない場合のフォールバック
        if not accumulated_text:
            accumulated_text = "申し訳ございません。応答を生成できませんでした。"
            yield ServerSentEvent(data=json.dumps({"delta": accumulated_text}), event="text_delta")

        # AIの応答をFirestoreに保存
        ai_message = await firestore.save_message(
            user_id=user["uid"],
            reading_id=reading_id,
            session_id=session_id,
            data={"role": "assistant", "message": accumulated_text, "input_type": "text"},
        )

        # テキスト完了イベント
        yield ServerSentEvent(data=json.dumps({"text": accumulated_text}), event="text_done")

        # メッセージ完了イベント
        yield ServerSentEvent(
            data=json.dumps({"message": ai_message}, default=json_serializer),
            event="message_done",
        )

    return EventSourceResponse(
        event_generator(),
        headers={"Cache-Control": "no-cache"},
    )


@router.post("/{reading_id}/sessions/{session_id}/init")
@limiter.limit(settings.rate_limit_ai_endpoints)
async def init_session(
    request: Request,
    reading_id: str,
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """セッション開始時にエージェントから初期メッセージを生成する（SSEストリーミング）。"""
    session = await firestore.get_session(user["uid"], reading_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 既にメッセージがあれば初期化しない（重複防止）
    existing_messages = await firestore.list_messages(user["uid"], reading_id, session_id)
    if existing_messages:
        raise HTTPException(status_code=400, detail="Session already initialized")

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        """エージェントの初期挨拶をSSEイベントに変換するジェネレーター"""
        # ADKセッションの取得/作成
        session_service = get_session_service()
        adk_session = await session_service.get_session(
            app_name=APP_NAME, user_id=user["uid"], session_id=session_id
        )
        if not adk_session:
            adk_session = await session_service.create_session(
                app_name=APP_NAME,
                user_id=user["uid"],
                session_id=session_id,
                state={
                    "reading_id": reading_id,
                    "user_id": user["uid"],
                    "session_type": session.get("session_type", "during_reading"),
                },
            )

        runner = get_runner()
        # セッション初期化トリガーメッセージ
        init_content = types.Content(role="user", parts=[types.Part(text="__session_init__")])

        message_id = f"msg_{session_id}_{int(time.time() * 1000)}"
        accumulated_text = ""
        pending_tool_calls: dict[str, str] = {}

        yield ServerSentEvent(data=json.dumps({"message_id": message_id}), event="message_start")

        try:
            async for event in runner.run_async(
                user_id=user["uid"],
                session_id=session_id,
                new_message=init_content,
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            tool_name = getattr(fc, "name", "unknown")
                            tool_id = getattr(fc, "id", f"tc_{int(time.time() * 1000)}")
                            pending_tool_calls[tool_id] = tool_name
                            yield ServerSentEvent(
                                data=json.dumps({"tool_name": tool_name, "tool_call_id": tool_id}),
                                event="tool_call_start",
                            )

                        if hasattr(part, "function_response") and part.function_response:
                            fr = part.function_response
                            tool_id = getattr(fr, "id", None)
                            tool_name = getattr(fr, "name", None)
                            result = getattr(fr, "response", {})

                            if not tool_id and tool_name:
                                for tid, tname in pending_tool_calls.items():
                                    if tname == tool_name:
                                        tool_id = tid
                                        break

                            if tool_name == "present_options" and isinstance(result, dict):
                                if result.get("status") == "options_presented":
                                    yield ServerSentEvent(
                                        data=json.dumps(
                                            {
                                                "prompt": result.get("prompt", ""),
                                                "options": result.get("options", []),
                                                "allow_multiple": result.get(
                                                    "allow_multiple", True
                                                ),
                                                "allow_freeform": result.get(
                                                    "allow_freeform", True
                                                ),
                                            }
                                        ),
                                        event="options_request",
                                    )

                            if tool_id:
                                yield ServerSentEvent(
                                    data=json.dumps(
                                        {
                                            "tool_call_id": tool_id,
                                            "result": result,
                                        },
                                        default=json_serializer,
                                    ),
                                    event="tool_call_done",
                                )
                                pending_tool_calls.pop(tool_id, None)

                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            new_text = part.text
                            if new_text != accumulated_text:
                                delta = (
                                    new_text[len(accumulated_text) :]
                                    if new_text.startswith(accumulated_text)
                                    else new_text
                                )
                                if delta:
                                    yield ServerSentEvent(
                                        data=json.dumps({"delta": delta}), event="text_delta"
                                    )
                                accumulated_text = new_text

        except Exception as e:
            logger.error(f"ADK runner error during init: {e}", exc_info=True)
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "code": "runner_error",
                        "message": "初期化中にエラーが発生しました。",
                    }
                ),
                event="error",
            )
            return

        if not accumulated_text:
            accumulated_text = "こんにちは。読書について対話しましょう。"
            yield ServerSentEvent(data=json.dumps({"delta": accumulated_text}), event="text_delta")

        # AIの初期メッセージをFirestoreに保存
        ai_message = await firestore.save_message(
            user_id=user["uid"],
            reading_id=reading_id,
            session_id=session_id,
            data={"role": "assistant", "message": accumulated_text, "input_type": "text"},
        )

        yield ServerSentEvent(data=json.dumps({"text": accumulated_text}), event="text_done")
        yield ServerSentEvent(
            data=json.dumps({"message": ai_message}, default=json_serializer),
            event="message_done",
        )

    return EventSourceResponse(
        event_generator(),
        headers={"Cache-Control": "no-cache"},
    )


