"""
Interview question banks and prompt builders.
Provides domain-specific context for each interview type and difficulty.
"""

import re
from typing import List, Tuple

QUESTION_BANKS = {

    "Campus Placement": {
        "topics": [
            "self introduction", "aptitude and reasoning",
            "communication skills", "technical fundamentals",
            "projects and internships", "problem solving",
            "teamwork and collaboration", "leadership potential",
            "HR questions", "career aspirations",
        ],
        "context": (
            "You are a campus placement interviewer conducting a "
            "realistic placement interview for fresh graduates. "
            "The interview should include aptitude, technical, "
            "project-based, communication, and HR rounds."
        ),
    },
    "Communication Skills": {
    "topics": [
        "introducing yourself",
        "greetings and polite expressions",
        "family members",
        "school and college",
        "friends",
        "daily routine",
        "hobbies and interests",
        "favorite food",
        "colors and numbers",
        "days, months, and time",
        "weather",
        "shopping",
        "travel and transportation",
        "asking for directions",
        "home and rooms",
        "clothes",
        "animals",
        "fruits and vegetables",
        "health and body",
        "festivals in India",
        "simple phone conversations",
        "ordering food",
        "asking and answering simple questions",
        "making plans",
        "telling a short story",
        "describing people",
        "describing places",
        "describing pictures",
        "yes/no questions",
        "wh- questions (what, where, when, why, who, how)",
        "common verbs",
        "simple tenses (present, past, future)",
        "daily conversations",
        "common mistakes in spoken English",
        "confidence in speaking"
    ],
    "context": (
        "You are a friendly English communication teacher helping beginners "
        "from India improve spoken English. Use very simple words, short "
        "sentences, and easy grammar. Ask one question at a time. Correct "
        "mistakes gently, explain them simply, and encourage the learner. "
        "Focus on real-life conversations instead of difficult grammar."
    ),
},
    "SQL": {
        "topics": [
            "SELECT queries", "JOINs", "GROUP BY and aggregates", "subqueries",
            "window functions", "indexing", "query optimization", "NULL handling",
        ],
        "context": (
            "You are an experienced data engineering interviewer "
            "specializing in SQL and relational databases."
        ),
    },

    "Python": {
        "topics": [
            "data structures", "list comprehensions", "OOP concepts", "decorators",
            "generators", "error handling", "pandas / NumPy", "async/await",
        ],
        "context": (
            "You are a senior Python engineer interviewing a candidate "
            "for a backend or data engineering role."
        ),
    },

    "Data Science": {
        "topics": [
            "machine learning fundamentals", "model evaluation metrics",
            "feature engineering", "overfitting/underfitting", "statistics",
            "hypothesis testing", "neural networks", "model deployment",
        ],
        "context": (
            "You are a lead data scientist conducting a technical interview "
            "for a data science position."
        ),
    },

    "HR": {
        "topics": [
            "teamwork and collaboration", "conflict resolution", "career goals",
            "strengths and weaknesses", "time management", "leadership experience",
            "handling failure", "motivation",
        ],
        "context": (
            "You are an HR professional conducting a behavioral interview "
            "using the STAR method."
        ),
    },

    "Frontend-Developer": {
        "topics": [
            "HTML5", "CSS3", "JavaScript", "DOM manipulation",
            "React fundamentals", "state management", "responsive design",
            "REST APIs", "performance optimization", "accessibility",
        ],
        "context": (
            "You are a senior frontend engineer interviewing a candidate "
            "for a frontend web development role."
        ),
    },

    "Full-Stack Developer": {
        "topics": [
            "frontend architecture", "React", "Node.js", "Express.js",
            "MongoDB", "SQL databases", "authentication and authorization",
            "REST APIs", "system design", "deployment strategies",
        ],
        "context": (
            "You are a senior full-stack engineer conducting a technical "
            "interview covering both frontend and backend development."
        ),
    },

    "Embedded Engineer": {
        "topics": [
            "C programming", "microcontrollers", "memory management",
            "interrupts", "UART/SPI/I2C", "RTOS concepts",
            "embedded debugging", "timers and PWM",
            "power optimization", "firmware architecture",
        ],
        "context": (
            "You are a senior embedded systems engineer interviewing a "
            "candidate for firmware and embedded development roles."
        ),
    },

    "IoT Engineer": {
        "topics": [
            "ESP32 development", "sensor integration", "MQTT protocol",
            "WiFi and Bluetooth communication", "cloud connectivity",
            "IoT security", "data logging", "edge computing",
            "embedded C", "IoT architecture",
        ],
        "context": (
            "You are an IoT solutions architect conducting a technical "
            "interview for an IoT engineering position."
        ),
    },

    "DevOps Engineer": {
        "topics": [
            "Linux administration", "Docker containers", "Kubernetes",
            "CI/CD pipelines", "Git workflows", "Jenkins",
            "Infrastructure as Code", "monitoring and logging",
            "networking fundamentals", "cloud deployments",
        ],
        "context": (
            "You are a DevOps lead interviewing a candidate for a "
            "DevOps and infrastructure engineering role."
        ),
    },

    "Mobile Developer": {
        "topics": [
            "Android development", "Flutter", "React Native",
            "state management", "REST API integration",
            "local storage", "mobile architecture",
            "performance optimization", "app deployment",
            "UI/UX principles",
        ],
        "context": (
            "You are a senior mobile application developer conducting "
            "a technical interview."
        ),
    },

    "Game Developer": {
        "topics": [
            "game loops", "Unity", "Unreal Engine",
            "physics systems", "collision detection",
            "optimization techniques", "3D mathematics",
            "rendering pipelines", "multiplayer networking",
            "game architecture",
        ],
        "context": (
            "You are a senior game developer interviewing a candidate "
            "for a game development role."
        ),
    },

    "AI/ML Engineer": {
        "topics": [
            "machine learning algorithms", "deep learning",
            "neural networks", "LLMs and generative AI",
            "feature engineering", "model evaluation",
            "TensorFlow/PyTorch", "MLOps",
            "prompt engineering", "model deployment",
        ],
        "context": (
            "You are a senior AI/ML engineer conducting a technical "
            "interview for an artificial intelligence role."
        ),
    },

    "Cybersecurity Specialist": {
        "topics": [
            "network security", "OWASP Top 10",
            "authentication mechanisms", "encryption",
            "penetration testing", "vulnerability assessment",
            "incident response", "security monitoring",
            "secure coding practices", "risk management",
        ],
        "context": (
            "You are a cybersecurity expert interviewing a candidate "
            "for a security analyst or cybersecurity role."
        ),
    },

    "Cloud Engineer": {
        "topics": [
            "AWS services", "Azure fundamentals",
            "Google Cloud Platform", "networking",
            "load balancing", "containers and Kubernetes",
            "serverless computing", "IAM and security",
            "monitoring", "cost optimization",
        ],
        "context": (
            "You are a cloud solutions architect conducting a "
            "technical interview for a cloud engineering position."
        ),
    },

    "Blockchain Developer": {
        "topics": [
            "blockchain fundamentals", "Ethereum",
            "Solidity programming", "smart contracts",
            "consensus mechanisms", "Web3",
            "gas optimization", "security vulnerabilities",
            "DeFi concepts", "token standards",
        ],
        "context": (
            "You are a blockchain architect interviewing a candidate "
            "for a blockchain development role."
        ),
    },

    "Kerala PSC": {
        "topics": [
            "Kerala history", "Indian constitution",
            "current affairs", "geography",
            "general science", "reasoning",
            "quantitative aptitude", "Kerala renaissance",
            "computer knowledge", "Malayalam language",
        ],
        "context": (
            "You are a Kerala PSC examiner conducting a mock "
            "competitive examination and interview."
        ),
    },

}

