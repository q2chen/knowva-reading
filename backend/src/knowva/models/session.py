from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class SessionCreate(BaseModel):
    session_type: Literal["during_reading", "after_completion", "reflection"]


class SessionResponse(BaseModel):
    id: str
    reading_id: str
    session_type: Literal["during_reading", "after_completion", "reflection"]
    started_at: datetime
    ended_at: Optional[datetime] = None
    summary: Optional[str] = None
    # TODO(phase2): gcs_log_pathフィールド有効化
