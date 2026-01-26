"""SSEイベントのデータモデル定義。"""

from typing import Any, Literal

from pydantic import BaseModel

SSEEventType = Literal[
    "message_start",
    "text_delta",
    "text_done",
    "tool_call_start",
    "tool_call_done",
    "options_request",  # 選択肢提示イベント（guidedモード用）
    "message_done",
    "error",
    "ping",
]


class SSEMessageStart(BaseModel):
    """メッセージ開始イベント"""

    message_id: str


class SSETextDelta(BaseModel):
    """テキスト差分イベント"""

    delta: str


class SSETextDone(BaseModel):
    """テキスト完了イベント"""

    text: str


class SSEToolCallStart(BaseModel):
    """ツール呼び出し開始イベント"""

    tool_name: str
    tool_call_id: str


class SSEToolCallDone(BaseModel):
    """ツール呼び出し完了イベント"""

    tool_call_id: str
    result: Any


class SSEOptionsRequest(BaseModel):
    """選択肢提示イベント（guidedモード用）

    AIが選択肢を提示し、ユーザーが選択するためのイベント。
    ユーザーは選択肢から選ぶことも、自由入力することも可能。
    """

    prompt: str  # 質問文
    options: list[str]  # 選択肢のリスト
    allow_multiple: bool = True  # 複数選択を許可するか
    allow_freeform: bool = True  # 自由入力も許可するか（常にTrue推奨）


class SSEError(BaseModel):
    """エラーイベント"""

    code: str
    message: str
