from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class InsightResponse(BaseModel):
    id: str
    content: str
    type: Literal["learning", "impression", "question", "connection"]
    session_ref: Optional[str] = None
    created_at: datetime
