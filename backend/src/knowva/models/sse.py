"""SSEイベントのデータモデル定義。"""

from typing import Any, Literal

from pydantic import BaseModel

SSEEventType = Literal[
    "message_start",
    "text_delta",
    "text_done",
    "tool_call_start",
    "tool_call_done",
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


class SSEError(BaseModel):
    """エラーイベント"""

    code: str
    message: str
