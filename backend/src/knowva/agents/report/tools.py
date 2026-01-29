"""Report Agent用のツール関数。"""

from typing import Optional

from google.adk.tools import ToolContext

from knowva.services import firestore


async def get_report_context(tool_context: ToolContext) -> dict:
    """レポート生成用のコンテキスト情報を取得する。

    該当Readingのセッション全メッセージ、Insight一覧、プロファイル情報、
    心境変化データを集約して返す。

    Args:
        tool_context: ツール実行コンテキスト

    Returns:
        dict: レポート生成に必要な全コンテキスト
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    context = await firestore.get_report_context(user_id, reading_id)
    return {"status": "success", "context": context}


async def save_report(
    summary: str,
    insights_summary: str,
    context_analysis: str,
    tool_context: ToolContext,
) -> dict:
    """生成したレポートをFirestoreに保存する。

    Args:
        summary: レポート全体の要約（1-2文）
        insights_summary: 抽出したInsightの統合要約
        context_analysis: ユーザーの目標・状況との関連分析
        tool_context: ツール実行コンテキスト

    Returns:
        dict: 保存結果（report_idを含む）
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    # メタデータ取得
    context = await firestore.get_report_context(user_id, reading_id)

    result = await firestore.save_report(
        user_id=user_id,
        reading_id=reading_id,
        data={
            "summary": summary,
            "insights_summary": insights_summary,
            "context_analysis": context_analysis,
            "action_plan_ids": [],  # 後からActionPlan生成時に更新可能
            "metadata": {
                "session_count": context.get("summary", {}).get("session_count", 0),
                "insight_count": context.get("summary", {}).get("insight_count", 0),
                "generation_model": "gemini-3-flash-preview",
            },
        },
    )
    return {"status": "success", "report_id": result["id"]}


async def save_action_plan(
    action: str,
    relevance: str,
    difficulty: str,
    timeframe: str,
    source_insight_id: Optional[str],
    tool_context: ToolContext,
) -> dict:
    """アクションプランをFirestoreに保存する。

    Args:
        action: 具体的なアクション内容
        relevance: ユーザーのプロファイル（目標・悩み）との関連性説明
        difficulty: 難易度 ("easy", "medium", "hard")
        timeframe: 実行目安期間（例: "1週間", "3日", "1カ月"）
        source_insight_id: 関連するInsightのID（任意）
        tool_context: ツール実行コンテキスト

    Returns:
        dict: 保存結果（plan_idを含む）
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"

    result = await firestore.save_action_plan(
        user_id=user_id,
        reading_id=reading_id,
        data={
            "action": action,
            "source_insight_id": source_insight_id if source_insight_id else None,
            "relevance": relevance,
            "difficulty": difficulty,
            "timeframe": timeframe,
        },
    )
    return {"status": "success", "plan_id": result["id"]}
