from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.insight import PublicInsightResponse, TimelineResponse
from knowva.models.report import BookEmbed, PublicReportResponse
from knowva.services import firestore

router = APIRouter()


# タイムラインアイテム（InsightまたはReport）
class TimelineItem(BaseModel):
    """タイムラインアイテム。"""

    item_type: Literal["insight", "report"]
    insight: Optional[PublicInsightResponse] = None
    report: Optional[PublicReportResponse] = None


class TimelineResponseV2(BaseModel):
    """タイムラインレスポンス（Insight + Report対応）。"""

    items: list[TimelineItem]
    next_cursor: Optional[str] = None
    has_more: bool = False


@router.get("", response_model=TimelineResponse)
async def get_timeline(
    order: Literal["random", "newest"] = "random",
    limit: int = 20,
    cursor: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """公開Insightのタイムラインを取得する（後方互換性のため残す）。

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


@router.get("/v2", response_model=TimelineResponseV2)
async def get_timeline_v2(
    order: Literal["random", "newest"] = "random",
    item_type: Literal["insight", "report", "all"] = "all",
    limit: int = 20,
    cursor: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """公開Insight + Reportのタイムラインを取得する。

    Args:
        order: 表示順（"random" or "newest"）
        item_type: 取得するアイテムタイプ（"insight", "report", "all"）
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

    items: list[TimelineItem] = []
    next_cursor = None
    has_more = False

    if order == "random":
        # ランダム順
        insights_data = []
        reports_data = []

        if item_type in ("insight", "all"):
            insights_data = await firestore.list_public_insights_random(limit=limit)
        if item_type in ("report", "all"):
            reports_data = await firestore.list_public_reports_random(limit=limit)

        # 統合してシャッフル
        import random

        combined = []
        for data in insights_data:
            combined.append(("insight", data))
        for data in reports_data:
            combined.append(("report", data))

        random.shuffle(combined)
        combined = combined[:limit]

        for item_type_str, data in combined:
            is_own = data.get("user_id") == user_id
            if item_type_str == "insight":
                items.append(
                    TimelineItem(
                        item_type="insight",
                        insight=PublicInsightResponse(
                            id=data["id"],
                            insight_id=data.get("insight_id", ""),
                            content=data.get("content", ""),
                            type=data.get("type", "impression"),
                            display_name=data.get("display_name", "読書家さん"),
                            book=data.get("book", {"title": "不明", "author": ""}),
                            reading_status=data.get("reading_status"),
                            published_at=data.get("published_at"),
                            is_own=is_own,
                        ),
                    )
                )
            else:
                book_data = data.get("book", {"title": "不明", "author": ""})
                items.append(
                    TimelineItem(
                        item_type="report",
                        report=PublicReportResponse(
                            id=data["id"],
                            report_id=data.get("report_id", ""),
                            user_id=data.get("user_id", ""),
                            reading_id=data.get("reading_id", ""),
                            summary=data.get("summary", ""),
                            insights_summary=data.get("insights_summary", ""),
                            context_analysis=data.get("context_analysis"),
                            display_name=data.get("display_name", "読書家さん"),
                            book=BookEmbed(**book_data),
                            reading_status=data.get("reading_status"),
                            published_at=data.get("published_at"),
                            is_own=is_own,
                        ),
                    )
                )
    else:
        # 新着順（カーソルベースページネーション）
        # InsightとReportを別々に取得してマージ
        insights_data = []
        reports_data = []

        if item_type in ("insight", "all"):
            insights_data, _, _ = await firestore.list_public_insights(
                limit=limit + 1, cursor=cursor
            )
        if item_type in ("report", "all"):
            reports_data, _, _ = await firestore.list_public_reports(limit=limit + 1, cursor=cursor)

        # published_atでマージソート
        combined = []
        for data in insights_data:
            published_at = data.get("published_at")
            combined.append(("insight", data, published_at))
        for data in reports_data:
            published_at = data.get("published_at")
            combined.append(("report", data, published_at))

        # published_atで降順ソート
        combined.sort(key=lambda x: x[2] if x[2] else "", reverse=True)

        # limitを適用
        has_more = len(combined) > limit
        combined = combined[:limit]

        for item_type_str, data, _ in combined:
            is_own = data.get("user_id") == user_id
            if item_type_str == "insight":
                items.append(
                    TimelineItem(
                        item_type="insight",
                        insight=PublicInsightResponse(
                            id=data["id"],
                            insight_id=data.get("insight_id", ""),
                            content=data.get("content", ""),
                            type=data.get("type", "impression"),
                            display_name=data.get("display_name", "読書家さん"),
                            book=data.get("book", {"title": "不明", "author": ""}),
                            reading_status=data.get("reading_status"),
                            published_at=data.get("published_at"),
                            is_own=is_own,
                        ),
                    )
                )
            else:
                book_data = data.get("book", {"title": "不明", "author": ""})
                items.append(
                    TimelineItem(
                        item_type="report",
                        report=PublicReportResponse(
                            id=data["id"],
                            report_id=data.get("report_id", ""),
                            user_id=data.get("user_id", ""),
                            reading_id=data.get("reading_id", ""),
                            summary=data.get("summary", ""),
                            insights_summary=data.get("insights_summary", ""),
                            context_analysis=data.get("context_analysis"),
                            display_name=data.get("display_name", "読書家さん"),
                            book=BookEmbed(**book_data),
                            reading_status=data.get("reading_status"),
                            published_at=data.get("published_at"),
                            is_own=is_own,
                        ),
                    )
                )

        # 次のカーソル
        if has_more and items:
            last_item = items[-1]
            if last_item.insight:
                published_at = last_item.insight.published_at
            elif last_item.report:
                published_at = last_item.report.published_at
            else:
                published_at = None
            if published_at:
                if hasattr(published_at, "isoformat"):
                    next_cursor = published_at.isoformat()
                else:
                    next_cursor = str(published_at)

    return TimelineResponseV2(
        items=items,
        next_cursor=next_cursor,
        has_more=has_more,
    )
