"""
Analytics router — skill tracking and confidence data.

Routes
------
GET  /api/analytics/skills          — global skill summary
GET  /api/analytics/skills/session  — per-session skill summary
POST /api/analytics/confidence      — store confidence snapshot
GET  /api/analytics/confidence      — retrieve confidence timeline
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from engines.skill_tracker import get_global_skill_summary, get_session_skill_summary

router = APIRouter()

_SESSION_FILE = os.path.join(os.path.dirname(__file__), "..", "sessions.json")


def _load_sessions() -> dict:
    try:
        with open(_SESSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_sessions(sessions: dict) -> None:
    with open(_SESSION_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, indent=2)


class ConfidenceSnapshot(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    timestamp: float
    score: float
    eye_contact: float
    wpm: float
    filler_count: int
    pause_count: int
    phase: str = "answering"


@router.get("/skills")
async def get_global_skills():
    """Return the aggregated global skill profile across all sessions."""
    return get_global_skill_summary()


@router.get("/skills/session")
async def get_session_skills(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None),
):
    """Return skill profile for a specific session."""
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    sessions = _load_sessions()
    session = sessions.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return get_session_skill_summary(session)


@router.post("/confidence")
async def store_confidence_snapshot(body: ConfidenceSnapshot):
    """Store a real-time confidence snapshot in the session."""
    sid = body.session_id or body.sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    sessions = _load_sessions()
    session = sessions.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if "confidence_over_time" not in session:
        session["confidence_over_time"] = []

    snapshot = {
        "t": body.timestamp,
        "score": body.score,
        "eyeContact": body.eye_contact,
        "wpm": body.wpm,
        "fillers": body.filler_count,
        "pauses": body.pause_count,
        "phase": body.phase,
    }
    session["confidence_over_time"].append(snapshot)
    # Keep last 300 snapshots (10 minutes at 2s intervals)
    session["confidence_over_time"] = session["confidence_over_time"][-300:]

    sessions[sid] = session
    _save_sessions(sessions)

    return {"stored": True, "total_snapshots": len(session["confidence_over_time"])}


@router.get("/confidence")
async def get_confidence_timeline(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None),
):
    """Return the confidence timeline for a session."""
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    sessions = _load_sessions()
    session = sessions.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    timeline = session.get("confidence_over_time", [])
    if timeline:
        avg_score = round(sum(s["score"] for s in timeline) / len(timeline), 1)
        avg_eye = round(sum(s["eyeContact"] for s in timeline) / len(timeline), 1)
    else:
        avg_score = 0
        avg_eye = 0

    return {
        "timeline": timeline,
        "average_confidence": avg_score,
        "average_eye_contact": avg_eye,
        "snapshots": len(timeline),
    }
