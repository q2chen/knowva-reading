from typing import Literal, Optional

from fastapi import APIRouter, Depends

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.insight import PublicInsightResponse, TimelineResponse
from knowva.services import firestore

router = APIRouter()


@router.get("", response_model=TimelineResponse)
async def get_timeline(
    order: Literal["random", "newest"] = "random",
    limit: int = 20,
    cursor: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """公開Insightのタイムラインを取得する。

    Args:
        order: 表示順（"random" or "newest"）
        limit: 取得件数（最大50）
        cursor: ページネーション用カーソル（order=newestの場合のみ有効）
        user: 認証済みユーザー
    """
    user_id = user["uid"]

    # limitの制限
    if limit > 50:
        limit = 50
    if limit < 1:
        limit = 20

    if order == "random":
        # ランダム順の場合はカーソルを使わない
        insights_data = await firestore.list_public_insights_random(limit=limit)
        next_cursor = None
        has_more = False
    else:
        # 新着順
        insights_data, next_cursor, has_more = await firestore.list_public_insights(
            limit=limit, cursor=cursor
        )

    # レスポンス形式に変換
    insights = []
    for data in insights_data:
        is_own = data.get("user_id") == user_id
        insights.append(
            PublicInsightResponse(
                id=data["id"],
                insight_id=data.get("insight_id", ""),
                content=data.get("content", ""),
                type=data.get("type", "impression"),
                display_name=data.get("display_name", "読書家さん"),
                book=data.get("book", {"title": "不明", "author": ""}),
                reading_status=data.get("reading_status"),
                published_at=data.get("published_at"),
                is_own=is_own,
            )
        )

    return TimelineResponse(
        insights=insights,
        next_cursor=next_cursor,
        has_more=has_more,
    )
