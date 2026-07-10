"""
Fraud detection service.

Two complementary strategies:
1. Deterministic score  — pure math from event weights (instant, no LLM)
2. Qwen qualitative     — qwen2.5:3b reads a SUMMARY (not raw logs) and returns
                          a risk assessment with human-readable reasoning.
"""

from __future__ import annotations

from typing import Any

from services.ollama import generate

# ── Deterministic weight table ────────────────────────────────────────────────
# Each key maps to (points_per_occurrence, max_contribution)
WEIGHTS: dict[str, tuple[int, int]] = {
    "tab_switch":          (20, 60),
    "focus_loss":          (10, 40),
    "fullscreen_exit":     (15, 30),
    "page_exit_attempt":   (25, 50),
    "no_face":             (15, 45),
    "multiple_faces":      (30, 60),
    "look_away":           (10, 30),
    "camera_disabled":     (40, 80),
    "mic_disabled":        (15, 30),
}

RISK_THRESHOLDS = {"LOW": (0, 24), "MEDIUM": (25, 59), "HIGH": (60, 9999)}


def risk_label(score: int) -> str:
    """Convert numeric score to LOW / MEDIUM / HIGH."""
    if score < 25:
        return "LOW"
    if score < 60:
        return "MEDIUM"
    return "HIGH"


def compute_deterministic_score(events: list[dict]) -> int:
    """
    Mirror of the JS deterministic scorer.
    events: list of typed FraudEvent dicts already stored on the session.
    Returns an integer 0-100+ (capped at 100 for display).
    """
    counts: dict[str, int] = {}
    for ev in events:
        t = ev.get("type", "")
        counts[t] = counts.get(t, 0) + 1

    total = 0
    for event_type, count in counts.items():
        if event_type in WEIGHTS:
            per_occ, cap = WEIGHTS[event_type]
            total += min(per_occ * count, cap)

    return min(total, 100)


def build_fraud_summary_prompt(summary: dict[str, Any]) -> str:
    """
    Build the Qwen prompt from aggregated summary counts.
    Sending summarized numbers (not raw event logs) keeps tokens low
    and gives the model a cleaner signal to reason about.
    """
    duration_min = round(summary.get("session_duration_sec", 0) / 60, 1)

    lines = [
        "You are an interview integrity analyst.",
        "Analyze the following behavioral statistics from a remote interview session "
        f"that lasted {duration_min} minutes.",
        "",
        "Behavioral Statistics:",
        f"  - Tab switches:              {summary.get('tab_switches', 0)}",
        f"  - Window focus losses:       {summary.get('focus_losses', 0)}",
        f"  - Fullscreen exits:          {summary.get('fullscreen_exits', 0)}",
        f"  - Page exit attempts:        {summary.get('page_exit_attempts', 0)}",
        f"  - No face detected (events): {summary.get('no_face_occurrences', 0)}",
        f"  - No face total duration:    {summary.get('no_face_total_sec', 0)}s",
        f"  - Multiple faces (events):   {summary.get('multiple_faces_occurrences', 0)}",
        f"  - Looking away (events):     {summary.get('look_away_occurrences', 0)}",
        f"  - Looking away total:        {summary.get('look_away_total_sec', 0)}s",
        f"  - Camera disabled:           {'Yes' if summary.get('camera_disabled') else 'No'}",
        f"  - Mic disabled:              {'Yes' if summary.get('mic_disabled') else 'No'}",
        f"  - Deterministic risk score:  {summary.get('deterministic_score', 0)}/100",
        "",
        'Respond ONLY with valid JSON in this exact format:',
        '{"risk":"LOW"|"MEDIUM"|"HIGH","reason":"one sentence","suggestions":["tip1","tip2"]}',
    ]
    return "\n".join(lines)


async def analyze_fraud(summary: dict[str, Any]) -> dict[str, Any]:
    """
    Call qwen2.5:3b with a summarized fraud payload.
    Falls back to deterministic-only result if Qwen is unavailable.
    """
    import json, re

    det_score = summary.get("deterministic_score", 0)
    fallback = {
        "risk": risk_label(det_score),
        "reason": "Automated score based on behavioral event counts.",
        "suggestions": [
            "Stay focused on the interview window at all times.",
            "Ensure your face is clearly visible throughout the session.",
        ],
    }

    prompt = build_fraud_summary_prompt(summary)
    try:
        raw = await generate(prompt, temperature=0.2, max_tokens=200)
        match = re.search(r"\{[\s\S]*?\}", raw)
        if match:
            parsed = json.loads(match.group())
            # Validate required keys
            if all(k in parsed for k in ("risk", "reason", "suggestions")):
                return parsed
    except Exception:
        pass

    return fallback
