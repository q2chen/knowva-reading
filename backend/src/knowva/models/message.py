from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MessageCreate(BaseModel):
    message: str
    input_type: Literal["text", "voice"] = "text"


class MessageResponse(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    message: str
    input_type: Literal["text", "voice"] = "text"
    created_at: datetime
