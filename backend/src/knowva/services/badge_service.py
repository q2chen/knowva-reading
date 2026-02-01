"""バッジ判定・付与サービス"""

from datetime import datetime, timezone
from typing import Optional

from knowva.data.badges import get_badge_definition
from knowva.services import firestore


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def has_badge(user_id: str, badge_id: str) -> bool:
    """ユーザーがバッジを持っているか確認する。"""
    badges = await list_user_badges(user_id)
    return any(b.get("badge_id") == badge_id for b in badges)


async def list_user_badges(user_id: str) -> list[dict]:
    """ユーザーの獲得バッジ一覧を取得する。"""
    from google.cloud.firestore import AsyncClient

    from knowva.dependencies import get_firestore_client

    db: AsyncClient = get_firestore_client()
    docs = (
        db.collection("users")
        .document(user_id)
        .collection("badges")
        .order_by("earned_at", direction="DESCENDING")
    )
    results = []
    async for doc in docs.stream():
        results.append({"id": doc.id, **doc.to_dict()})
    return results


async def award_badge(
    user_id: str, badge_id: str, context: Optional[dict] = None
) -> Optional[dict]:
    """バッジを付与する（重複チェック付き）。

    既に持っている場合はNoneを返す。
    """
    from google.cloud.firestore import AsyncClient

    from knowva.dependencies import get_firestore_client

    # バッジ定義が存在するか確認
    definition = get_badge_definition(badge_id)
    if not definition:
        return None

    # 既に持っているか確認
    if await has_badge(user_id, badge_id):
        return None

    # バッジを付与
    db: AsyncClient = get_firestore_client()
    doc_ref = (
        db.collection("users").document(user_id).collection("badges").document()
    )
    now = _now()
    doc_data = {
        "badge_id": badge_id,
        "earned_at": now,
        "context": context,
    }
    await doc_ref.set(doc_data)
    return {"id": doc_ref.id, **doc_data}


async def check_reading_badges(user_id: str) -> list[dict]:
    """読書系バッジの判定・付与を行う。

    Returns:
        新規獲得したバッジのリスト
    """
    new_badges = []

    # 読書記録数を取得
    readings = await firestore.list_readings(user_id)
    reading_count = len(readings)
    completed_count = sum(1 for r in readings if r.get("status") == "completed")

    # first_reading: 初めての読書記録
    if reading_count >= 1:
        badge = await award_badge(user_id, "first_reading")
        if badge:
            new_badges.append(badge)

    # books_5, books_10, books_25, books_50
    thresholds = [
        (5, "books_5"),
        (10, "books_10"),
        (25, "books_25"),
        (50, "books_50"),
    ]
    for threshold, badge_id in thresholds:
        if reading_count >= threshold:
            badge = await award_badge(user_id, badge_id)
            if badge:
                new_badges.append(badge)

    # first_completed: 初めての読了
    if completed_count >= 1:
        badge = await award_badge(user_id, "first_completed")
        if badge:
            new_badges.append(badge)

    return new_badges


async def check_insight_badges(user_id: str) -> list[dict]:
    """Insight系バッジの判定・付与を行う。

    Returns:
        新規獲得したバッジのリスト
    """
    new_badges = []

    # Insight数を取得
    insights = await firestore.list_all_insights(user_id, limit=200)
    insight_count = len(insights)

    # insights_10, insights_50, insights_100
    thresholds = [
        (10, "insights_10"),
        (50, "insights_50"),
        (100, "insights_100"),
    ]
    for threshold, badge_id in thresholds:
        if insight_count >= threshold:
            badge = await award_badge(user_id, badge_id)
            if badge:
                new_badges.append(badge)

    return new_badges


async def check_onboarding_badges(user_id: str) -> list[dict]:
    """オンボーディング系バッジの判定・付与を行う。

    Returns:
        新規獲得したバッジのリスト
    """
    new_badges = []

    # profile_3_entries: プロファイル3件以上
    entries = await firestore.list_profile_entries(user_id)
    if len(entries) >= 3:
        badge = await award_badge(user_id, "profile_3_entries")
        if badge:
            new_badges.append(badge)

    # first_reflection: 振り返り対話（メンターフィードバックで判定）
    feedbacks = await firestore.list_mentor_feedbacks(user_id, limit=1)
    if feedbacks:
        badge = await award_badge(user_id, "first_reflection")
        if badge:
            new_badges.append(badge)

    # first_mood: 心境記録（readingsをチェック）
    readings = await firestore.list_readings(user_id)
    for reading in readings:
        moods = await firestore.list_moods(user_id, reading["id"])
        if moods:
            badge = await award_badge(user_id, "first_mood")
            if badge:
                new_badges.append(badge)
            break

    return new_badges


async def check_and_award_all_badges(user_id: str) -> list[dict]:
    """全カテゴリのバッジ判定・付与を行う。

    Returns:
        新規獲得したバッジのリスト
    """
    new_badges = []
    new_badges.extend(await check_reading_badges(user_id))
    new_badges.extend(await check_insight_badges(user_id))
    new_badges.extend(await check_onboarding_badges(user_id))
    return new_badges
