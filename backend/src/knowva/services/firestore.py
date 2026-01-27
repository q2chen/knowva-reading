from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore import AsyncClient
from google.cloud.firestore_v1.base_query import FieldFilter

from knowva.dependencies import get_firestore_client


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- Readings ---


async def create_reading(user_id: str, data: dict) -> dict:
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id).collection("readings").document()
    now = _now()
    doc_data = {
        **data,
        "user_id": user_id,
        "read_count": 1,
        "status": "not_started",
        "start_date": now,
        "completed_date": None,
        "latest_summary": None,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_readings(user_id: str) -> list[dict]:
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .order_by("created_at", direction="DESCENDING")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def get_reading(user_id: str, reading_id: str) -> Optional[dict]:
    db: AsyncClient = get_firestore_client()
    doc = await (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .get()
    )
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


async def update_reading(user_id: str, reading_id: str, data: dict) -> Optional[dict]:
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = _now()

    if update_data.get("status") == "completed":
        update_data["completed_date"] = _now()

    await doc_ref.update(update_data)
    updated_doc = await doc_ref.get()
    return {"id": updated_doc.id, **updated_doc.to_dict()}


# --- Sessions ---


async def create_session(user_id: str, reading_id: str, data: dict) -> dict:
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .document()
    )
    now = _now()
    doc_data = {
        **data,
        "reading_id": reading_id,
        "started_at": now,
        "ended_at": None,
        "summary": None,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_sessions(user_id: str, reading_id: str) -> list[dict]:
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .order_by("started_at", direction="DESCENDING")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def get_session(user_id: str, reading_id: str, session_id: str) -> Optional[dict]:
    db: AsyncClient = get_firestore_client()
    doc = await (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .document(session_id)
        .get()
    )
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


async def end_session(user_id: str, reading_id: str, session_id: str) -> Optional[dict]:
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .document(session_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    await doc_ref.update({"ended_at": _now()})
    updated = await doc_ref.get()
    return {"id": updated.id, **updated.to_dict()}


# --- Messages ---


async def save_message(
    user_id: str, reading_id: str, session_id: str, data: dict
) -> dict:
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .document(session_id)
        .collection("messages")
        .document()
    )
    doc_data = {**data, "created_at": _now()}
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_messages(user_id: str, reading_id: str, session_id: str) -> list[dict]:
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("sessions")
        .document(session_id)
        .collection("messages")
        .order_by("created_at")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


# --- Insights ---


async def save_insight(
    user_id: str, reading_id: str, data: dict
) -> dict:
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("insights")
        .document()
    )
    doc_data = {**data, "created_at": _now()}
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_insights(user_id: str, reading_id: str) -> list[dict]:
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("insights")
        .order_by("created_at", direction="DESCENDING")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


# --- User Profile ---


async def get_user_profile(user_id: str) -> Optional[dict]:
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        return {"user_id": doc.id, **doc.to_dict()}
    return None


async def ensure_user_exists(user_id: str, email: Optional[str] = None) -> dict:
    """ユーザードキュメントが存在しない場合は作成する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    doc = await doc_ref.get()
    if not doc.exists:
        data = {
            "email": email,
            "name": None,
            "current_profile": {},
            "settings": {"interaction_mode": "guided"},
            "created_at": _now(),
        }
        await doc_ref.set(data)
        return {"user_id": user_id, **data}
    return {"user_id": doc.id, **doc.to_dict()}


# --- User Settings ---


async def get_user_settings(user_id: str) -> dict:
    """ユーザー設定を取得する。存在しない場合はデフォルト値を返す。"""
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        settings = data.get("settings", {})
        # デフォルト値の補完
        return {
            "interaction_mode": settings.get("interaction_mode", "guided"),
        }
    # ドキュメントが存在しない場合はデフォルト値
    return {"interaction_mode": "guided"}


async def update_user_settings(user_id: str, settings: dict) -> dict:
    """ユーザー設定を更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    doc = await doc_ref.get()

    if not doc.exists:
        # ドキュメントが存在しない場合は作成
        data = {
            "email": None,
            "name": None,
            "current_profile": {},
            "settings": settings,
            "created_at": _now(),
        }
        await doc_ref.set(data)
        return settings

    # 既存のsettingsとマージ
    current_settings = doc.to_dict().get("settings", {})
    updated_settings = {**current_settings, **settings}
    await doc_ref.update({"settings": updated_settings})
    return updated_settings


# --- Mood Records (読書前後の心境) ---


async def save_mood(user_id: str, reading_id: str, data: dict) -> dict:
    """心境記録を保存する。mood_type (before/after) ごとに1件のみ。"""
    db: AsyncClient = get_firestore_client()
    mood_type = data.get("mood_type")

    # mood_typeが同じ既存レコードがあるか確認
    existing_docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("moods")
        .where(filter=FieldFilter("mood_type", "==", mood_type))
    )
    existing = None
    async for doc in existing_docs.stream():
        existing = doc
        break

    now = _now()

    if existing:
        # 既存レコードを更新
        doc_ref = existing.reference
        update_data = {
            "metrics": data.get("metrics"),
            "note": data.get("note"),
            "dominant_emotion": data.get("dominant_emotion"),
            "recorded_at": now,
            "updated_at": now,
        }
        await doc_ref.update(update_data)
        updated = await doc_ref.get()
        return {"id": updated.id, **updated.to_dict()}
    else:
        # 新規作成
        doc_ref = (
            db.collection("users")
            .document(user_id)
            .collection("readings")
            .document(reading_id)
            .collection("moods")
            .document()
        )
        doc_data = {
            "reading_id": reading_id,
            "mood_type": mood_type,
            "metrics": data.get("metrics"),
            "note": data.get("note"),
            "dominant_emotion": data.get("dominant_emotion"),
            "recorded_at": now,
            "created_at": now,
            "updated_at": now,
        }
        await doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}


