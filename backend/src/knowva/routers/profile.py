import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from google.adk.runners import Runner
from google.genai import types

from knowva.agents import onboarding_agent
from knowva.middleware.firebase_auth import get_current_user
from knowva.models.message import MessageCreate, MessageResponse
from knowva.models.profile import (
    AllInsightsResponse,
    InsightGroup,
    InsightWithBook,
    ProfileEntryCreate,
    ProfileEntryResponse,
    UserSettings,
    UserSettingsUpdate,
)
from knowva.services import firestore
from knowva.services.session_service import get_session_service

logger = logging.getLogger(__name__)

router = APIRouter()

APP_NAME = "knowva_profile"


def get_profile_runner() -> Runner:
    """プロファイルエージェント用のADK Runnerを取得する。"""
    return Runner(
        agent=onboarding_agent,
        app_name=APP_NAME,
        session_service=get_session_service(),
    )


# === 全読書 Insight 一覧 ===


@router.get("/insights", response_model=AllInsightsResponse)
async def list_all_insights(
    group_by: Literal["book", "type"] = "book",
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    """全読書のInsight一覧を取得する。"""
    insights_data = await firestore.list_all_insights(user["uid"], limit=limit)

    # レスポンス形式に変換
    insights = [
        InsightWithBook(
            id=i["id"],
            content=i["content"],
            type=i["type"],
            session_ref=i.get("session_ref"),
            created_at=i["created_at"],
            reading_id=i["reading_id"],
            book=i["book"],
        )
        for i in insights_data
    ]

    # グルーピング
    groups: list[InsightGroup] = []
    if group_by == "book":
        book_counts: dict[str, dict] = {}
        for i in insights:
            if i.reading_id not in book_counts:
                book_counts[i.reading_id] = {"book": i.book, "count": 0}
            book_counts[i.reading_id]["count"] += 1
        groups = [
            InsightGroup(key=rid, book=data["book"], count=data["count"])
            for rid, data in book_counts.items()
        ]
    else:  # group_by == "type"
        type_counts: dict[str, int] = {}
        for i in insights:
            type_counts[i.type] = type_counts.get(i.type, 0) + 1
        groups = [
            InsightGroup(key=t, insight_type=t, count=c) for t, c in type_counts.items()
        ]

    return AllInsightsResponse(
        insights=insights,
        total_count=len(insights),
        grouped_by=group_by,
        groups=groups,
    )


# === プロファイルエントリ ===


@router.get("/entries", response_model=list[ProfileEntryResponse])
async def list_profile_entries(
    entry_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """プロファイルエントリ一覧を取得する。"""
    entries = await firestore.list_profile_entries(user["uid"], entry_type)
    return entries


@router.post("/entries", response_model=ProfileEntryResponse)
async def create_profile_entry(
    body: ProfileEntryCreate,
    user: dict = Depends(get_current_user),
):
    """プロファイルエントリを作成する。"""
    result = await firestore.save_profile_entry(
        user_id=user["uid"],
        data={
            "entry_type": body.entry_type,
            "content": body.content,
            "note": body.note,
        },
    )
    return result


@router.put("/entries/{entry_id}", response_model=ProfileEntryResponse)
async def update_profile_entry(
    entry_id: str,
    body: ProfileEntryCreate,
    user: dict = Depends(get_current_user),
):
    """プロファイルエントリを更新する。"""
    result = await firestore.update_profile_entry(
        user_id=user["uid"],
        entry_id=entry_id,
        data={
            "entry_type": body.entry_type,
            "content": body.content,
            "note": body.note,
        },
    )
    if not result:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result


@router.delete("/entries/{entry_id}")
async def delete_profile_entry(
    entry_id: str,
    user: dict = Depends(get_current_user),
):
    """プロファイルエントリを削除する。"""
    success = await firestore.delete_profile_entry(user["uid"], entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted"}


# === ユーザー設定 ===


@router.get("/settings", response_model=UserSettings)
async def get_user_settings(
    user: dict = Depends(get_current_user),
):
    """ユーザー設定を取得する。"""
    settings = await firestore.get_user_settings(user["uid"])
    return UserSettings(**settings)


@router.put("/settings", response_model=UserSettings)
async def update_user_settings(
    body: UserSettingsUpdate,
    user: dict = Depends(get_current_user),
):
    """ユーザー設定を更新する。"""
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        # 変更がない場合は現在の設定を返す
        settings = await firestore.get_user_settings(user["uid"])
        return UserSettings(**settings)

    settings = await firestore.update_user_settings(user["uid"], update_data)
    return UserSettings(**settings)


# === プロファイルエージェントとのチャット ===


@router.post("/chat", response_model=MessageResponse)
async def chat_with_profile_agent(
    body: MessageCreate,
    user: dict = Depends(get_current_user),
):
    """プロファイルエージェントとチャットする。

    セッションは user_id ごとに1つ（固定ID）を使用する。
    """
    user_id = user["uid"]
    # プロファイルチャットは user_id をそのまま session_id として使用
    session_id = f"profile_{user_id}"

    # ADKセッションが存在するか確認、なければ作成
    session_service = get_session_service()
    adk_session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not adk_session:
        adk_session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={"user_id": user_id},
        )

    # ADK Runnerにメッセージを送信
    runner = get_profile_runner()
    user_content = types.Content(role="user", parts=[types.Part(text=body.message)])

    response_text = ""
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=user_content,
        ):
            logger.debug(f"ADK event: {event}")
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        if event.is_final_response():
                            response_text = part.text
                        elif not response_text:
                            response_text = part.text
    except Exception as e:
        logger.error(f"ADK runner error: {e}", exc_info=True)
        response_text = "申し訳ございません。エラーが発生しました。もう一度お試しください。"

    if not response_text:
        logger.warning("No response text from ADK runner")
        response_text = "申し訳ございません。応答を生成できませんでした。もう一度お試しください。"

    # レスポンスを返す（プロファイルチャットはメッセージをFirestoreに保存しない）
    from datetime import datetime, timezone

    return MessageResponse(
        id=f"msg_{datetime.now(timezone.utc).timestamp()}",
        role="assistant",
        message=response_text,
        input_type="text",
        created_at=datetime.now(timezone.utc),
    )


@router.post("/chat/reset")
async def reset_profile_chat(
    user: dict = Depends(get_current_user),
):
    """プロファイルチャットのセッションをリセットする。"""
    user_id = user["uid"]
    session_id = f"profile_{user_id}"

    session_service = get_session_service()
    try:
        await session_service.delete_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
    except Exception:
        pass  # セッションが存在しない場合は無視

    return {"status": "reset"}
