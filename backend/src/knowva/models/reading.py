from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class BookEmbed(BaseModel):
    title: str
    author: str
    # TODO(phase2): book_idでbooksコレクションと紐付け


class ReadingContext(BaseModel):
    situation: Optional[str] = None
    motivation: Optional[str] = None
    reading_style: Optional[str] = None


class ReadingCreate(BaseModel):
    book: BookEmbed
    reading_context: Optional[ReadingContext] = None


class ReadingUpdate(BaseModel):
    status: Optional[Literal["reading", "completed"]] = None
    reading_context: Optional[ReadingContext] = None
    latest_summary: Optional[str] = None


class ReadingResponse(BaseModel):
    id: str
    user_id: str
    book: BookEmbed
    read_count: int = 1
    status: Literal["reading", "completed"] = "reading"
    start_date: datetime
    completed_date: Optional[datetime] = None
    reading_context: Optional[ReadingContext] = None
    latest_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
