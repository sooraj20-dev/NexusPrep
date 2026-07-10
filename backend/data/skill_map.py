"""
Skill mapping — maps interview types and topics to skill categories.
Each evaluated answer updates specific skills by score-weighted deltas.
"""

from __future__ import annotations

# All 15 tracked skills
ALL_SKILLS = [
    "communication",
    "confidence",
    "technical_accuracy",
    "problem_solving",
    "sql",
    "python",
    "java",
    "react",
    "system_design",
    "leadership",
    "behavioral",
    "database_design",
    "api_design",
    "debugging",
    "critical_thinking",
]

# Skill recommendations for weak areas
SKILL_RECOMMENDATIONS: dict[str, str] = {
    "communication":    "Practice the STAR method in 5 behavioral interviews.",
    "confidence":       "Record yourself answering 10 questions and review your pace.",
    "technical_accuracy": "Review fundamentals with 3 technical topic interviews.",
    "problem_solving":  "Complete 5 problem-solving interviews with coding challenges.",
    "sql":              "Run 3 SQL-specific interviews focusing on JOINs and window functions.",
    "python":           "Complete 3 Python interviews covering OOP and async patterns.",
    "java":             "Practice 3 Java interviews with object-oriented design questions.",
    "react":            "Run 3 Frontend Developer interviews focusing on React state.",
    "system_design":    "Complete 5 Full-Stack interviews with system design questions.",
    "leadership":       "Complete 5 Behavioral or HR interviews focusing on team scenarios.",
    "behavioral":       "Practice 5 HR interviews using the STAR framework.",
    "database_design":  "Run 3 SQL or Full-Stack interviews covering schema design.",
    "api_design":       "Complete 3 Full-Stack or DevOps interviews on REST/GraphQL design.",
    "debugging":        "Practice 3 technical interviews with debugging-style questions.",
    "critical_thinking": "Complete 3 Senior-level interviews with trade-off questions.",
}

# Base skill deltas per interview type (applied to primary skills)
# Values are max delta at 100% score; scaled by actual score
INTERVIEW_SKILL_MAP: dict[str, dict[str, float]] = {
    "Campus Placement":     {"communication": 6, "behavioral": 5, "problem_solving": 4, "critical_thinking": 3},
    "SQL":                  {"sql": 8, "database_design": 6, "technical_accuracy": 5, "problem_solving": 3},
    "Python":               {"python": 8, "technical_accuracy": 6, "debugging": 4, "problem_solving": 3},
    "Data Science":         {"python": 5, "technical_accuracy": 7, "critical_thinking": 5, "problem_solving": 5},
    "HR":                   {"behavioral": 8, "communication": 6, "leadership": 5},
    "Frontend Developer":   {"react": 7, "technical_accuracy": 5, "debugging": 4, "api_design": 3},
    "Full-Stack Developer": {"system_design": 6, "api_design": 6, "technical_accuracy": 5, "react": 3},
    "Embedded Engineer":    {"technical_accuracy": 8, "debugging": 6, "problem_solving": 5},
    "IoT Engineer":         {"technical_accuracy": 7, "api_design": 4, "problem_solving": 5},
    "DevOps Engineer":      {"system_design": 7, "technical_accuracy": 5, "debugging": 5, "api_design": 4},
    "Mobile Developer":     {"technical_accuracy": 7, "debugging": 5, "api_design": 4},
    "Game Developer":       {"technical_accuracy": 7, "debugging": 5, "problem_solving": 5},
    "AI/ML Engineer":       {"python": 5, "technical_accuracy": 7, "critical_thinking": 6, "problem_solving": 5},
    "Cybersecurity Specialist": {"technical_accuracy": 8, "critical_thinking": 6, "problem_solving": 4},
    "Cloud Engineer":       {"system_design": 7, "technical_accuracy": 6, "api_design": 4},
    "Blockchain Developer": {"technical_accuracy": 7, "critical_thinking": 5, "system_design": 4},
    "Kerala PSC":           {"communication": 6, "critical_thinking": 5, "behavioral": 4},
}

# Always applied on every answer regardless of type
UNIVERSAL_DELTAS: dict[str, float] = {
    "communication": 2.0,   # answering in structured sentences
    "confidence":    1.5,   # attempting the question
}


def compute_skill_deltas(
    interview_type: str,
    score: int,
    action: str = "new_topic",
) -> dict[str, float]:
    """
    Compute skill delta dict for one evaluated answer.
    Deltas are scaled by score (0-100) and action type.

    action multipliers:
      follow_up / challenge → 1.3x (deeper engagement)
      clarify               → 0.8x (still learning)
      new_topic             → 1.0x (baseline)
    """
    action_multiplier = {
        "follow_up": 1.3,
        "challenge": 1.3,
        "clarify": 0.8,
        "new_topic": 1.0,
        "behavioral": 1.0,
        "technical": 1.1,
        "coding": 1.2,
    }.get(action, 1.0)

    score_factor = score / 100.0  # 0.0 - 1.0

    deltas: dict[str, float] = {}

    # Universal skills every answer contributes to
    for skill, base in UNIVERSAL_DELTAS.items():
        deltas[skill] = round(base * score_factor * action_multiplier, 2)

    # Type-specific primary skills
    type_map = INTERVIEW_SKILL_MAP.get(interview_type, {})
    for skill, base in type_map.items():
        existing = deltas.get(skill, 0)
        deltas[skill] = round(existing + base * score_factor * action_multiplier, 2)

    return deltas


def apply_deltas_to_session_skills(
    current_skills: dict[str, float],
    deltas: dict[str, float],
    answer_count: int,
) -> dict[str, float]:
    """
    Apply deltas using an exponential moving average to prevent score inflation.
    alpha = 0.3 for recent sessions, stabilizes over time.
    """
    alpha = max(0.1, 0.3 - (answer_count * 0.01))  # decays as more answers come in

    updated = dict(current_skills)
    for skill in ALL_SKILLS:
        delta = deltas.get(skill, 0)
        current = updated.get(skill, 50.0)  # start at 50 (neutral baseline)
        # EMA blend
        new_val = current * (1 - alpha) + (current + delta * 10) * alpha
        updated[skill] = round(max(0, min(100, new_val)), 1)
    return updated


def get_skill_summary(skills: dict[str, float]) -> dict:
    """Compute summary stats from a skills dict."""
    if not skills:
        return {"best": None, "weakest": None, "average": 0, "recommendations": []}

    scored = {k: v for k, v in skills.items() if k in ALL_SKILLS}
    if not scored:
        return {"best": None, "weakest": None, "average": 0, "recommendations": []}

    best_skill = max(scored, key=scored.get)
    weakest_skill = min(scored, key=scored.get)
    avg = round(sum(scored.values()) / len(scored), 1)

    recommendations = []
    # Recommend top 3 weakest skills
    sorted_skills = sorted(scored.items(), key=lambda x: x[1])
    for skill, score in sorted_skills[:3]:
        if score < 70:
            recommendations.append({
                "skill": skill,
                "score": score,
                "recommendation": SKILL_RECOMMENDATIONS.get(skill, f"Practice more {skill} interviews."),
            })

    return {
        "best": {"skill": best_skill, "score": scored[best_skill]},
        "weakest": {"skill": weakest_skill, "score": scored[weakest_skill]},
        "average": avg,
        "recommendations": recommendations,
    }
