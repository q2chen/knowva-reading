"""External book search API integrations (Google Books, openBD)."""

import logging
from typing import Optional

import httpx

from knowva.config import settings

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"
OPENBD_API = "https://api.openbd.jp/v1/get"


async def search_google_books(query: str, max_results: int = 10) -> list[dict]:
    """Search books using Google Books API.

    Args:
        query: Search query (title, author, etc.)
        max_results: Maximum number of results to return

    Returns:
        List of book data dictionaries
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            params = {
                "q": query,
                "maxResults": max_results,
                "langRestrict": "ja",
                "printType": "books",
            }
            # APIキーが設定されている場合は使用
            if settings.google_books_api_key:
                params["key"] = settings.google_books_api_key

            response = await client.get(GOOGLE_BOOKS_API, params=params)
            response.raise_for_status()
            data = response.json()
            return _parse_google_books_response(data)
        except httpx.HTTPError as e:
            logger.warning(f"Google Books API error: {e}")
            return []
        except Exception as e:
            logger.exception(f"Unexpected error searching Google Books: {e}")
            return []


async def fetch_openbd(isbn: str) -> Optional[dict]:
    """Fetch book details from openBD API.

    Args:
        isbn: ISBN-10 or ISBN-13

    Returns:
        Book data dictionary or None if not found
    """
    # Normalize ISBN (remove hyphens)
    normalized_isbn = isbn.replace("-", "")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(OPENBD_API, params={"isbn": normalized_isbn})
            response.raise_for_status()
            data = response.json()

            # openBD returns array, first element is the book (or null if not found)
            if data and data[0]:
                return _parse_openbd_response(data[0])
            return None
        except httpx.HTTPError as e:
            logger.warning(f"openBD API error: {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error fetching from openBD: {e}")
            return None


def _parse_google_books_response(data: dict) -> list[dict]:
    """Parse Google Books API response to our format."""
    results = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        isbn = _extract_isbn(info.get("industryIdentifiers", []))

        # Get authors as comma-separated string
        authors = info.get("authors", [])
        author_str = ", ".join(authors) if authors else ""

        # Get thumbnail URL (prefer larger image)
        image_links = info.get("imageLinks", {})
        thumbnail_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")

        # Replace http with https for images
        if thumbnail_url and thumbnail_url.startswith("http://"):
            thumbnail_url = thumbnail_url.replace("http://", "https://")

        results.append(
            {
                "google_books_id": item.get("id"),
                "isbn": isbn,
                "title": info.get("title", ""),
                "author": author_str,
                "description": info.get("description"),
                "thumbnail_url": thumbnail_url,
            }
        )
    return results


def _extract_isbn(identifiers: list) -> Optional[str]:
    """Extract ISBN from Google Books industryIdentifiers.

    Prefers ISBN-13 over ISBN-10.
    """
    isbn_13 = None
    isbn_10 = None

    for id_obj in identifiers:
        id_type = id_obj.get("type", "")
        identifier = id_obj.get("identifier", "")

        if id_type == "ISBN_13":
            isbn_13 = identifier
        elif id_type == "ISBN_10":
            isbn_10 = identifier

    return isbn_13 or isbn_10


def _parse_openbd_response(data: dict) -> Optional[dict]:
    """Parse openBD API response to our format."""
    summary = data.get("summary", {})
    if not summary:
        return None

    # Get cover URL
    cover_url = summary.get("cover")

    # Get description from onix data
    description = _extract_openbd_description(data)

    return {
        "isbn": summary.get("isbn"),
        "title": summary.get("title"),
        "author": summary.get("author"),
        "cover_url": cover_url,
        "description": description,
    }


def _extract_openbd_description(data: dict) -> Optional[str]:
    """Extract description from openBD onix data.

    openBD stores descriptions in various places within the ONIX structure.
    """
    onix = data.get("onix", {})
    if not onix:
        return None

    # Try to get from DescriptiveDetail -> TitleDetail (usually contains description)
    descriptive = onix.get("DescriptiveDetail", {})

    # Try CollateralDetail for text content (descriptions, table of contents, etc.)
    collateral = onix.get("CollateralDetail", {})
    text_contents = collateral.get("TextContent", [])

    for text_content in text_contents:
        # TextType 03 = Description
        if text_content.get("TextType") == "03":
            return text_content.get("Text")

    # Try getting from summary's description if available
    summary = data.get("summary", {})
    return summary.get("description")
