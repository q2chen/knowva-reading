from google.adk.tools import ToolContext

from knowva.services import firestore


async def save_insight(
    content: str,
    insight_type: str,
    tool_context: ToolContext,
) -> dict:
    """対話から抽出された気づき・学びをFirestoreに保存する。

    ユーザーとの対話の中で重要な気づきや学びが出てきた際に呼び出す。

    Args:
        content: 気づき・学びの内容テキスト。
        insight_type: 気づきの種類。"learning"(学び), "impression"(印象),
                      "question"(疑問), "connection"(自分の人生との関連) のいずれか。
        tool_context: ツール実行コンテキスト（セッション情報を含む）。

    Returns:
        dict: 保存結果。statusとinsight_idを含む。
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")
    session_id = tool_context.session.id

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    result = await firestore.save_insight(
        user_id=user_id,
        reading_id=reading_id,
        data={
            "content": content,
            "type": insight_type,
            "session_ref": session_id,
        },
    )
    return {"status": "success", "insight_id": result["id"]}


async def get_reading_context(tool_context: ToolContext) -> dict:
    """現在の読書記録のコンテキスト情報を取得する。

    読書の背景情報（書籍タイトル、著者、読書状況、動機など）を参照するために使う。

    Args:
        tool_context: ツール実行コンテキスト（セッション情報を含む）。

    Returns:
        dict: 読書コンテキスト。statusとcontextを含む。
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    result = await firestore.get_reading(user_id=user_id, reading_id=reading_id)
    if result:
        return {"status": "success", "context": result}
    return {"status": "error", "error_message": "Reading not found"}
