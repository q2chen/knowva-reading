from fastapi import APIRouter, Depends, HTTPException

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.insight import (
    InsightResponse,
    InsightVisibilityResponse,
    InsightVisibilityUpdate,
)
from knowva.models.reading import ReadingCreate, ReadingResponse, ReadingUpdate
from knowva.services import firestore

router = APIRouter()

# 匿名公開時の表示名
ANONYMOUS_DISPLAY_NAME = "読書家さん"


@router.post("", response_model=ReadingResponse)
async def create_reading(
    body: ReadingCreate,
    user: dict = Depends(get_current_user),
):
    """新しい読書記録を作成する。

    book_id が指定されている場合は /books コレクションから本情報を取得し、
    BookEmbed として非正規化して保存する。
    book が直接指定されている場合（レガシー）はそのまま使用する。
    """
    book_embed = None
    book_id = None

    if body.book_id:
        # 新フロー: book_id から本情報を取得
        book = await firestore.get_book(body.book_id)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        book_id = body.book_id
        book_embed = {
            "title": book["title"],
            "author": book["author"],
            "cover_url": book.get("cover_url"),
        }
    elif body.book:
        # レガシーフロー: 直接 book 情報を使用
        book_embed = body.book.model_dump()
    else:
        raise HTTPException(status_code=400, detail="Either book_id or book is required")

    data = {
        "book_id": book_id,
        "book": book_embed,
        "reading_context": body.reading_context.model_dump() if body.reading_context else None,
    }
    result = await firestore.create_reading(user["uid"], data)
    return result


@router.get("", response_model=list[ReadingResponse])
async def list_readings(user: dict = Depends(get_current_user)):
    """ユーザーの読書記録一覧を取得する。"""
    return await firestore.list_readings(user["uid"])


@router.get("/{reading_id}", response_model=ReadingResponse)
async def get_reading(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書記録の詳細を取得する。"""
    result = await firestore.get_reading(user["uid"], reading_id)
    if not result:
        raise HTTPException(status_code=404, detail="Reading not found")
    return result


@router.patch("/{reading_id}", response_model=ReadingResponse)
async def update_reading(
    reading_id: str,
    body: ReadingUpdate,
    user: dict = Depends(get_current_user),
):
    """読書記録を更新する。"""
    data = body.model_dump(exclude_unset=True)
    result = await firestore.update_reading(user["uid"], reading_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Reading not found")
    return result


@router.get("/{reading_id}/insights", response_model=list[InsightResponse])
async def list_insights(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書記録に紐づくInsight一覧を取得する。"""
    return await firestore.list_insights(user["uid"], reading_id)


@router.patch(
    "/{reading_id}/insights/{insight_id}/visibility",
    response_model=InsightVisibilityResponse,
)
async def update_insight_visibility(
    reading_id: str,
    insight_id: str,
    body: InsightVisibilityUpdate,
    user: dict = Depends(get_current_user),
):
    """Insightの公開設定を更新する。"""
    user_id = user["uid"]

    # Insightが存在するか確認
    insight = await firestore.get_insight(user_id, reading_id, insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    # 公開設定を更新
    updated = await firestore.update_insight_visibility(
        user_id, reading_id, insight_id, body.visibility
    )

    published_at = None

    if body.visibility in ("public", "anonymous"):
        # 公開Insightを作成/更新
        reading = await firestore.get_reading(user_id, reading_id)
        if not reading:
            raise HTTPException(status_code=404, detail="Reading not found")

        # 表示名を決定
        if body.visibility == "public":
            nickname = await firestore.get_user_name(user_id)
            display_name = nickname if nickname else ANONYMOUS_DISPLAY_NAME
        else:
            display_name = ANONYMOUS_DISPLAY_NAME

        public_insight = await firestore.create_public_insight(
            user_id=user_id,
            reading_id=reading_id,
            insight_id=insight_id,
            insight_data=updated,
            book_data=reading.get("book", {}),
            visibility=body.visibility,
            display_name=display_name,
        )
        published_at = public_insight.get("published_at")
    else:
        # 非公開に変更した場合、公開Insightを削除
        await firestore.delete_public_insight(insight_id)

    return InsightVisibilityResponse(
        id=insight_id,
        visibility=body.visibility,
        published_at=published_at,
    )
