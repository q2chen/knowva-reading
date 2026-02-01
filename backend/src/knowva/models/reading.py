from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class BookEmbed(BaseModel):
    """Denormalized book data stored within reading for quick access."""

    title: str
    author: str
    cover_url: Optional[str] = None


class ReadingContext(BaseModel):
    motivation: Optional[str] = None


class ReadingCreate(BaseModel):
    """Request body for creating a reading.

    Accepts either book_id (new flow) or book (legacy flow) for backward compatibility.
    """

    book_id: Optional[str] = None  # Reference to /books collection
    book: Optional[BookEmbed] = None  # Legacy: embedded book data
    reading_context: Optional[ReadingContext] = None


class ReadingUpdate(BaseModel):
    status: Optional[Literal["not_started", "reading", "completed"]] = None
    reading_context: Optional[ReadingContext] = None
    latest_summary: Optional[str] = None
    book: Optional[BookEmbed] = None  # 本のタイトル・著者の編集用


class ReadingDeleteConfirmation(BaseModel):
    """削除確認用の関連データ件数"""

    sessions_count: int
    messages_count: int
    insights_count: int
    moods_count: int
    reports_count: int
    action_plans_count: int


class ReadingDeleteResponse(BaseModel):
    """削除レスポンス"""

    deleted: bool
    counts: ReadingDeleteConfirmation


class ReadingResponse(BaseModel):
    id: str
    user_id: str
    book_id: Optional[str] = None  # Reference to /books collection
    book: BookEmbed
    read_count: int = 1
    status: Literal["not_started", "reading", "completed"] = "not_started"
    start_date: datetime
    completed_date: Optional[datetime] = None
    reading_context: Optional[ReadingContext] = None
    latest_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
