import os

import firebase_admin
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials

from knowva.config import settings

_firebase_app: firebase_admin.App | None = None


def _get_firebase_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        if settings.use_emulator:
            os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.firebase_auth_emulator_host
        cred = credentials.ApplicationDefault() if not settings.use_emulator else None
        _firebase_app = firebase_admin.initialize_app(
            cred, options={"projectId": settings.google_cloud_project}
        )
    return _firebase_app


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Firebase ID Tokenを検証し、ユーザー情報を返す。"""
    _get_firebase_app()
    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
        return {"uid": decoded["uid"], "email": decoded.get("email")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
