import os

from google.cloud import firestore

from knowva.config import settings

_firestore_client: firestore.AsyncClient | None = None


def get_firestore_client() -> firestore.AsyncClient:
    global _firestore_client
    if _firestore_client is None:
        if settings.use_emulator:
            os.environ["FIRESTORE_EMULATOR_HOST"] = settings.firestore_emulator_host
        _firestore_client = firestore.AsyncClient(project=settings.google_cloud_project)
    return _firestore_client