async def get_mood(user_id: str, reading_id: str, mood_type: str) -> Optional[dict]:
    """特定の心境記録を取得する。"""
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("moods")
        .where(filter=FieldFilter("mood_type", "==", mood_type))
    )
    async for doc in docs.stream():
        return {"id": doc.id, **doc.to_dict()}
    return None


async def list_moods(user_id: str, reading_id: str) -> list[dict]:
    """読書記録に紐づくすべての心境記録を取得する。"""
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("moods")
        .order_by("mood_type")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def get_mood_comparison(user_id: str, reading_id: str) -> dict:
    """読書前後の心境比較データを取得する。"""
    moods = await list_moods(user_id, reading_id)

    before_mood = None
    after_mood = None

    for mood in moods:
        if mood.get("mood_type") == "before":
            before_mood = mood
        elif mood.get("mood_type") == "after":
            after_mood = mood

    # 変化量を計算
    changes = None
    if before_mood and after_mood:
        before_metrics = before_mood.get("metrics", {})
        after_metrics = after_mood.get("metrics", {})
        changes = {
            key: after_metrics.get(key, 0) - before_metrics.get(key, 0)
            for key in ["energy", "positivity", "clarity", "motivation", "openness"]
        }

    return {
        "reading_id": reading_id,
        "before_mood": before_mood,
        "after_mood": after_mood,
        "changes": changes,
    }


# --- Profile Entries (非構造的プロファイル情報) ---


async def save_profile_entry(user_id: str, data: dict) -> dict:
    """プロファイルエントリを保存する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("profileEntries")
        .document()
    )
    now = _now()
    doc_data = {
        **data,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_profile_entries(
    user_id: str, entry_type: Optional[str] = None
) -> list[dict]:
    """プロファイルエントリ一覧を取得する。"""
    db: AsyncClient = get_firestore_client()
    query = db.collection("users").document(user_id).collection("profileEntries")

    if entry_type:
        query = query.where(filter=FieldFilter("entry_type", "==", entry_type))

    query = query.order_by("created_at", direction="DESCENDING")

    results = []
    async for doc in query.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def update_profile_entry(
    user_id: str, entry_id: str, data: dict
) -> Optional[dict]:
    """プロファイルエントリを更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("profileEntries")
        .document(entry_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = _now()

    await doc_ref.update(update_data)
    updated = await doc_ref.get()
    return {"id": updated.id, **updated.to_dict()}


async def delete_profile_entry(user_id: str, entry_id: str) -> bool:
    """プロファイルエントリを削除する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("profileEntries")
        .document(entry_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return False
    await doc_ref.delete()
    return True


# --- All Insights (全読書横断) ---


async def list_all_insights(user_id: str, limit: int = 100) -> list[dict]:
    """全読書のInsight一覧を取得する（本の情報付き）。"""
    # まず全readingsを取得
    readings = await list_readings(user_id)

    all_insights = []
    for reading in readings:
        insights = await list_insights(user_id, reading["id"])
        book_info = reading.get("book", {})
        for insight in insights:
            all_insights.append(
                {
                    **insight,
                    "reading_id": reading["id"],
                    "book": {
                        "title": book_info.get("title", "不明"),
                        "author": book_info.get("author"),
                    },
                }
            )

    # created_atでソート（新しい順）
    all_insights.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return all_insights[:limit]


# --- Mentor Feedbacks ---


async def get_mentor_context(user_id: str, period_days: int = 7) -> dict:
    """指定期間内の読書・Insight・プロファイル情報を取得する。"""
    from datetime import timedelta

    cutoff_date = _now() - timedelta(days=period_days)

    # 読書記録を取得（期間内に更新があったもの）
    readings = await list_readings(user_id)
    recent_readings = [
        r for r in readings
        if r.get("updated_at") and r.get("updated_at") >= cutoff_date
    ]

    # Insight を取得（期間内に作成されたもの）
    all_insights = await list_all_insights(user_id, limit=200)
    recent_insights = [
        i for i in all_insights
        if i.get("created_at") and i.get("created_at") >= cutoff_date
    ]

    # プロファイルエントリを取得
    profile_entries = await list_profile_entries(user_id)

    return {
        "period_days": period_days,
        "readings": [
            {
                "id": r["id"],
                "book": r.get("book", {}),
                "status": r.get("status"),
                "updated_at": r.get("updated_at"),
            }
            for r in recent_readings
        ],
        "insights": [
            {
                "content": i.get("content"),
                "insight_type": i.get("insight_type"),
                "book": i.get("book"),
            }
            for i in recent_insights
        ],
        "profile": {
            "goals": [e for e in profile_entries if e.get("entry_type") == "goal"],
            "interests": [e for e in profile_entries if e.get("entry_type") == "interest"],
        },
        "summary": {
            "readings_count": len(recent_readings),
            "insights_count": len(recent_insights),
        },
    }


async def save_mentor_feedback(user_id: str, data: dict) -> dict:
    """メンターフィードバックを保存する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("mentorFeedbacks")
        .document()
    )
    now = _now()
    doc_data = {
        **data,
        "created_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_mentor_feedbacks(user_id: str, limit: int = 10) -> list[dict]:
    """メンターフィードバック一覧を取得する。"""
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("mentorFeedbacks")
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def get_latest_mentor_feedback(user_id: str) -> Optional[dict]:
    """最新のメンターフィードバックを取得する。"""
    feedbacks = await list_mentor_feedbacks(user_id, limit=1)
    return feedbacks[0] if feedbacks else None
