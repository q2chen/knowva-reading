"""アクションプランのデータモデル。"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ActionPlanStatus = Literal["pending", "in_progress", "completed", "skipped"]
ActionPlanDifficulty = Literal["easy", "medium", "hard"]


class ActionPlanCreate(BaseModel):
    """アクションプラン作成リクエスト（内部用）。"""

    action: str = Field(description="具体的なアクション内容")
    source_insight_id: Optional[str] = Field(
        default=None, description="関連するInsightのID"
    )
    relevance: str = Field(description="ユーザーのプロファイル（目標・悩み）との関連性")
    difficulty: ActionPlanDifficulty = Field(
        default="medium", description="難易度"
    )
    timeframe: str = Field(description="実行目安期間（例: 1週間、3日、1カ月）")


class ActionPlanUpdate(BaseModel):
    """アクションプランのステータス更新リクエスト。"""

    status: Optional[ActionPlanStatus] = Field(default=None, description="ステータス")


class ActionPlanCreateManual(BaseModel):
    """ユーザー手動作成用リクエスト。"""

    action: str = Field(description="具体的なアクション内容")
    relevance: Optional[str] = Field(default=None, description="自分との関連性")
    difficulty: ActionPlanDifficulty = Field(default="medium", description="難易度")
    timeframe: Optional[str] = Field(default=None, description="実行目安期間")


class ActionPlanUpdateFull(BaseModel):
    """アクションプランのフル更新リクエスト。"""

    action: Optional[str] = Field(default=None, description="具体的なアクション内容")
    relevance: Optional[str] = Field(default=None, description="自分との関連性")
    difficulty: Optional[ActionPlanDifficulty] = Field(default=None, description="難易度")
    timeframe: Optional[str] = Field(default=None, description="実行目安期間")
    status: Optional[ActionPlanStatus] = Field(default=None, description="ステータス")


class ActionPlanResponse(BaseModel):
    """アクションプランのレスポンス。"""

    id: str
    reading_id: str
    action: str = Field(description="具体的なアクション内容")
    source_insight_id: Optional[str] = Field(
        default=None, description="関連するInsightのID"
    )
    relevance: str = Field(description="ユーザーのプロファイル（目標・悩み）との関連性")
    difficulty: ActionPlanDifficulty = Field(description="難易度")
    timeframe: str = Field(description="実行目安期間")
    status: ActionPlanStatus = Field(default="pending", description="ステータス")
    completed_at: Optional[datetime] = Field(default=None, description="完了日時")
    created_at: datetime
    updated_at: datetime
