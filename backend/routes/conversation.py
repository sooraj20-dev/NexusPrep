"""
Conversation router — adaptive interview decision engine.

Routes
------
POST /api/interview/decide   — get next question decision from AI engine
GET  /api/interview/conversation — return full conversation log
"""

from __future__ import annotations

import json
import os
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.decision_engine import decide_next_question

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


class DecideRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None


@router.post("/decide")
async def decide_question(body: DecideRequest):
    """
    Ask the decision engine what question to ask next.
    Returns rich metadata: action, reason, difficulty, skill, question, expected_depth, estimated_time.
    Frontend should display this metadata alongside the question.
    """
    sid = body.session_id or body.sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    sessions = _load_sessions()
    session = sessions.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if we have already asked max_questions
    questions = session.get("questions", [])
    max_questions = session.get("max_questions", 10)
    if len(questions) >= max_questions:
        raise HTTPException(status_code=400, detail="Interview is complete. No more questions can be decided.")

    practice_mode = session.get("practice_mode", False)

    try:
        decision = await decide_next_question(
            session=session,
            practice_mode=practice_mode,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Decision engine error: {exc}")

    # Track the decided question in the conversation log
    conversation = session.get("conversation", [])
    topic = decision.get("topic", decision.get("skill", ""))
    conversation.append({
        "role": "assistant",
        "content": decision["question"],
        "action": decision["action"],
        "skill": decision["skill"],
        "topic": topic,
        "difficulty": decision["difficulty"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    session["conversation"] = conversation

    # Append decided question to session["questions"] and increment index
    questions.append(decision["question"])
    session["questions"] = questions
    session["question_index"] = len(questions)

    # Track visited topics (specifically the sub-topics)
    visited_topics = session.get("visited_topics", [])
    if topic and topic not in visited_topics:
        visited_topics.append(topic)
    session["visited_topics"] = visited_topics

    # Track depth per topic
    depth_per_topic = session.get("depth_per_topic", {})
    if topic:
        depth_per_topic[topic] = depth_per_topic.get(topic, 0) + 1
    session["depth_per_topic"] = depth_per_topic

    # Update last action
    session["last_action"] = decision["action"]

    sessions[sid] = session
    _save_sessions(sessions)

    return decision


@router.get("/conversation")
async def get_conversation(
    session_id: Optional[str] = None,
    sessionId: Optional[str] = None,
):
    """Return the full conversation log for a session."""
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id required")

    sessions = _load_sessions()
    session = sessions.get(sid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "conversation": session.get("conversation", []),
        "visited_topics": session.get("visited_topics", []),
        "depth_per_topic": session.get("depth_per_topic", {}),
        "last_action": session.get("last_action"),
    }
