from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

# === ユーザー設定 ===

InteractionMode = Literal["freeform", "guided"]
TimelineOrder = Literal["random", "newest"]


class UserSettings(BaseModel):
    """ユーザーのアプリ設定"""

    interaction_mode: InteractionMode = "guided"
    # freeform: 自由入力モード（自分で考えて言語化したいユーザー向け）
    # guided: 選択肢ガイドモード（AIが選択肢を提示し、タップで選択したいユーザー向け）

    timeline_order: TimelineOrder = "random"
    # random: ランダム順（デフォルト）
    # newest: 新着順


class UserSettingsUpdate(BaseModel):
    """ユーザー設定更新リクエスト"""

    interaction_mode: Optional[InteractionMode] = None
    timeline_order: Optional[TimelineOrder] = None


class NameUpdateRequest(BaseModel):
    """ニックネーム更新リクエスト"""

    name: str  # 1-30文字


class NameUpdateResponse(BaseModel):
    """ニックネーム更新レスポンス"""

    name: str


class UserProfile(BaseModel):
    life_stage: Optional[str] = None
    situation: Optional[str] = None
    challenges: list[str] = []
    values: list[str] = []
    reading_motivation: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    current_profile: UserProfile = UserProfile()
    created_at: Optional[datetime] = None


# === プロファイルエントリ（非構造的情報） ===

ProfileEntryType = Literal["goal", "interest", "book_wish", "other"]


class ProfileEntryCreate(BaseModel):
    """プロファイルエントリ作成リクエスト"""

    entry_type: ProfileEntryType
    content: str
    note: Optional[str] = None


class ProfileEntryResponse(BaseModel):
    """プロファイルエントリレスポンス"""

    id: str
    entry_type: ProfileEntryType
    content: str
    note: Optional[str] = None
    session_ref: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# === 全Insight集約レスポンス ===


class BookEmbed(BaseModel):
    """書籍情報の埋め込み"""

    title: str
    author: Optional[str] = None


class InsightWithBook(BaseModel):
    """書籍情報付きInsight"""

    id: str
    content: str
    type: Literal["learning", "impression", "question", "connection"]
    session_ref: Optional[str] = None
    created_at: datetime
    reading_id: str
    book: BookEmbed


class InsightGroup(BaseModel):
    """Insightグループ"""

    key: str
    book: Optional[BookEmbed] = None
    insight_type: Optional[str] = None
    count: int


class AllInsightsResponse(BaseModel):
    """全読書のInsight集約レスポンス"""

    insights: list[InsightWithBook]
    total_count: int
    grouped_by: Literal["book", "type"]
    groups: list[InsightGroup]
