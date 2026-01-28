"""Book models for the books collection."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

BookSource = Literal["google_books", "openbd", "manual"]


class BookCreate(BaseModel):
    """Request body for creating a book."""

    isbn: Optional[str] = None
    title: str
    author: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    google_books_id: Optional[str] = None
    source: BookSource = "manual"


class BookResponse(BaseModel):
    """Response body for a book."""

    id: str
    isbn: Optional[str] = None
    title: str
    author: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    google_books_id: Optional[str] = None
    source: BookSource
    created_at: datetime
    updated_at: datetime


class BookSearchResult(BaseModel):
    """A single result from book search (Google Books API)."""

    google_books_id: Optional[str] = None
    isbn: Optional[str] = None
    title: str
    author: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    existing_book_id: Optional[str] = None  # Set if book exists in our DB
    has_reading: bool = False  # True if user has a reading for this book


class BookSearchResponse(BaseModel):
    """Response for book search endpoint."""

    results: list[BookSearchResult]
    total: int
