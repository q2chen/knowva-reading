"""バッジ関連のAPIエンドポイント"""

from fastapi import APIRouter, Depends

from knowva.data.badges import get_all_badge_definitions
from knowva.middleware.firebase_auth import get_current_user
from knowva.models.badge import BadgeCheckResponse, BadgeDefinition, UserBadge
from knowva.services import badge_service

router = APIRouter()


@router.get("", response_model=list[BadgeDefinition])
async def list_badge_definitions():
    """全バッジ定義を取得する。"""
    return get_all_badge_definitions()


@router.get("/user", response_model=list[UserBadge])
async def list_user_badges(user: dict = Depends(get_current_user)):
    """ユーザーの獲得バッジ一覧を取得する。"""
    badges = await badge_service.list_user_badges(user["uid"])
    return badges


@router.post("/check", response_model=BadgeCheckResponse)
async def check_and_award_badges(user: dict = Depends(get_current_user)):
    """バッジ獲得条件をチェックし、新規獲得バッジがあれば付与して返す。"""
    user_id = user["uid"]

    # 全カテゴリのバッジをチェック
    new_badges = await badge_service.check_and_award_all_badges(user_id)

    # 全獲得バッジを取得
    all_badges = await badge_service.list_user_badges(user_id)

    return BadgeCheckResponse(new_badges=new_badges, all_badges=all_badges)
