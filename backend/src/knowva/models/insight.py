from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

# 公開設定の型
InsightVisibility = Literal["private", "public", "anonymous"]

# 読書ステータスの型
ReadingStatus = Literal["not_started", "reading", "completed"]


class InsightResponse(BaseModel):
    id: str
    content: str
    type: Literal["learning", "impression", "question", "connection"]
    visibility: InsightVisibility = "private"
    reading_status: Optional[ReadingStatus] = None
    session_ref: Optional[str] = None
    created_at: datetime


class InsightVisibilityUpdate(BaseModel):
    """Insight公開設定の更新リクエスト"""

    visibility: InsightVisibility


class InsightVisibilityResponse(BaseModel):
    """Insight公開設定の更新レスポンス"""

    id: str
    visibility: InsightVisibility
    published_at: Optional[datetime] = None


class PublicInsightResponse(BaseModel):
    """公開Insight（タイムライン用）"""

    id: str
    insight_id: str
    content: str
    type: Literal["learning", "impression", "question", "connection"]
    display_name: str
    book: dict  # {"title": str, "author": str}
    reading_status: Optional[ReadingStatus] = None
    published_at: datetime
    is_own: bool = False  # 自分の投稿かどうか


class TimelineResponse(BaseModel):
    """タイムラインレスポンス"""

    insights: list[PublicInsightResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False
