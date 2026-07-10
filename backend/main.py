"""
FastAPI entry point for the AI Interview Coach backend.

Endpoints
---------
GET  /api/health
POST /api/interview/start
GET  /api/interview/ask        (SSE stream)
POST /api/interview/evaluate
GET  /api/interview/session
POST /api/interview/decide     (v2 — adaptive decision engine)
GET  /api/interview/conversation (v2)
GET  /api/analytics/skills     (v2)
GET  /api/analytics/skills/session (v2)
POST /api/analytics/confidence (v2)
GET  /api/analytics/confidence (v2)
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.health import router as health_router
from routes.interview import router as interview_router
from routes.fraud import router as fraud_router
from routes.conversation import router as conversation_router
from routes.analytics import router as analytics_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    port = os.getenv("PORT", "8000")
    model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    print(f"\n[AI Interview Backend v2] Running on http://localhost:{port}")
    print(f"[Ollama] host: {host}")
    print(f"[Model ] {model}")
    print(f"\n[OK] Health:      http://localhost:{port}/api/health")
    print(f"[OK] Docs:        http://localhost:{port}/docs")
    print(f"[OK] v2 Decision: http://localhost:{port}/api/interview/decide")
    print(f"[OK] v2 Skills:   http://localhost:{port}/api/analytics/skills\n")
    yield


app = FastAPI(
    title="AI Interview Coach API v2",
    description="Local-first interview backend powered by Ollama. v2 adds adaptive conversation, skill tracking, and confidence analytics.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cache-Control"],
    expose_headers=["Content-Type"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(health_router, prefix="/api")
app.include_router(interview_router, prefix="/api/interview")
app.include_router(fraud_router, prefix="/api/fraud")
app.include_router(conversation_router, prefix="/api/interview")  # shares /api/interview prefix
app.include_router(analytics_router, prefix="/api/analytics")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
