import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.ratelimit import limiter
from app.routes import (
    ai, auth, drive, files, folders, links, search, shares, stars, trash,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cloudbase")

app = FastAPI(title="Cloud Storage Service")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Browser Origin headers never carry a trailing slash; normalize so a
# CORS_ORIGINS value like "https://app.vercel.app/" still matches.
_origins = [o.strip().rstrip("/") for o in get_settings().cors_origins.split(",")
            if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path,
                response.status_code, elapsed)
    return response


app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(trash.router)
app.include_router(search.router)
app.include_router(drive.router)
app.include_router(shares.router)
app.include_router(links.router)
app.include_router(stars.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    """Diagnostic: verify the DB connection and classify failures (no secrets)."""
    from sqlalchemy import text

    from app.core.db import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("select 1"))
        return {"db": "ok"}
    except Exception as exc:
        low = str(exc).lower()
        if "network is unreachable" in low or "could not translate host" in low:
            hint = ("cannot reach DB host — likely the IPv6-only direct host; "
                    "use the Supabase Session pooler URL for DATABASE_URL")
        elif "password authentication failed" in low:
            hint = "wrong DB password in DATABASE_URL"
        elif "tenant or user not found" in low or "not found" in low:
            hint = "wrong pooler user/region in DATABASE_URL"
        elif "timeout" in low or "timed out" in low:
            hint = "connection timed out — check host/port"
        else:
            hint = "unclassified DB error"
        return JSONResponse(status_code=503,
                            content={"db": "error",
                                     "type": type(exc).__name__, "hint": hint})
