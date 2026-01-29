"""読書レポートのデータモデル。"""

from datetime import datetime

from pydantic import BaseModel, Field


class ReportMetadata(BaseModel):
    """レポート生成時のメタデータ。"""

    session_count: int = Field(description="レポート生成時のセッション数")
    insight_count: int = Field(description="レポート生成時のInsight数")
    generation_model: str = Field(
        default="gemini-3-flash-preview", description="生成に使用したモデル"
    )


class ReportCreate(BaseModel):
    """レポート作成リクエスト（内部用）。"""

    summary: str = Field(description="レポート全体の要約")
    insights_summary: str = Field(description="Insightの統合要約")
    context_analysis: str = Field(description="ユーザー文脈との関連分析")
    action_plan_ids: list[str] = Field(
        default_factory=list, description="関連するアクションプランのID"
    )
    metadata: ReportMetadata


class ReportResponse(BaseModel):
    """レポートのレスポンス。"""

    id: str
    reading_id: str
    summary: str = Field(description="レポート全体の要約")
    insights_summary: str = Field(description="Insightの統合要約")
    context_analysis: str = Field(description="ユーザー文脈との関連分析")
    action_plan_ids: list[str] = Field(
        default_factory=list, description="関連するアクションプランのID"
    )
    metadata: ReportMetadata
    created_at: datetime
    updated_at: datetime
