"""オンボーディング関連のAPIエンドポイント"""

from fastapi import APIRouter, Depends

from knowva.middleware.firebase_auth import get_current_user
from knowva.models.onboarding import (
    OnboardingResponse,
    OnboardingStatus,
    OnboardingSubmit,
)
from knowva.services import firestore

router = APIRouter()


@router.get("/status", response_model=OnboardingStatus)
async def get_onboarding_status(user: dict = Depends(get_current_user)):
    """オンボーディングの完了状態を取得する。"""
    status = await firestore.get_onboarding_status(user["uid"])
    return status


@router.post("/submit", response_model=OnboardingResponse)
async def submit_onboarding(
    body: OnboardingSubmit,
    user: dict = Depends(get_current_user),
):
    """オンボーディング回答を保存する。"""
    user_id = user["uid"]
    badges_earned = []

    # 1. ニックネームを保存（入力がある場合のみ）
    if body.nickname and body.nickname.strip():
        await firestore.update_user_name(user_id, body.nickname.strip())

    # 2. current_profileに構造化情報を保存（interestsも含む）
    profile_data = {
        "life_stage": body.life_stage,
        "situation": body.situation,
        "challenges": body.challenges,
        "values": body.values,
        "reading_motivations": body.reading_motivations,
        "interests": body.interests,
    }
    await firestore.update_user_profile(user_id, profile_data)

    # 3. profileEntriesに非構造的情報を保存
    # 読みたい本
    for book_wish in body.book_wishes:
        if book_wish.strip():  # 空文字でない場合のみ
            await firestore.save_profile_entry(
                user_id,
                {
                    "entry_type": "book_wish",
                    "content": book_wish,
                    "note": "オンボーディングで登録",
                },
            )

    # 4. オンボーディング完了フラグを設定
    await firestore.set_onboarding_completed(user_id)

    # 5. バッジを付与（badge_serviceが実装されたら有効化）
    try:
        from knowva.services.badge_service import award_badge

        badge = await award_badge(user_id, "onboarding_complete")
        if badge:
            badges_earned.append("onboarding_complete")
    except ImportError:
        # badge_serviceがまだ実装されていない場合は無視
        pass

    return OnboardingResponse(status="success", badges_earned=badges_earned)
