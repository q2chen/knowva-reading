"""オンボーディング関連のデータモデル"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OnboardingSubmit(BaseModel):
    """オンボーディング回答"""

    nickname: Optional[str] = None  # ニックネーム（スキップ可）
    life_stage: Optional[str] = None  # ライフステージ（選択式、スキップ可）
    situation: Optional[str] = None  # 現在の状況（自由記述、任意）
    challenges: list[str] = []  # 課題・悩み（複数選択 + 自由入力）
    values: list[str] = []  # 大切にしていること（複数選択）
    reading_motivations: list[str] = []  # 読書の目的（複数選択）
    interests: list[str] = []  # 興味のあるジャンル（複数選択）
    book_wishes: list[str] = []  # 読みたい本（任意、自由入力）


class OnboardingStatus(BaseModel):
    """オンボーディング状態"""

    completed: bool
    completed_at: Optional[datetime] = None


class OnboardingResponse(BaseModel):
    """オンボーディング完了レスポンス"""

    status: str  # "success"
    badges_earned: list[str] = []  # 獲得したバッジID
