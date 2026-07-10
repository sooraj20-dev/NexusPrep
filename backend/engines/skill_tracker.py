"""
Skill Tracker — updates per-session and global skill profiles
after each evaluated answer.

Global skills are persisted to skills.json (separate from sessions.json).
"""

from __future__ import annotations

import json
import os
from typing import Any

from data.skill_map import (
    ALL_SKILLS,
    compute_skill_deltas,
    apply_deltas_to_session_skills,
    get_skill_summary,
)

_SKILLS_FILE = os.path.join(os.path.dirname(__file__), "..", "skills.json")


def _load_global_skills() -> dict:
    try:
        with open(_SKILLS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {s: 50.0 for s in ALL_SKILLS}


def _save_global_skills(skills: dict) -> None:
    with open(_SKILLS_FILE, "w", encoding="utf-8") as f:
        json.dump(skills, f, indent=2)


def update_skills_after_answer(
    session: dict,
    evaluation: dict[str, Any],
    action: str = "new_topic",
) -> dict[str, float]:
    """
    Compute skill deltas from the evaluation and apply them to:
      1. session["skills"]     — per-session skill profile
      2. global skills.json   — cumulative across all sessions

    Returns the delta dict (for storing on the answer object).
    """
    score = int(evaluation.get("score", 60))
    interview_type = session.get("type", "SQL")
    answer_count = len(session.get("answers", []))

    deltas = compute_skill_deltas(interview_type, score, action)

    # --- Update session skills ---
    current_session_skills = session.get("skills", {s: 50.0 for s in ALL_SKILLS})
    updated_session_skills = apply_deltas_to_session_skills(
        current_session_skills, deltas, answer_count
    )
    session["skills"] = updated_session_skills

    # --- Update global skills ---
    global_skills = _load_global_skills()
    # Global uses a slower blend (alpha=0.1) to accumulate across sessions
    for skill in ALL_SKILLS:
        delta = deltas.get(skill, 0)
        current = global_skills.get(skill, 50.0)
        new_val = current * 0.9 + (current + delta * 10) * 0.1
        global_skills[skill] = round(max(0, min(100, new_val)), 1)
    _save_global_skills(global_skills)

    return deltas


def get_global_skill_summary() -> dict:
    """Return summary stats for the global skills profile."""
    skills = _load_global_skills()
    summary = get_skill_summary(skills)
    return {"skills": skills, **summary}


def get_session_skill_summary(session: dict) -> dict:
    """Return summary stats for a single session's skills."""
    skills = session.get("skills", {})
    summary = get_skill_summary(skills)
    return {"skills": skills, **summary}
