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
    """ユーザーのcurrent_profileを取得する。"""
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        return data.get("current_profile", {})
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
            "timeline_order": settings.get("timeline_order", "random"),
            "fab_position": settings.get("fab_position", "left"),
        }
    # ドキュメントが存在しない場合はデフォルト値
    return {"interaction_mode": "guided", "timeline_order": "random", "fab_position": "left"}


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


# --- User Name (Nickname) ---


async def update_user_name(user_id: str, name: str) -> dict:
    """ユーザーのニックネームを更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    doc = await doc_ref.get()

    if not doc.exists:
        # ドキュメントが存在しない場合は作成
        data = {
            "email": None,
            "name": name,
            "current_profile": {},
            "settings": {"interaction_mode": "guided", "timeline_order": "random"},
            "created_at": _now(),
        }
        await doc_ref.set(data)
        return {"name": name}

    await doc_ref.update({"name": name})
    return {"name": name}


async def get_user_name(user_id: str) -> Optional[str]:
    """ユーザーのニックネームを取得する。"""
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("name")
    return None


# --- Insight Visibility & Public Insights ---


async def get_insight(user_id: str, reading_id: str, insight_id: str) -> Optional[dict]:
    """特定のInsightを取得する。"""
    db: AsyncClient = get_firestore_client()
    doc = await (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("insights")
        .document(insight_id)
        .get()
    )
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


async def update_insight_visibility(
    user_id: str, reading_id: str, insight_id: str, visibility: str
) -> Optional[dict]:
    """Insightの公開設定を更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("insights")
        .document(insight_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    await doc_ref.update({"visibility": visibility})
    updated = await doc_ref.get()
    return {"id": updated.id, **updated.to_dict()}


async def create_public_insight(
    user_id: str,
    reading_id: str,
    insight_id: str,
    insight_data: dict,
    book_data: dict,
    visibility: str,
    display_name: str,
) -> dict:
    """公開Insightを作成する。"""
    db: AsyncClient = get_firestore_client()

    # 既存の公開Insightがあるか確認
    existing_docs = db.collection("publicInsights").where(
        filter=FieldFilter("insight_id", "==", insight_id)
    )
    existing = None
    async for doc in existing_docs.stream():
        existing = doc
        break

    now = _now()

    if existing:
        # 既存のドキュメントを更新
        doc_ref = existing.reference
        update_data = {
            "visibility": visibility,
            "display_name": display_name,
            "content": insight_data.get("content"),
            "type": insight_data.get("type"),
            "reading_status": insight_data.get("reading_status"),
            "book": book_data,
        }
        await doc_ref.update(update_data)
        updated = await doc_ref.get()
        return {"id": updated.id, **updated.to_dict()}
    else:
        # 新規作成
        doc_ref = db.collection("publicInsights").document()
        doc_data = {
            "insight_id": insight_id,
            "user_id": user_id,
            "reading_id": reading_id,
            "content": insight_data.get("content"),
            "type": insight_data.get("type"),
            "reading_status": insight_data.get("reading_status"),
            "visibility": visibility,
            "display_name": display_name,
            "book": book_data,
            "created_at": insight_data.get("created_at", now),
            "published_at": now,
        }
        await doc_ref.set(doc_data)
        return {"id": doc_ref.id, **doc_data}


async def delete_public_insight(insight_id: str) -> bool:
    """公開Insightを削除する。"""
    db: AsyncClient = get_firestore_client()
    docs = db.collection("publicInsights").where(
        filter=FieldFilter("insight_id", "==", insight_id)
    )
    deleted = False
    async for doc in docs.stream():
        await doc.reference.delete()
        deleted = True
    return deleted


async def update_public_insights_display_name(user_id: str, new_name: str) -> int:
    """ユーザーの公開Insight（visibility: public）のdisplay_nameを一括更新する。

    Args:
        user_id: ユーザーID
        new_name: 新しい表示名

    Returns:
        更新した件数
    """
    db: AsyncClient = get_firestore_client()

    # user_idとvisibility: "public"でフィルタ
    query = (
        db.collection("publicInsights")
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("visibility", "==", "public"))
    )

    updated_count = 0
    async for doc in query.stream():
        await doc.reference.update({"display_name": new_name})
        updated_count += 1

    return updated_count


