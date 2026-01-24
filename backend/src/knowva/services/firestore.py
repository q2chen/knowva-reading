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
