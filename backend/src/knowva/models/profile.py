from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserProfile(BaseModel):
    life_stage: Optional[str] = None
    situation: Optional[str] = None
    challenges: list[str] = []
    values: list[str] = []
    reading_motivation: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    current_profile: UserProfile = UserProfile()
    created_at: Optional[datetime] = None
