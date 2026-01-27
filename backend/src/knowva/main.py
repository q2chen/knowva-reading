from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from knowva.config import settings  # noqa: F401 (環境変数設定を含むため最初にimport)
from knowva.routers import mentor, moods, profile, readings, sessions, timeline

app = FastAPI(title="Knowva API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(readings.router, prefix="/api/readings", tags=["readings"])
app.include_router(sessions.router, prefix="/api/readings", tags=["sessions"])
app.include_router(moods.router, prefix="/api/readings", tags=["moods"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(mentor.router, prefix="/api/mentor", tags=["mentor"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
