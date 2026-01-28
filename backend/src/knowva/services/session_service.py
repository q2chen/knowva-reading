"""
Firestore-backed Session Service for ADK.

セッション状態をFirestoreに永続化するサービス。
ローカル開発・本番環境の両方で使用。
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from google.adk.events import Event
from google.adk.sessions import BaseSessionService, Session
from google.genai import types

from knowva.dependencies import get_firestore_client
from knowva.services import firestore

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class FirestoreSessionService(BaseSessionService):
    """
    Firestoreをバックエンドとしたセッションサービス。

    ADKのセッション状態をFirestoreに保存し、サーバー再起動後も
    セッションを復元できるようにする。

    会話履歴は既存のmessagesコレクションから復元する。
    """

    def __init__(self):
        # ローカルキャッシュ（パフォーマンス向上のため）
        self._sessions: dict[str, Session] = {}

    def _get_session_key(self, app_name: str, user_id: str, session_id: str) -> str:
        return f"{app_name}:{user_id}:{session_id}"

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: Optional[str] = None,
        state: Optional[dict] = None,
    ) -> Session:
        """新しいセッションを作成する。"""
        db = get_firestore_client()

        # session_idが指定されていない場合は自動生成
        if session_id is None:
            doc_ref = db.collection("adk_sessions").document()
            session_id = doc_ref.id
        else:
            doc_ref = db.collection("adk_sessions").document(session_id)

        now = _now()
        session_data = {
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id,
            "state": state or {},
            "created_at": now,
            "updated_at": now,
        }

        await doc_ref.set(session_data)

        session = Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id,
            state=state or {},
            events=[],
        )

        # キャッシュに保存
        key = self._get_session_key(app_name, user_id, session_id)
        self._sessions[key] = session

        logger.info(f"Created session: {session_id} for user: {user_id}")
        return session

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> Optional[Session]:
        """既存のセッションを取得する。メッセージ履歴から会話コンテキストを復元する。"""
        key = self._get_session_key(app_name, user_id, session_id)

        # キャッシュにあればそれを返す
        if key in self._sessions:
            return self._sessions[key]

        db = get_firestore_client()
        doc = await db.collection("adk_sessions").document(session_id).get()

        if not doc.exists:
            logger.debug(f"Session not found: {session_id}")
            return None

        data = doc.to_dict()

        # Firestoreからメッセージ履歴を取得して会話コンテキストを復元
        state = data.get("state", {})
        reading_id = state.get("reading_id")

        events = []
        if reading_id:
            events = await self._restore_events_from_messages(
                user_id=user_id,
                reading_id=reading_id,
                session_id=session_id,
            )

        session = Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id,
            state=state,
            events=events,
        )

        # キャッシュに保存
        self._sessions[key] = session

        logger.info(f"Restored session: {session_id} with {len(events)} events")
        return session

    async def _restore_events_from_messages(
        self,
        user_id: str,
        reading_id: str,
        session_id: str,
    ) -> list[Event]:
        """Firestoreのmessagesコレクションから会話履歴をEventとして復元する。"""
        messages = await firestore.list_messages(user_id, reading_id, session_id)

        events = []
        for msg in messages:
            role = msg.get("role", "user")
            text = msg.get("message", "")

            content = types.Content(
                role=role,
                parts=[types.Part(text=text)],
            )

            event = Event(
                author=role,
                content=content,
            )
            events.append(event)

        return events

    async def delete_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> None:
        """セッションを削除する。"""
        db = get_firestore_client()
        await db.collection("adk_sessions").document(session_id).delete()

        key = self._get_session_key(app_name, user_id, session_id)
        if key in self._sessions:
            del self._sessions[key]

        logger.info(f"Deleted session: {session_id}")

    async def list_sessions(
        self,
        *,
        app_name: str,
        user_id: str,
    ) -> list[Session]:
        """ユーザーのセッション一覧を取得する。"""
        db = get_firestore_client()
        docs = (
            db.collection("adk_sessions")
            .where("app_name", "==", app_name)
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
        )

        sessions = []
        async for doc in docs.stream():
            data = doc.to_dict()
            session = Session(
                app_name=app_name,
                user_id=user_id,
                id=data.get("session_id"),
                state=data.get("state", {}),
                events=[],  # リスト時はeventsは空
            )
            sessions.append(session)

        return sessions

    async def append_event(
        self,
        session: Session,
        event: Event,
    ) -> Event:
        """セッションにイベントを追加する。"""
        # メモリ上のセッションに追加
        session.events.append(event)

        # Firestoreのupdated_atを更新
        db = get_firestore_client()
        await db.collection("adk_sessions").document(session.id).update({
            "updated_at": _now(),
        })

        return event


# シングルトンインスタンス
_session_service: Optional[FirestoreSessionService] = None


def get_session_service() -> FirestoreSessionService:
    """セッションサービスのシングルトンを取得する。"""
    global _session_service
    if _session_service is None:
        _session_service = FirestoreSessionService()
    return _session_service