DIFFICULTY_INSTRUCTIONS = {
    "Junior": "Ask beginner-level questions. Keep concepts foundational.",
    "Mid": "Ask intermediate-level questions requiring solid practical understanding.",
    "Senior": "Ask advanced questions requiring deep expertise and trade-off thinking.",
}

MAX_QUESTION_WORDS = 15


def get_question_bank(interview_type: str) -> Tuple[str, dict]:
    """
    Robust question bank resolver. Normalizes hyphens, spaces, and case
    to match the closest bank key, falling back to "SQL" if not found.
    """
    normalized = interview_type.lower().replace("-", " ").strip()
    for key, bank in QUESTION_BANKS.items():
        if key.lower().replace("-", " ").strip() == normalized:
            return key, bank
    return "SQL", QUESTION_BANKS["SQL"]


def build_question_prompt(
    interview_type: str,
    difficulty: str,
    question_index: int,
    previous_questions: List[str],
    resume_text: str = "",
) -> str:
    actual_type, bank = get_question_bank(interview_type)
    topics = bank["topics"]
    # Select a specific topic based on the question index to ensure targeted questions
    topic = topics[question_index % len(topics)]
    diff_guide = DIFFICULTY_INSTRUCTIONS.get(difficulty, DIFFICULTY_INSTRUCTIONS["Mid"])

    resume_guide = ""
    if resume_text:
        resume_guide = (
            f"Candidate Profile & Resume Context:\n"
            f"\"\"\"\n{resume_text}\n\"\"\"\n"
            f"CRITICAL: Tailor the question specifically to the candidate's background by referencing "
            f"their personal details, educational qualifications, projects, or certifications listed in the resume "
            f"whenever relevant to the topic. Prefer asking questions calibrated to their resume over generic ones.\n"
        )

    prev_note = (
        ""
        if not previous_questions
        else "Do not repeat: {}.\n".format("; ".join(previous_questions))
    )

    # Keep prompt short — large structured prompts cause small models to echo
    # back the prompt instead of generating a question.
    return (
        f"{bank['context']}\n"
        f"{diff_guide}\n"
        f"{resume_guide}"
        f"{prev_note}"
        f"Write ONE {actual_type} interview question (#{question_index + 1}) specifically about {topic}.\n"
        f"The question must be max {MAX_QUESTION_WORDS} words and end with '?'. "
        "Output only the question — no answer, no explanation, no numbering.\n\n"
        "Question:"
    )


