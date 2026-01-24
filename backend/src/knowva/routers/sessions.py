from fastapi import APIRouter, Depends, HTTPException
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from knowva.agents import reading_reflection_agent
from knowva.config import settings
from knowva.middleware.firebase_auth import get_current_user
from knowva.models.message import MessageCreate, MessageResponse
from knowva.models.session import SessionCreate, SessionResponse
from knowva.services import firestore

router = APIRouter()

APP_NAME = "knowva"
session_service = InMemorySessionService()
runner = Runner(
    agent=reading_reflection_agent,
    app_name=APP_NAME,
    session_service=session_service,
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
    adk_session = await session_service.create_session(
        app_name=APP_NAME,
        user_id=user["uid"],
        session_id=result["id"],
        state={"reading_id": reading_id, "user_id": user["uid"]},
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
async def send_message(
    reading_id: str,
    session_id: str,
    body: MessageCreate,
    user: dict = Depends(get_current_user),
):
    """メッセージを送信し、AIからの応答を得る。"""
    # TODO(phase2): SSEストリーミング対応
    session = await firestore.get_session(user["uid"], reading_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Session has ended")

    # ユーザーメッセージをFirestoreに保存
    await firestore.save_message(
        user_id=user["uid"],
        reading_id=reading_id,
        session_id=session_id,
        data={"role": "user", "message": body.message, "input_type": body.input_type},
    )

    # ADKセッションが存在するか確認、なければ作成
    adk_session = await session_service.get_session(
        app_name=APP_NAME, user_id=user["uid"], session_id=session_id
    )
    if not adk_session:
        adk_session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user["uid"],
            session_id=session_id,
            state={"reading_id": reading_id, "user_id": user["uid"]},
        )

    # ADK Runnerにメッセージを送信
    user_content = types.Content(
        role="user", parts=[types.Part(text=body.message)]
    )

    response_text = ""
    async for event in runner.run_async(
        user_id=user["uid"],
        session_id=session_id,
        new_message=user_content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            response_text = event.content.parts[0].text

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


@router.post("/{reading_id}/sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(
    reading_id: str,
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """セッションを終了する。"""
    # TODO(phase2): GCSへの完全ログ保存
    # TODO(phase2): Profile Extraction Agent実行
    result = await firestore.end_session(user["uid"], reading_id, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result
