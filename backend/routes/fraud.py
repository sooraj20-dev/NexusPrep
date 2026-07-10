"""
Fraud detection router.

Routes
------
POST /api/fraud/log      — append typed events, recalculate deterministic score
POST /api/fraud/analyze  — run Qwen analysis on summarized counts
GET  /api/fraud/report   — return stored fraud report for a session
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.fraud import analyze_fraud, compute_deterministic_score, risk_label

router = APIRouter()

# ── Shared session store (same file as interview router) ──────────────────────
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


def _get_session(session_id: str) -> tuple[dict, dict]:
    sessions = _load_sessions()
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session, sessions


# ── Request models ────────────────────────────────────────────────────────────

class FraudEvent(BaseModel):
    """A single structured fraud event from the frontend."""
    id: str
    type: str           # tab_switch | focus_loss | no_face | multiple_faces | ...
    timestamp: str      # ISO-8601 string
    severity: str       # low | medium | high
    durationMs: Optional[int] = 0
    metadata: Optional[dict] = {}


class LogRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    events: list[FraudEvent]


class AnalyzeRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    # Aggregated summary counts (not raw events)
    session_duration_sec: int = 0
    tab_switches: int = 0
    focus_losses: int = 0
    fullscreen_exits: int = 0
    page_exit_attempts: int = 0
    no_face_occurrences: int = 0
    no_face_total_sec: int = 0
    multiple_faces_occurrences: int = 0
    look_away_occurrences: int = 0
    look_away_total_sec: int = 0
    camera_disabled: bool = False
    mic_disabled: bool = False
    deterministic_score: int = 0


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/log")
async def log_fraud_events(body: LogRequest):
    """
    Append typed fraud events to the session and recalculate deterministic score.
    Called periodically by the frontend (every 30s and on session end).
    """
    sid = body.session_id or body.sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    session, sessions = _get_session(sid)

    # Ensure fraud list exists (backwards-compat with older sessions)
    if "fraud_events" not in session:
        session["fraud_events"] = []

    # Append new events (deduplicate by id)
    existing_ids = {e.get("id") for e in session["fraud_events"]}
    new_events = [e.dict() for e in body.events if e.id not in existing_ids]
    session["fraud_events"].extend(new_events)

    # Recalculate deterministic score from full event history
    session["fraud_score"] = compute_deterministic_score(session["fraud_events"])
    session["fraud_risk"] = risk_label(session["fraud_score"])
    session["fraud_updated_at"] = datetime.now(timezone.utc).isoformat()

    sessions[sid] = session
    _save_sessions(sessions)

    return {
        "logged": len(new_events),
        "total_events": len(session["fraud_events"]),
        "fraud_score": session["fraud_score"],
        "fraud_risk": session["fraud_risk"],
    }


@router.post("/analyze")
async def analyze_session_fraud(body: AnalyzeRequest):
    """
    Run Qwen qualitative analysis on aggregated summary counts.
    Stores result in the session. Returns { risk, reason, suggestions, score }.
    """
    sid = body.session_id or body.sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    session, sessions = _get_session(sid)

    summary = body.dict(exclude={"session_id", "sessionId"})
    result = await analyze_fraud(summary)

    session["fraud_report"] = {
        **result,
        "deterministic_score": body.deterministic_score,
        "summary": summary,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }
    session["fraud_score"] = body.deterministic_score
    session["fraud_risk"] = result.get("risk", risk_label(body.deterministic_score))

    sessions[sid] = session
    _save_sessions(sessions)

    return {
        "risk": result["risk"],
        "reason": result["reason"],
        "suggestions": result.get("suggestions", []),
        "deterministic_score": body.deterministic_score,
    }


@router.get("/report")
async def get_fraud_report(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None),
):
    """Return the stored fraud report for a session."""
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    session, _ = _get_session(sid)
    return {
        "fraud_score": session.get("fraud_score", 0),
        "fraud_risk": session.get("fraud_risk", "LOW"),
        "fraud_report": session.get("fraud_report"),
        "fraud_events": session.get("fraud_events", []),
        "total_events": len(session.get("fraud_events", [])),
    }