async def list_public_insights(
    limit: int = 20, cursor: Optional[str] = None
) -> tuple[list[dict], Optional[str], bool]:
    """公開Insight一覧を取得する（新着順）。"""
    db: AsyncClient = get_firestore_client()
    query = db.collection("publicInsights").order_by(
        "published_at", direction="DESCENDING"
    )

    if cursor:
        # カーソルからpublished_atを復元
        from datetime import datetime

        cursor_time = datetime.fromisoformat(cursor)
        query = query.start_after({"published_at": cursor_time})

    query = query.limit(limit + 1)  # 次ページがあるか確認するため+1

    results = []
    async for doc in query.stream():
        results.append({"id": doc.id, **doc.to_dict()})

    has_more = len(results) > limit
    if has_more:
        results = results[:limit]

    next_cursor = None
    if results and has_more:
        last_item = results[-1]
        published_at = last_item.get("published_at")
        if published_at:
            if hasattr(published_at, "isoformat"):
                next_cursor = published_at.isoformat()
            else:
                next_cursor = str(published_at)

    return results, next_cursor, has_more


async def list_public_insights_random(limit: int = 20) -> list[dict]:
    """公開Insight一覧をランダムに取得する。"""
    import random

    db: AsyncClient = get_firestore_client()
    # 全件取得してシャッフル（スケール時は改善が必要）
    docs = db.collection("publicInsights")

    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})

    random.shuffle(results)
    return results[:limit]


# --- Books (グローバルコレクション) ---


