from knowva.services import firestore


async def save_insight(
    user_id: str,
    reading_id: str,
    content: str,
    insight_type: str,
    session_id: str,
) -> dict:
    """対話から抽出された気づき・学びをFirestoreに保存する。

    ユーザーとの対話の中で重要な気づきや学びが出てきた際に呼び出す。

    Args:
        user_id: ユーザーID。
        reading_id: 読書記録ID。
        content: 気づき・学びの内容テキスト。
        insight_type: 気づきの種類。"learning"(学び), "impression"(印象),
                      "question"(疑問), "connection"(自分の人生との関連) のいずれか。
        session_id: この気づきが生まれたセッションID。

    Returns:
        dict: 保存結果。statusとinsight_idを含む。
    """
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


async def get_reading_context(user_id: str, reading_id: str) -> dict:
    """現在の読書記録のコンテキスト情報を取得する。

    読書の背景情報（書籍タイトル、著者、読書状況、動機など）を参照するために使う。

    Args:
        user_id: ユーザーID。
        reading_id: 読書記録ID。

    Returns:
        dict: 読書コンテキスト。statusとcontextを含む。
    """
    result = await firestore.get_reading(user_id=user_id, reading_id=reading_id)
    if result:
        return {"status": "success", "context": result}
    return {"status": "error", "error_message": "Reading not found"}