def sanitize_question(raw_output: str, max_words: int = MAX_QUESTION_WORDS) -> str:
    """
    Hard enforcement layer — strip prompt echo and extract only the question.

    Handles failure modes observed with small/medium models:
      (a) Prompt echo  — model repeats sections of the prompt verbatim.
      (b) Double questions — "What is X? How does it work?"
      (c) Labelled output — "Question: What is X?"
    """
    text = raw_output.strip().strip('"\'').strip()

    # ── Strip echoed prompt lines ────────────────────────────
    _ECHO = re.compile(
        r"^("
        r"question\s*(number|#|\d+)|"
        r"available\s*topics?|"
        r"previously\s*asked|"
        r"critical\s*rules?|"
        r"interview[\s\-]*(type|specific)|"
        r"difficulty[\s:]+|"
        r"do\s+not\s+(repeat|generate|include|ask)|"
        r"output\s+only|"
        r"return\s+only|"
        r"topics?\s*:|"
        r"your\s+only\s+task|"
        r"write\s+one|"
        r"\*\s+"
        r")",
        re.IGNORECASE,
    )

    clean_lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not _ECHO.match(line.strip())
    ]
    text = " ".join(clean_lines).strip()

    # ── Drop leading labels: "Question:", "Q:", "1.", "Q1:" ──
    text = re.sub(
        r"^(Q\d*[\.\:]|Question\s*\d*[\.\:]|\d+[\.\)])\s*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    text = text.strip('"\'').strip()

    if not text:
        return ""

    # ── Extract first question-mark sentence ─────────────────
    q_match = re.search(r"[^.!?]*\?", text)
    if q_match:
        text = q_match.group().strip()
    else:
        sent_match = re.search(r"[.!?]", text)
        if sent_match:
            text = text[: sent_match.end()].strip()
        if not text.endswith("?"):
            text = text.rstrip(".!,;:-") + "?"

    # ── Hard word-count cap ───────────────────────────────────
    words = text.split()
    if len(words) > max_words:
        text = " ".join(words[:max_words]).rstrip(",.;:-") + "?"

    return text