async def create_book(data: dict) -> dict:
    """本を作成する。ISBNがある場合は重複チェックを行う。"""
    db: AsyncClient = get_firestore_client()

    # ISBNがある場合は重複チェック
    isbn = data.get("isbn")
    if isbn:
        existing = await get_book_by_isbn(isbn)
        if existing:
            return existing

    doc_ref = db.collection("books").document()
    now = _now()
    doc_data = {
        **data,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def get_book(book_id: str) -> Optional[dict]:
    """本を取得する。"""
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("books").document(book_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


async def get_book_by_isbn(isbn: str) -> Optional[dict]:
    """ISBNで本を検索する。"""
    db: AsyncClient = get_firestore_client()
    # ISBNを正規化（ハイフン除去）
    normalized_isbn = isbn.replace("-", "")

    docs = db.collection("books").where(filter=FieldFilter("isbn", "==", normalized_isbn))
    async for doc in docs.stream():
        return {"id": doc.id, **doc.to_dict()}

    # ハイフン付きで検索（念のため）
    if normalized_isbn != isbn:
        docs = db.collection("books").where(filter=FieldFilter("isbn", "==", isbn))
        async for doc in docs.stream():
            return {"id": doc.id, **doc.to_dict()}

    return None


async def update_book(book_id: str, data: dict) -> Optional[dict]:
    """本を更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("books").document(book_id)
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = _now()

    await doc_ref.update(update_data)
    updated = await doc_ref.get()
    return {"id": updated.id, **updated.to_dict()}


async def list_user_book_ids(user_id: str) -> list[str]:
    """ユーザーの読書記録から本IDの一覧を取得する。"""
    readings = await list_readings(user_id)
    book_ids = set()
    for reading in readings:
        book_id = reading.get("book_id")
        if book_id:
            book_ids.add(book_id)
    return list(book_ids)


# --- Reports (読書レポート) ---


async def save_report(user_id: str, reading_id: str, data: dict) -> dict:
    """レポートを保存する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("reports")
        .document()
    )
    now = _now()
    doc_data = {
        **data,
        "reading_id": reading_id,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_reports(user_id: str, reading_id: str) -> list[dict]:
    """レポート一覧を取得する。"""
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("reports")
        .order_by("created_at", direction="DESCENDING")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def get_latest_report(user_id: str, reading_id: str) -> Optional[dict]:
    """最新のレポートを取得する。"""
    reports = await list_reports(user_id, reading_id)
    return reports[0] if reports else None


# --- Action Plans (アクションプラン) ---


async def save_action_plan(user_id: str, reading_id: str, data: dict) -> dict:
    """アクションプランを保存する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("actionPlans")
        .document()
    )
    now = _now()
    doc_data = {
        **data,
        "reading_id": reading_id,
        "status": "pending",
        "completed_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def list_action_plans(user_id: str, reading_id: str) -> list[dict]:
    """アクションプラン一覧を取得する。"""
    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("actionPlans")
        .order_by("created_at")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def update_action_plan(
    user_id: str, reading_id: str, plan_id: str, data: dict
) -> Optional[dict]:
    """アクションプランを更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users")
        .document(user_id)
        .collection("readings")
        .document(reading_id)
        .collection("actionPlans")
        .document(plan_id)
    )
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = _now()

    # completedに変更された場合はcompleted_atを設定
    if update_data.get("status") == "completed":
        update_data["completed_at"] = _now()

    await doc_ref.update(update_data)
    updated = await doc_ref.get()
    return {"id": updated.id, **updated.to_dict()}


# --- Report Context (レポート生成用コンテキスト) ---


# --- Onboarding ---


async def get_onboarding_status(user_id: str) -> dict:
    """オンボーディングの完了状態を取得する。"""
    db: AsyncClient = get_firestore_client()
    doc = await db.collection("users").document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        return {
            "completed": data.get("onboarding_completed", False),
            "completed_at": data.get("onboarding_completed_at"),
        }
    return {"completed": False, "completed_at": None}


async def set_onboarding_completed(user_id: str) -> dict:
    """オンボーディング完了フラグを設定する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    now = _now()
    await doc_ref.update({
        "onboarding_completed": True,
        "onboarding_completed_at": now,
    })
    return {"completed": True, "completed_at": now}


async def update_user_profile(user_id: str, profile_data: dict) -> dict:
    """ユーザーのcurrent_profileを更新する。"""
    db: AsyncClient = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    doc = await doc_ref.get()

    if not doc.exists:
        # ドキュメントが存在しない場合は作成
        data = {
            "email": None,
            "name": None,
            "current_profile": profile_data,
            "settings": {"interaction_mode": "guided"},
            "created_at": _now(),
        }
        await doc_ref.set(data)
        return profile_data

    # 既存のcurrent_profileとマージ
    current_profile = doc.to_dict().get("current_profile", {})
    updated_profile = {**current_profile, **profile_data}
    await doc_ref.update({"current_profile": updated_profile})
    return updated_profile


# --- Report Context (レポート生成用コンテキスト) ---


async def get_report_context(user_id: str, reading_id: str) -> dict:
    """レポート生成用のコンテキストを取得する。

    該当Readingのセッション全メッセージ + Insight + プロファイル情報を集約。
    """
    # 読書情報
    reading = await get_reading(user_id, reading_id)
    if not reading:
        return {"status": "error", "error": "Reading not found"}

    # セッション一覧
    sessions = await list_sessions(user_id, reading_id)

    # 全セッションのメッセージを集約
    all_messages = []
    for session in sessions:
        messages = await list_messages(user_id, reading_id, session["id"])
        all_messages.extend(
            [
                {
                    "session_type": session.get("session_type"),
                    "role": m.get("role"),
                    "message": m.get("message"),
                    "created_at": m.get("created_at"),
                }
                for m in messages
            ]
        )

    # Insight一覧
    insights = await list_insights(user_id, reading_id)

    # プロファイル情報
    profile_entries = await list_profile_entries(user_id)

    # 心境データ
    mood_comparison = await get_mood_comparison(user_id, reading_id)

    return {
        "reading": {
            "id": reading_id,
            "book": reading.get("book", {}),
            "status": reading.get("status"),
            "reading_context": reading.get("reading_context"),
        },
        "sessions": [
            {
                "id": s["id"],
                "session_type": s.get("session_type"),
                "started_at": s.get("started_at"),
            }
            for s in sessions
        ],
        "messages": all_messages,
        "insights": [
            {
                "id": i.get("id"),
                "content": i.get("content"),
                "type": i.get("type"),
                "reading_status": i.get("reading_status"),
            }
            for i in insights
        ],
        "profile": {
            "goals": [e for e in profile_entries if e.get("entry_type") == "goal"],
            "interests": [
                e for e in profile_entries if e.get("entry_type") == "interest"
            ],
        },
        "mood_comparison": mood_comparison,
        "summary": {
            "session_count": len(sessions),
            "message_count": len(all_messages),
            "insight_count": len(insights),
        },
    }
