"""Books router - Book search and management API."""

from fastapi import APIRouter, Depends, HTTPException, Query

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.book import (
    BookCreate,
    BookResponse,
    BookSearchResponse,
    BookSearchResult,
)
from knowva.services import book_search, firestore

router = APIRouter()


@router.get("/search", response_model=BookSearchResponse)
async def search_books(
    q: str = Query(..., min_length=1, description="Search query"),
    user: dict = Depends(get_current_user),
):
    """Search books from Google Books API with deduplication info.

    Returns search results with indicators for:
    - existing_book_id: If the book is already in our database
    - has_reading: If the current user has a reading for this book
    """
    user_id = user["uid"]

    # Search Google Books
    google_results = await book_search.search_google_books(q)

    # Get user's existing book_ids
    user_book_ids = await firestore.list_user_book_ids(user_id)

    results = []
    for item in google_results:
        # Check if book exists in our DB by ISBN
        existing_book = None
        isbn = item.get("isbn")
        if isbn:
            existing_book = await firestore.get_book_by_isbn(isbn)

        has_reading = False
        existing_book_id = None
        if existing_book:
            existing_book_id = existing_book["id"]
            has_reading = existing_book_id in user_book_ids

        results.append(
            BookSearchResult(
                google_books_id=item.get("google_books_id"),
                isbn=item.get("isbn"),
                title=item["title"],
                author=item["author"],
                description=item.get("description"),
                thumbnail_url=item.get("thumbnail_url"),
                existing_book_id=existing_book_id,
                has_reading=has_reading,
            )
        )

    return BookSearchResponse(results=results, total=len(results))


@router.post("", response_model=BookResponse)
async def create_or_get_book(
    body: BookCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new book or return existing one.

    If a book with the same ISBN exists, returns the existing book.
    Attempts to enrich book data with openBD (cover image, description).
    """
    # Check for existing book by ISBN
    if body.isbn:
        existing = await firestore.get_book_by_isbn(body.isbn)
        if existing:
            # Optionally update with openBD data if missing
            if not existing.get("cover_url") or not existing.get("description"):
                openbd_data = await book_search.fetch_openbd(body.isbn)
                if openbd_data:
                    update_fields = {}
                    if not existing.get("cover_url") and openbd_data.get("cover_url"):
                        update_fields["cover_url"] = openbd_data["cover_url"]
                    if not existing.get("description") and openbd_data.get("description"):
                        update_fields["description"] = openbd_data["description"]
                    if update_fields:
                        existing = await firestore.update_book(existing["id"], update_fields)
            return BookResponse(**existing)

    # Try to enrich with openBD data for new book
    book_data = body.model_dump()
    if body.isbn and (not body.cover_url or not body.description):
        openbd_data = await book_search.fetch_openbd(body.isbn)
        if openbd_data:
            if not body.cover_url and openbd_data.get("cover_url"):
                book_data["cover_url"] = openbd_data["cover_url"]
            if not body.description and openbd_data.get("description"):
                book_data["description"] = openbd_data["description"]

    # Normalize ISBN (remove hyphens)
    if book_data.get("isbn"):
        book_data["isbn"] = book_data["isbn"].replace("-", "")

    # Create new book
    created = await firestore.create_book(book_data)
    return BookResponse(**created)


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: str,
    user: dict = Depends(get_current_user),
):
    """Get book by ID."""
    book = await firestore.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return BookResponse(**book)
