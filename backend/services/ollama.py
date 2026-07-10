"""
Ollama service — async wrapper around Ollama's local HTTP API.
Model: tinyllama (1.1B params, ~637 MB RAM)
"""

import json
import os
from typing import AsyncGenerator, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")


async def check_health() -> dict:
    """Check if Ollama is reachable and the model is available."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            model_available = any(m.startswith(OLLAMA_MODEL) for m in models)
            return {
                "reachable": True,
                "model": OLLAMA_MODEL,
                "model_available": model_available,
                "available_models": models,
            }
    except Exception as exc:
        return {"reachable": False, "model": OLLAMA_MODEL, "error": str(exc)}


async def generate(prompt: str, temperature: float = 0.7, max_tokens: int = 300) -> str:
    """One-shot (non-streaming) generation from Ollama."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": 0.9,
        },
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OLLAMA_HOST}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()


async def stream_generate(
    prompt: str,
    temperature: float = 0.75,
    max_tokens: int = 40,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields text chunks from Ollama's streaming API.
    Usage:
        async for chunk in stream_generate(prompt):
            ...
    """
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": 0.9,
        },
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream("POST", f"{OLLAMA_HOST}/api/generate", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    chunk = data.get("response", "")
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    continue
