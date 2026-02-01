"""バッジ関連のデータモデル"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

BadgeCategory = Literal["reading", "onboarding", "insight"]

BadgeId = Literal[
    # 読書系
    "first_reading",
    "books_5",
    "books_10",
    "books_25",
    "books_50",
    "first_completed",
    # Insight系
    "insights_10",
    "insights_50",
    "insights_100",
    # オンボーディング系
    "profile_3_entries",
    "first_reflection",
    "first_mood",
    "onboarding_complete",
]


class BadgeDefinition(BaseModel):
    """バッジ定義（静的マスタ）"""

    id: str
    name: str
    description: str
    category: BadgeCategory
    color: str  # Tailwind色名


class UserBadge(BaseModel):
    """ユーザー獲得バッジ"""

    id: str
    badge_id: str
    earned_at: datetime
    context: Optional[dict] = None


class UserBadgeCreate(BaseModel):
    """バッジ付与リクエスト"""

    badge_id: str
    context: Optional[dict] = None


class BadgeCheckResponse(BaseModel):
    """バッジ判定レスポンス"""

    new_badges: list[UserBadge]
    all_badges: list[UserBadge]
