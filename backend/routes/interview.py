"""
Interview router — session management, AI question streaming, answer evaluation.

Routes
------
POST /api/interview/start      → create session
GET  /api/interview/ask        → SSE stream next question
POST /api/interview/evaluate   → evaluate candidate's answer
GET  /api/interview/session    → fetch full session summary
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Response, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from data.questions import build_evaluation_prompt, build_question_prompt, sanitize_question
from services.ollama import generate, stream_generate
from services.tts import generate_speech

router = APIRouter()

# ── File-backed session store ────────────────────────────────
_SESSION_FILE = os.path.join(os.path.dirname(__file__), "..", "sessions.json")


def _load_sessions() -> dict:
    """Load sessions from disk; return empty dict if file missing or corrupt."""
    try:
        with open(_SESSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_sessions(sessions: dict) -> None:
    """Persist sessions dict to disk."""
    with open(_SESSION_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, indent=2)


_sessions: dict[str, dict] = _load_sessions()


# ── Request models ───────────────────────────────────────────

class StartRequest(BaseModel):
    type: str = "SQL"
    difficulty: str = "Mid"
    duration: str = "30 mins"
    resumeText: Optional[str] = None
    resume_text: Optional[str] = None
    personality: Optional[str] = "professional"
    practiceMode: Optional[bool] = False
    practice_mode: Optional[bool] = False


class EvaluateRequest(BaseModel):
    session_id: Optional[str] = None
    sessionId: Optional[str] = None
    answer: str
    voice_metrics: Optional[dict] = None
    voiceMetrics: Optional[dict] = None


# ── Helpers ──────────────────────────────────────────────────

def _max_questions(duration: str) -> int:
    return 5 if duration == "15 mins" else 15 if duration == "45 mins" else 10


def _get_session(session_id: str) -> dict:
    global _sessions
    _sessions = _load_sessions()
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Start a new session first.")
    return session


def _clean_question(text: str) -> str:
    """Strip numbering, leading punctuation, and surrounding quotes."""
    text = re.sub(r'^[\d\.\-\s"\']+', "", text)
    text = text.strip('"\'')
    return text.strip()


# ── Routes ───────────────────────────────────────────────────

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content = await file.read()
    
    if filename.endswith(".txt"):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
    elif filename.endswith(".pdf"):
        try:
            import io
            from pypdf import PdfReader
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .txt or .pdf file.")
        
    return {"text": text}


@router.post("/start")
async def start_session(body: StartRequest):
    session_id = str(uuid.uuid4())
    max_q = _max_questions(body.duration)
    pm = body.practiceMode or body.practice_mode or False

    # Initialize v2 skills to baseline 50
    from data.skill_map import ALL_SKILLS
    initial_skills = {s: 50.0 for s in ALL_SKILLS}

    global _sessions
    _sessions = _load_sessions()
    _sessions[session_id] = {
        "id": session_id,
        "type": body.type,
        "difficulty": body.difficulty,
        "duration": body.duration,
        "max_questions": max_q,
        "question_index": 0,
        "questions": [],
        "answers": [],
        "scores": [],
        "resume_text": body.resumeText or body.resume_text or "",
        "started_at": datetime.now(timezone.utc).isoformat(),
        # ── v2 additions ──────────────────────────────────────
        "personality": body.personality or "professional",
        "practice_mode": pm,
        "conversation": [],
        "visited_topics": [],
        "depth_per_topic": {},
        "skills": initial_skills,
        "confidence_over_time": [],
        # ── Fraud detection fields ────────────────────────────
        "fraud_events": [],
        "fraud_score": 0,
        "fraud_risk": "LOW",
        "fraud_report": None,
    }
    _save_sessions(_sessions)

    return {
        "session_id": session_id,
        "sessionId": session_id,
        "type": body.type,
        "difficulty": body.difficulty,
        "duration": body.duration,
        "max_questions": max_q,
        "maxQuestions": max_q,
        "message": "Session started. Call /ask to get the first question.",
    }


@router.get("/ask")
async def ask_question(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None)
):
    """
    Stream the next interview question via Server-Sent Events.
    Emits: meta | chunk | done | error events.
    """
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id or sessionId query parameter is required")
    session = _get_session(sid)

    if session["question_index"] >= session["max_questions"]:
        raise HTTPException(status_code=400, detail="Interview complete. No more questions.")

    async def event_stream():
        # Send meta first
        meta = {
            "question_index": session["question_index"],
            "questionIndex": session["question_index"],
            "max_questions": session["max_questions"],
            "maxQuestions": session["max_questions"],
            "type": session["type"],
            "difficulty": session["difficulty"],
        }
        yield f"event: meta\ndata: {json.dumps(meta)}\n\n"

        prompt = build_question_prompt(
            interview_type=session["type"],
            difficulty=session["difficulty"],
            question_index=session["question_index"],
            previous_questions=session["questions"],
            resume_text=session.get("resume_text", ""),
        )

        full_question = ""
        try:
            async for chunk in stream_generate(prompt, temperature=0.7, max_tokens=60):
                full_question += chunk
                yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"

            # Clean and hard-sanitize the completed question
            full_question = sanitize_question(_clean_question(full_question))
            session["questions"].append(full_question)
            qi = session["question_index"]
            session["question_index"] += 1
            _save_sessions(_sessions)

            done_payload = {
                "question": full_question,
                "question_index": qi,
                "questionIndex": qi,
            }
            yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"

        except Exception as exc:
            error_payload = {"message": str(exc)}
            yield f"event: error\ndata: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.post("/evaluate")
async def evaluate_answer(body: EvaluateRequest):
    sid = body.session_id or body.sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id is required")
    session = _get_session(sid)

    if not session["questions"]:
        raise HTTPException(status_code=400, detail="No question has been asked yet.")

    answer = body.answer.strip()
    if len(answer) < 3:
        raise HTTPException(status_code=400, detail="Answer is too short to evaluate.")

    vm = body.voice_metrics or body.voiceMetrics or None

    last_question = session["questions"][-1]
    prompt = build_evaluation_prompt(
        interview_type=session["type"],
        difficulty=session["difficulty"],
        question=last_question,
        answer=answer,
        voice_metrics=vm,
        practice_mode=session.get("practice_mode", False),
    )

    try:
        raw = await generate(prompt, temperature=0.3, max_tokens=300)

        # Extract JSON block from model output
        match = re.search(r"\{[\s\S]*\}", raw)
        evaluation = json.loads(match.group()) if match else None
    except Exception:
        evaluation = None

    if not evaluation:
        evaluation = {
            "score": 60,
            "grade": "Fair",
            "strengths": "You provided a response to the question.",
            "improvements": "Try to be more specific and structured in your answer.",
            "tip": "Use the STAR method: Situation, Task, Action, Result.",
        }

    # Clamp score to 0–100
    evaluation["score"] = max(0, min(100, int(evaluation.get("score", 60))))

    # Ensure verbal_feedback is present
    if "verbal_feedback" not in evaluation:
        score = evaluation["score"]
        if score >= 80:
            evaluation["verbal_feedback"] = "That's correct! Excellent explanation."
        elif score >= 60:
            evaluation["verbal_feedback"] = "Good points. Let's move forward."
        else:
            evaluation["verbal_feedback"] = "Interesting approach. Let's proceed to the next topic."

    # ── v2: Update conversation log ───────────────────────────
    conversation = session.get("conversation", [])
    conversation.append({
        "role": "user",
        "content": answer,
        "score": evaluation["score"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    session["conversation"] = conversation

    # ── v2: Update skills ─────────────────────────────────────
    from engines.skill_tracker import update_skills_after_answer
    last_action = session.get("last_action", "new_topic")
    skill_deltas = update_skills_after_answer(session, evaluation, last_action)

    # Persist to memory and disk
    session["answers"].append({
        "question": last_question,
        "answer": answer,
        "evaluation": evaluation,
        "skill_deltas": skill_deltas,
    })
    session["scores"].append(evaluation["score"])
    _save_sessions(_sessions)

    avg = round(sum(session["scores"]) / len(session["scores"]))

    return {
        "evaluation": evaluation,
        "question_index": session["question_index"] - 1,
        "questionIndex": session["question_index"] - 1,
        "total_answered": len(session["answers"]),
        "totalAnswered": len(session["answers"]),
        "average_score": avg,
        "averageScore": avg,
        "skills": session.get("skills"),
        "skill_deltas": skill_deltas,
    }


@router.get("/session")
async def get_session(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None)
):
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id or sessionId query parameter is required")
    session = _get_session(sid)
    scores = session["scores"]
    avg = round(sum(scores) / len(scores)) if scores else 0
    return {
        **session,
        "average_score": avg,
        "averageScore": avg,
        "sessionId": session["id"],
        "maxQuestions": session["max_questions"],
        "questionIndex": session["question_index"],
        "fraudScore": session.get("fraud_score", 0),
        "fraudRisk": session.get("fraud_risk", "LOW"),
        "fraudReport": session.get("fraud_report"),
        "fraudEventCount": len(session.get("fraud_events", [])),
    }


@router.get("/sessions")
async def get_all_sessions():
    """Retrieve all saved interview sessions, sorted by start time descending.
    Terminated (fraud-ejected) sessions are excluded from history.
    """
    sessions_data = _load_sessions()
    result = []
    for s in sessions_data.values():
        # Skip sessions that were fraud-terminated
        if s.get("terminated"):
            continue
        # Only include completed interviews (where user answered all questions)
        if len(s.get("answers", [])) < s.get("max_questions", 10):
            continue
        scores = s.get("scores", [])
        avg = round(sum(scores) / len(scores)) if scores else 0
        result.append({
            **s,
            "average_score": avg,
            "averageScore": avg,
            "sessionId": s["id"],
            "maxQuestions": s["max_questions"],
            "questionIndex": s["question_index"],
        })
    result.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    return result


@router.delete("/session")
async def delete_session(
    session_id: Optional[str] = Query(None),
    sessionId: Optional[str] = Query(None)
):
    sid = session_id or sessionId
    if not sid:
        raise HTTPException(status_code=400, detail="session_id or sessionId query parameter is required")
    
    global _sessions
    _sessions = _load_sessions()
    if sid in _sessions:
        # Mark terminated first — safety net so history hides it even if
        # something writes it back to disk between now and the actual delete.
        _sessions[sid]["terminated"] = True
        _save_sessions(_sessions)
        # Now fully remove
        del _sessions[sid]
        _save_sessions(_sessions)
        return {"success": True, "message": "Session deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")


class SuggestRequest(BaseModel):
    question: str
    answer: str
    strengths: Optional[str] = ""
    improvements: Optional[str] = ""
    type: Optional[str] = "General"
    difficulty: Optional[str] = "Mid"

@router.post("/suggest-answer")
async def suggest_answer(body: SuggestRequest):
    prompt = (
        f"You are an expert interviewer and coach. A candidate was asked this question in a {body.difficulty}-level {body.type} interview:\n"
        f'"{body.question}"\n\n'
        f"The candidate's answer was:\n"
        f'"{body.answer}"\n\n'
        f"Feedback on candidate's answer:\n"
        f"- Strengths: {body.strengths}\n"
        f"- Improvements: {body.improvements}\n\n"
        f"Based on this feedback and the question, provide a model 'perfect' response (1-2 paragraphs max) that the candidate should have given. "
        f"Write the response directly in first-person as if you are the candidate answering the interviewer. "
        f"Do not include any extra text, introductory phrases (like 'Here is a model answer'), or quotes. Just write the answer itself."
    )
    try:
        suggested = await generate(prompt, temperature=0.7, max_tokens=250)
        return {"suggested_answer": suggested.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggested answer: {str(e)}")

@router.get("/speak")
async def speak(text: str = Query(...)):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        audio_bytes = generate_speech(text)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")
