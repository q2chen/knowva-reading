from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore import AsyncClient

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
        "status": "reading",
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
            "created_at": _now(),
        }
        await doc_ref.set(data)
        return {"user_id": user_id, **data}
    return {"user_id": doc.id, **doc.to_dict()}


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
        .where("mood_type", "==", mood_type)
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
        .where("mood_type", "==", mood_type)
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
        query = query.where("entry_type", "==", entry_type)

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
