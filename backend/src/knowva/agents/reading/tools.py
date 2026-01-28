from google.adk.tools import ToolContext

from knowva.services import firestore


async def save_insight(
    content: str,
    insight_type: str,
    tool_context: ToolContext,
) -> dict:
    """対話から抽出された気づき・学びをFirestoreに保存する。

    ユーザーとの対話の中で気づきや学び、印象、疑問などが出てきた際に呼び出す。
    小さな気づきでも積極的に保存すること。

    Args:
        content: 気づき・学びの内容テキスト。ユーザーの言葉をなるべくそのまま使う。
        insight_type: 気づきの種類。"learning"(学び), "impression"(印象・感想),
                      "question"(疑問), "connection"(人生・経験との関連) のいずれか。
        tool_context: ツール実行コンテキスト（セッション情報を含む）。

    Returns:
        dict: 保存結果。statusとinsight_idを含む。
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")
    session_id = tool_context.session.id
    session_type = tool_context.session.state.get("session_type")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    # session_typeからreading_statusを決定
    session_to_status = {
        "before_reading": "not_started",
        "during_reading": "reading",
        "after_reading": "completed",
    }
    reading_status = session_to_status.get(session_type)

    result = await firestore.save_insight(
        user_id=user_id,
        reading_id=reading_id,
        data={
            "content": content,
            "type": insight_type,
            "session_ref": session_id,
            "reading_status": reading_status,
        },
    )
    return {"status": "success", "insight_id": result["id"]}


async def get_reading_context(tool_context: ToolContext) -> dict:
    """現在の読書記録のコンテキスト情報を取得する。

    読書の背景情報（書籍タイトル、著者、読書状況、動機など）とセッションタイプ、
    ユーザー設定（対話モード）を参照するために使う。
    最初のメッセージで必ず呼び出すこと。

    book_idが存在する場合は、/booksコレクションから本の詳細情報（概要など）も取得する。

    Args:
        tool_context: ツール実行コンテキスト（セッション情報を含む）。

    Returns:
        dict: 読書コンテキスト、セッションタイプ、ユーザー設定、本の詳細情報を含む。
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")
    session_type = tool_context.session.state.get("session_type")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    result = await firestore.get_reading(user_id=user_id, reading_id=reading_id)

    # ユーザー設定を取得
    user_settings = await firestore.get_user_settings(user_id)

    if result:
        # book_idがある場合は/booksから詳細情報（description等）を取得
        book_details = None
        if result.get("book_id"):
            book_details = await firestore.get_book(result["book_id"])

        return {
            "status": "success",
            "context": result,
            "session_type": session_type or "during_reading",
            "user_settings": user_settings,
            "book_details": book_details,  # 本の詳細情報（description, isbn等）
        }
    return {"status": "error", "error_message": "Reading not found"}


async def save_mood(
    energy: int,
    positivity: int,
    clarity: int,
    motivation: int,
    openness: int,
    dominant_emotion: str,
    note: str,
    tool_context: ToolContext,
) -> dict:
    """ユーザーの心境をFirestoreに保存する。

    読書前（before_reading）または読書後（after_reading）のセッションで、
    対話の序盤でユーザーの心境を把握したら呼び出す。

    Args:
        energy: 活力レベル (1-5)
        positivity: 気分のポジティブさ (1-5)
        clarity: 思考の明晰さ (1-5)
        motivation: モチベーション (1-5)
        openness: 新しいことへの開放性 (1-5)
        dominant_emotion: 支配的な感情（例: 期待、不安、好奇心、疲労など）
        note: 心境についてのメモ
        tool_context: ツール実行コンテキスト

    Returns:
        dict: 保存結果
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")
    session_type = tool_context.session.state.get("session_type")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    # セッションタイプに応じてmood_typeを決定
    if session_type == "before_reading":
        mood_type = "before"
    elif session_type == "after_reading":
        mood_type = "after"
    else:
        return {"status": "skipped", "message": "Mood only saved for before/after reading"}

    # 値を1-5の範囲にクランプ
    def clamp(v: int) -> int:
        return max(1, min(5, v))

    data = {
        "mood_type": mood_type,
        "metrics": {
            "energy": clamp(energy),
            "positivity": clamp(positivity),
            "clarity": clamp(clarity),
            "motivation": clamp(motivation),
            "openness": clamp(openness),
        },
        "note": note,
        "dominant_emotion": dominant_emotion,
    }

    result = await firestore.save_mood(user_id, reading_id, data)
    return {"status": "success", "mood_id": result["id"], "mood_type": mood_type}


async def update_reading_status(
    new_status: str,
    tool_context: ToolContext,
) -> dict:
    """読書のステータスを更新する。

    対話の中でユーザーの読書状況が変わったと判断した場合に呼び出す。
    例: 「読み始めました」→ reading, 「読み終わりました」→ completed

    Args:
        new_status: 新しいステータス。"not_started"(未読), "reading"(読書中),
                    "completed"(読了) のいずれか。
        tool_context: ツール実行コンテキスト。

    Returns:
        dict: 更新結果。
    """
    user_id = tool_context.session.state.get("user_id")
    reading_id = tool_context.session.state.get("reading_id")

    if not user_id or not reading_id:
        return {"status": "error", "error_message": "Session context not found"}

    if new_status not in ["not_started", "reading", "completed"]:
        return {"status": "error", "error_message": f"Invalid status: {new_status}"}

    result = await firestore.update_reading(user_id, reading_id, {"status": new_status})
    if result:
        return {"status": "success", "new_status": new_status}
    return {"status": "error", "error_message": "Failed to update reading status"}


async def present_options(
    prompt: str,
    options: list[str],
    allow_multiple: bool,
    tool_context: ToolContext,
) -> dict:
    """ユーザーに選択肢を提示して回答を促す。

    guidedモード（選択肢ガイドモード）のユーザー向けのツール。
    このツールを呼び出すと、UIに選択肢が表示される。
    ユーザーは選択肢から選ぶことも、無視して自由に入力することもできる。

    **重要**: user_settings.interaction_mode が "guided" の場合のみ使用すること。
    "freeform" モードのユーザーには使用しないこと。

    Args:
        prompt: ユーザーに表示する質問文。
        options: 選択肢のリスト（3〜6個程度が適切）。
        allow_multiple: 複数選択を許可するかどうか。Trueの場合、ユーザーは複数の選択肢を選べる。
        tool_context: ツール実行コンテキスト。

    Returns:
        dict: ツール呼び出し結果。SSEを通じてフロントエンドに選択肢が送信される。
    """
    # このツールの戻り値はSSEイベントとしてフロントエンドに送信される
    # sessions.py の _adk_to_sse_events で特別に処理される
    return {
        "status": "options_presented",
        "prompt": prompt,
        "options": options,
        "allow_multiple": allow_multiple,
        "allow_freeform": True,  # 常に自由入力も許可
    }
