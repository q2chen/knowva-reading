import json

from fastapi import APIRouter, Depends, HTTPException
from google import genai

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.insight import (
    InsightCreate,
    InsightDeleteRequest,
    InsightDeleteResponse,
    InsightMergeConfirmRequest,
    InsightMergePreviewResponse,
    InsightMergeRequest,
    InsightResponse,
    InsightUpdate,
    InsightVisibilityResponse,
    InsightVisibilityUpdate,
)
from knowva.models.reading import (
    ReadingCreate,
    ReadingDeleteConfirmation,
    ReadingDeleteResponse,
    ReadingResponse,
    ReadingUpdate,
)
from knowva.services import badge_service, firestore

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

    # バッジ判定（読書記録作成）
    await badge_service.check_reading_badges(user["uid"])

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

    # bookが含まれている場合は辞書に変換
    if "book" in data and data["book"] is not None:
        data["book"] = body.book.model_dump()

    result = await firestore.update_reading(user["uid"], reading_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Reading not found")

    # ステータス変更時にバッジ判定
    if "status" in data:
        await badge_service.check_reading_badges(user["uid"])

    return result


@router.get("/{reading_id}/delete-preview", response_model=ReadingDeleteConfirmation)
async def preview_reading_delete(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書記録削除時に削除される関連データの件数を取得する。"""
    # 読書記録が存在するか確認
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    counts = await firestore.get_reading_related_counts(user["uid"], reading_id)
    return ReadingDeleteConfirmation(**counts)


@router.delete("/{reading_id}", response_model=ReadingDeleteResponse)
async def delete_reading(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書記録と関連する全データを削除する。"""
    result = await firestore.delete_reading_cascade(user["uid"], reading_id)
    if not result.get("deleted"):
        raise HTTPException(status_code=404, detail="Reading not found")

    return ReadingDeleteResponse(
        deleted=True,
        counts=ReadingDeleteConfirmation(
            sessions_count=result["counts"]["sessions"],
            messages_count=result["counts"]["messages"],
            insights_count=result["counts"]["insights"],
            moods_count=result["counts"]["moods"],
            reports_count=result["counts"]["reports"],
            action_plans_count=result["counts"]["action_plans"],
        ),
    )


@router.get("/{reading_id}/insights", response_model=list[InsightResponse])
async def list_insights(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書記録に紐づくInsight一覧を取得する。"""
    return await firestore.list_insights(user["uid"], reading_id)


@router.post("/{reading_id}/insights", response_model=InsightResponse)
async def create_insight(
    reading_id: str,
    body: InsightCreate,
    user: dict = Depends(get_current_user),
):
    """気づきを手動で作成する。"""
    user_id = user["uid"]

    # 読書記録が存在するか確認
    reading = await firestore.get_reading(user_id, reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    data = {
        "content": body.content,
        "type": body.type,
        "visibility": "private",
        "reading_status": reading.get("status"),
        "session_ref": None,
    }

    result = await firestore.save_insight(user_id, reading_id, data)
    return result


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


@router.patch("/{reading_id}/insights/{insight_id}", response_model=InsightResponse)
async def update_insight(
    reading_id: str,
    insight_id: str,
    body: InsightUpdate,
    user: dict = Depends(get_current_user),
):
    """Insightの内容やタイプを更新する。"""
    user_id = user["uid"]

    # Insightが存在するか確認
    insight = await firestore.get_insight(user_id, reading_id, insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    data = body.model_dump(exclude_unset=True)
    result = await firestore.update_insight(user_id, reading_id, insight_id, data)
    return result


@router.post("/{reading_id}/insights/delete", response_model=InsightDeleteResponse)
async def delete_insights(
    reading_id: str,
    body: InsightDeleteRequest,
    user: dict = Depends(get_current_user),
):
    """複数のInsightを削除する。"""
    if not body.insight_ids:
        raise HTTPException(status_code=400, detail="No insight IDs provided")

    result = await firestore.delete_insights(user["uid"], reading_id, body.insight_ids)
    return InsightDeleteResponse(deleted_count=result["deleted_count"])


@router.post(
    "/{reading_id}/insights/merge/preview", response_model=InsightMergePreviewResponse
)
async def preview_insight_merge(
    reading_id: str,
    body: InsightMergeRequest,
    user: dict = Depends(get_current_user),
):
    """LLMを使って複数Insightのマージプレビューを生成する。"""
    if len(body.insight_ids) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 insights are required for merge"
        )

    user_id = user["uid"]

    # 対象Insightを取得
    original_insights = []
    for insight_id in body.insight_ids:
        insight = await firestore.get_insight(user_id, reading_id, insight_id)
        if insight:
            original_insights.append(insight)

    if len(original_insights) < 2:
        raise HTTPException(status_code=400, detail="Not enough valid insights found")

    # LLMでマージテキストを生成
    insights_text = "\n".join(
        [
            f"- Insight {i+1}: {ins['content']}（type: {ins.get('type', 'unknown')}）"
            for i, ins in enumerate(original_insights)
        ]
    )

    prompt = f"""以下の複数の気づきを1つの統合された気づきにまとめてください。

{insights_text}

## ガイドライン
- 各気づきの本質的な内容を保持する
- 重複する内容は統合し、補完し合う内容は組み合わせる
- 元の表現をなるべく活かしつつ、より洗練された表現に
- 統合後のテキストは簡潔に（200字程度を目安）
- 自然な日本語で出力
- 統合される気づきの種類（type）を考慮し、最も適切なtypeを提案

## 出力形式
以下のJSON形式で出力してください（```json などのマークダウン記法は使わず、純粋なJSONのみ）:
{{"merged_content": "統合された気づきの内容", "suggested_type": "learning|impression|question|connection"}}
"""

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        # レスポンスをパース
        response_text = response.text.strip()
        # マークダウンコードブロックを除去
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # 最初と最後の行を除去
            response_text = "\n".join(lines[1:-1])

        result = json.loads(response_text)
        merged_content = result.get("merged_content", "")
        suggested_type = result.get("suggested_type", "learning")

        # 有効なタイプか確認
        valid_types = ["learning", "impression", "question", "connection"]
        if suggested_type not in valid_types:
            suggested_type = "learning"

    except Exception as e:
        # LLM呼び出しに失敗した場合はシンプルに連結
        merged_content = " / ".join([ins["content"] for ins in original_insights])
        suggested_type = original_insights[0].get("type", "learning")
        print(f"LLM merge preview error: {e}")

    return InsightMergePreviewResponse(
        merged_content=merged_content,
        suggested_type=suggested_type,
        original_insights=[InsightResponse(**ins) for ins in original_insights],
    )


@router.post("/{reading_id}/insights/merge", response_model=InsightResponse)
async def merge_insights(
    reading_id: str,
    body: InsightMergeConfirmRequest,
    user: dict = Depends(get_current_user),
):
    """Insightのマージを確定する。"""
    if len(body.insight_ids) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 insights are required for merge"
        )

    result = await firestore.merge_insights(
        user_id=user["uid"],
        reading_id=reading_id,
        merged_content=body.merged_content,
        merged_type=body.type,
        source_insight_ids=body.insight_ids,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error"))

    return InsightResponse(**result)
