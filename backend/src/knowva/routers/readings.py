from fastapi import APIRouter, Depends, HTTPException

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.reading import ReadingCreate, ReadingResponse, ReadingUpdate
from knowva.models.insight import InsightResponse
from knowva.services import firestore

router = APIRouter()


@router.post("", response_model=ReadingResponse)
async def create_reading(
    body: ReadingCreate,
    user: dict = Depends(get_current_user),
):
    """新しい読書記録を作成する。"""
    # TODO(phase2): Book Search API連携 (ISBN/タイトル検索)
    data = {
        "book": body.book.model_dump(),
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
