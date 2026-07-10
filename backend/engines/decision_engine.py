"""
Interview Decision Engine.

Receives conversation context and produces a structured decision:
  action       — follow_up | clarify | challenge | new_topic | behavioral | coding
  reason       — why this next question was chosen
  difficulty   — increase | maintain | decrease
  skill        — which skill this question targets
  question     — the actual interview question
  expected_depth — low | medium | high
  estimated_time — seconds the answer is expected to take

Fallback: if LLM fails 3 times, returns a deterministic fallback
  using the existing /ask SSE route signal.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from data.personalities import get_personality
from data.questions import get_question_bank, DIFFICULTY_INSTRUCTIONS
from services.ollama import generate

logger = logging.getLogger(__name__)

# Maximum conversation turns to send (keep prompt short for small models)
MAX_TURNS = 4
MAX_ANSWER_WORDS = 60  # truncate long answers in the prompt
MAX_RETRIES = 3


def _truncate(text: str, max_words: int = MAX_ANSWER_WORDS) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def _difficulty_instruction(modifier: int) -> str:
    if modifier > 0:
        return "The candidate is performing well. Increase difficulty — ask a more advanced question."
    if modifier < 0:
        return "The candidate is struggling. Decrease difficulty — ask a simpler clarifying question."
    return "Maintain current difficulty level."


def _build_decision_prompt(
    *,
    interview_type: str,
    difficulty: str,
    personality: str,
    conversation: list[dict],
    visited_topics: list[str],
    avg_score: float,
    question_index: int,
    max_questions: int,
    resume_summary: str = "",
    practice_mode: bool = False,
) -> str:
    """
    Build a tight prompt (<350 tokens) for qwen2.5:3b.
    Returns a prompt that instructs the LLM to output structured JSON.
    """
    _, bank = get_question_bank(interview_type)
    
    # Calculate current topic depth from conversation history
    last_topic = None
    topic_depth = 0
    for turn in reversed(conversation):
        if turn.get("role") == "assistant":
            t = turn.get("topic")
            if t:
                if last_topic is None:
                    last_topic = t
                    topic_depth = 1
                elif t == last_topic:
                    topic_depth += 1
                else:
                    break

    available_topics = [t for t in bank["topics"] if t not in visited_topics]
    if not available_topics:
        available_topics = bank["topics"]  # reset if all visited

    diff_guide = DIFFICULTY_INSTRUCTIONS.get(difficulty, DIFFICULTY_INSTRUCTIONS["Mid"])
    personality_cfg = get_personality(personality)
    tone = personality_cfg["prompt_tone"]

    # Determine difficulty modifier from avg score
    if avg_score > 85:
        diff_modifier = 1
    elif avg_score < 50:
        diff_modifier = -1
    else:
        diff_modifier = 0
    diff_instruction = _difficulty_instruction(diff_modifier)

    # Build compact conversation history (last MAX_TURNS turns)
    recent_turns = conversation[-MAX_TURNS:] if len(conversation) > MAX_TURNS else conversation
    conv_text = ""
    for turn in recent_turns:
        role = "Interviewer" if turn["role"] == "assistant" else "Candidate"
        content = _truncate(turn["content"])
        score_hint = f" [Score: {turn.get('score', '?')}/100]" if turn.get("score") else ""
        conv_text += f"{role}: {content}{score_hint}\n"

    visited_str = ", ".join(visited_topics[-5:]) if visited_topics else "None"
    
    # Enforce topic transition in the prompt if we reached max depth
    topic_instruction = ""
    if last_topic and topic_depth >= 2:
        other_topics = [t for t in available_topics if t != last_topic]
        if not other_topics:
            other_topics = bank["topics"]
        available_str = ", ".join(other_topics[:4])
        topic_instruction = (
            f"CRITICAL: You have already asked {topic_depth} questions about '{last_topic}'. "
            f"You MUST transition to a new topic now. Do NOT ask about '{last_topic}'. "
            f"Choose one of these available topics: {available_str}. "
            f"Set 'action' to 'new_topic' and set 'topic' to the chosen topic.\n"
        )
    else:
        available_str = ", ".join(available_topics[:4])

    practice_note = ""
    if practice_mode:
        practice_note = (
            'This is PRACTICE MODE. Be encouraging. If difficulty=decrease, offer a hint in the question. '
        )

    progress = f"Question {question_index} of {max_questions}."
    if question_index >= max_questions - 1:
        progress += " This is near the end — choose a strong closing question."

    resume_note = f"Resume context: {_truncate(resume_summary, 30)}\n" if resume_summary else ""

    prompt = (
        f"{bank['context']} {tone}\n"
        f"{diff_guide} {diff_instruction}\n"
        f"{resume_note}"
        f"{practice_note}"
        f"{topic_instruction}"
        f"{progress}\n"
        f"Recent conversation:\n{conv_text}\n"
        f"Topics covered: {visited_str}\n"
        f"Available topics: {available_str}\n"
        f"\n"
        f"Decide the BEST next interview move. Return ONLY this JSON (no extra text):\n"
        f'{{\n'
        f'  "action": "follow_up|clarify|challenge|new_topic|behavioral|coding",\n'
        f'  "reason": "one sentence why",\n'
        f'  "difficulty": "increase|maintain|decrease",\n'
        f'  "topic": "the specific sub-topic being discussed (must be one of the Available topics, e.g. JOINs)",\n'
        f'  "skill": "skill name (e.g. SQL, Python, Communication)",\n'
        f'  "question": "the next interview question?",\n'
        f'  "expected_depth": "low|medium|high",\n'
        f'  "estimated_time": <seconds as integer>\n'
        f'}}'
    )
    return prompt


def _parse_decision(raw: str) -> Optional[dict]:
    """Extract and validate JSON decision from LLM output."""
    match = re.search(r"\{[\s\S]*?\}", raw)
    if not match:
        return None
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return None

    # Validate required fields
    required = {"action", "reason", "difficulty", "skill", "question", "expected_depth", "estimated_time"}
    if not required.issubset(data.keys()):
        logger.warning("Decision missing fields: %s", required - data.keys())
        return None

    # Sanitize values
    valid_actions = {"follow_up", "clarify", "challenge", "new_topic", "behavioral", "coding", "technical"}
    valid_difficulties = {"increase", "maintain", "decrease"}
    valid_depths = {"low", "medium", "high"}

    data["action"] = data["action"] if data["action"] in valid_actions else "new_topic"
    data["difficulty"] = data["difficulty"] if data["difficulty"] in valid_difficulties else "maintain"
    data["expected_depth"] = data["expected_depth"] if data["expected_depth"] in valid_depths else "medium"
    data["topic"] = str(data.get("topic", "")).strip() or data.get("skill", "General")

    # Ensure question ends with ?
    question = str(data.get("question", "")).strip()
    if not question.endswith("?"):
        question = question.rstrip(".,;:") + "?"
    data["question"] = question

    # estimated_time must be int
    try:
        data["estimated_time"] = int(data["estimated_time"])
    except (ValueError, TypeError):
        data["estimated_time"] = 60

    # Clamp estimated_time
    data["estimated_time"] = max(20, min(180, data["estimated_time"]))

    return data


def _build_fallback_decision(
    interview_type: str,
    question_index: int,
    visited_topics: list[str],
) -> dict:
    """Deterministic fallback when LLM fails."""
    _, bank = get_question_bank(interview_type)
    topics = bank["topics"]
    # Pick a topic we haven't visited
    available = [t for t in topics if t not in visited_topics]
    topic = available[question_index % len(available)] if available else topics[question_index % len(topics)]
    return {
        "action": "new_topic",
        "reason": "Covering next topic in the interview plan.",
        "difficulty": "maintain",
        "skill": interview_type,
        "question": f"Can you explain your experience with {topic}?",
        "expected_depth": "medium",
        "estimated_time": 60,
        "_fallback": True,
    }


async def decide_next_question(
    *,
    session: dict,
    practice_mode: bool = False,
) -> dict:
    """
    Main entry point. Attempts LLM-based decision with up to MAX_RETRIES retries.
    Falls back to deterministic decision if LLM fails.

    Returns the full decision dict.
    """
    interview_type = session.get("type", "SQL")
    difficulty = session.get("difficulty", "Mid")
    personality = session.get("personality", "professional")
    conversation = session.get("conversation", [])
    visited_topics = session.get("visited_topics", [])
    question_index = session.get("question_index", 0)
    max_questions = session.get("max_questions", 10)
    resume_summary = (session.get("resume_text") or "")[:300]  # brief excerpt

    # Calculate avg score from recent answers
    scores = session.get("scores", [])
    recent_scores = scores[-3:] if len(scores) >= 3 else scores
    avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 65.0

    prompt = _build_decision_prompt(
        interview_type=interview_type,
        difficulty=difficulty,
        personality=personality,
        conversation=conversation,
        visited_topics=visited_topics,
        avg_score=avg_score,
        question_index=question_index,
        max_questions=max_questions,
        resume_summary=resume_summary,
        practice_mode=practice_mode,
    )

    # Calculate current topic depth from conversation history to verify post-generation
    last_topic = None
    topic_depth = 0
    for turn in reversed(conversation):
        if turn.get("role") == "assistant":
            t = turn.get("topic")
            if t:
                if last_topic is None:
                    last_topic = t
                    topic_depth = 1
                elif t == last_topic:
                    topic_depth += 1
                else:
                    break

    last_error = None
    decision = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw = await generate(prompt, temperature=0.4, max_tokens=180)
            decision = _parse_decision(raw)
            if decision:
                break
            logger.warning("[DecisionEngine] attempt=%d parse failed: %s", attempt, raw[:100])
        except Exception as exc:
            last_error = exc
            logger.warning("[DecisionEngine] attempt=%d error: %s", attempt, exc)

    # If LLM failed all retries, use fallback
    if not decision:
        logger.error("[DecisionEngine] all retries failed, using fallback. last_error=%s", last_error)
        decision = _build_fallback_decision(interview_type, question_index, visited_topics)

    # Deterministic Override: If the topic has reached a depth of >= 2, force transition to a new topic.
    if last_topic and topic_depth >= 2 and decision.get("topic") == last_topic:
        _, bank = get_question_bank(interview_type)
        available = [t for t in bank["topics"] if t not in visited_topics and t != last_topic]
        if not available:
            available = [t for t in bank["topics"] if t != last_topic]
        next_topic = available[0] if available else bank["topics"][0]
        
        decision["action"] = "new_topic"
        decision["topic"] = next_topic
        decision["question"] = f"Let's move on. Can you explain the concept of {next_topic} and how you would use it?"
        decision["reason"] = f"Forced topic rotation: '{last_topic}' reached max depth of {topic_depth}."
        logger.info("[DecisionEngine] Forced topic rotation to: %s", next_topic)

    return decision
