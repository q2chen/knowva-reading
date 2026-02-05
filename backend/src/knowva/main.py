from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from knowva.config import settings  # noqa: F401 (環境変数設定を含むため最初にimport)
from knowva.middleware.rate_limit import limiter
from knowva.routers import (
    badges,
    books,
    mentor,
    moods,
    onboarding,
    profile,
    readings,
    reports,
    sessions,
    speech,
    timeline,
)

app = FastAPI(title="Knowva API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(badges.router, prefix="/api/badges", tags=["badges"])
app.include_router(books.router, prefix="/api/books", tags=["books"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(readings.router, prefix="/api/readings", tags=["readings"])
app.include_router(sessions.router, prefix="/api/readings", tags=["sessions"])
app.include_router(moods.router, prefix="/api/readings", tags=["moods"])
app.include_router(reports.router, prefix="/api/readings", tags=["reports"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(mentor.router, prefix="/api/mentor", tags=["mentor"])
app.include_router(timeline.router, prefix="/api/timeline", tags=["timeline"])
app.include_router(speech.router, prefix="/api", tags=["speech"])


@app.get("/api/health")
@limiter.exempt
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
