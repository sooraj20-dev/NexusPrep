"""
Health check router — tests Ollama connectivity.
GET /api/health
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from services.ollama import check_health

router = APIRouter()


@router.get("/health")
async def health():
    ollama = await check_health()
    return {
        "status": "ok",
        "model": ollama["model"],
        "ollama": ollama["reachable"],
        "model_available": ollama.get("model_available", False),
        "available_models": ollama.get("available_models", []),
        "error": ollama.get("error"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