def build_evaluation_prompt(
    interview_type: str,
    difficulty: str,
    question: str,
    answer: str,
    voice_metrics: dict = None,
    practice_mode: bool = False,
) -> str:
    actual_type, bank = get_question_bank(interview_type)
    
    metrics_guide = ""
    if voice_metrics:
        metrics_guide = (
            f"Speech & Voice Delivery Metrics:\n"
            f"  - Speech Confidence: {voice_metrics.get('confidence', 75)}/100\n"
            f"  - Eye Contact:       {voice_metrics.get('eyeContact', 80)}%\n"
            f"  - Speaking Pace:     {voice_metrics.get('wpm', 0)} WPM ({voice_metrics.get('wpmLabel', 'normal')})\n"
            f"  - Filler Words:      {voice_metrics.get('fillerCount', 0)} detected\n"
            f"  - Long Pauses:       {voice_metrics.get('pauseCount', 0)} detected\n"
            f"  - Volume Stability:  {voice_metrics.get('stability', 80)}%\n"
            f"CRITICAL: Incorporate these delivery metrics into your evaluation. If they spoke too fast/slow or used too many fillers, mention it in the improvements or tip.\n\n"
        )

    practice_instruction = ""
    if practice_mode:
        practice_instruction = (
            f"This is PRACTICE MODE. The candidate is here to learn and improve.\n"
            f"Your 'verbal_feedback' MUST be highly educational and supportive:\n"
            f"  1. Detail the proper way to improve their answer (key terms they missed, better structure, or optimization trade-offs).\n"
            f"  2. CRITICAL: If the candidate says 'I don't know', 'skip', 'no idea', or if their answer is completely wrong (score < 50), you MUST explain the correct answer clearly in the 'verbal_feedback' so they can learn it.\n\n"
        )

    return (
        f"{bank['context']}\n\n"
        f"You just asked this {difficulty}-level {actual_type} interview question:\n"
        f'"{question}"\n\n'
        f"The candidate answered:\n"
        f'"{answer}"\n\n'
        f"{metrics_guide}"
        f"{practice_instruction}"
        f"Evaluate this answer. You must be an extremely honest and fair interviewer.\n"
        f"CRITICAL: If the candidate's answer is incorrect, incomplete, off-topic, or gibberish, you MUST score it below 50, set grade to 'Needs Work' or 'Fair', and your verbal_feedback MUST politely state the errors or missing concepts instead of saying 'correct'. Do not use phrases like 'That is correct' or 'Excellent' unless the answer is truly correct.\n\n"
        f"Respond in this exact JSON format (no extra text):\n"
        f'{{\n'
        f'  "score": <0-100 integer>,\n'
        f'  "grade": "<Excellent|Good|Fair|Needs Work>",\n'
        f'  "strengths": "<one sentence on what was good in their answer or speech delivery>",\n'
        f'  "improvements": "<one sentence on what to improve in their content or speech delivery>",\n'
        f'  "tip": "<one actionable interview tip>",\n'
        f'  "verbal_feedback": "<a short, conversational 1-sentence spoken response summarizing their performance on this question, e.g., \'Good effort, but you missed the key concept of X.\' or \'Excellent explanation of Y.\'>"\n'
        f'}}'
    )