# 🎯 NexusPrep — AI Interview Coach

> **Practice interviews like it's the real thing. Powered by a local LLM, zero data leaves your machine.**

NexusPrep is an open-source, **local-first** AI interview coaching platform. It simulates real technical and behavioral interviews using Ollama, tracks your eye contact and confidence live via webcam, detects suspicious behaviour with a built-in fraud engine, and delivers instant structured feedback — all without sending a single byte to the cloud.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎤 **Voice-Driven Interviews** | Speak your answers naturally; the AI listens, scores, and asks intelligent follow-ups |
| 👁️ **Live Confidence Metrics** | Eye contact, attention level, and speech rate tracked in real time via webcam |
| 🧠 **Local LLM Feedback** | Powered by Ollama (default: `qwen2.5:3b`) — private, instant, and free |
| 🛡️ **Fraud Detection Engine** | Detects tab switches, focus loss, multiple faces, look-away events and computes a risk score |
| 📊 **Deep Analytics** | Session history, skill trend charts, confidence scores, and performance breakdowns |
| 🎭 **6 AI Personas** | From Friendly Coach to Strict Examiner — each with distinct style and question strategy |
| 🗄️ **5 Interview Modes** | SQL · Python · Data Science · HR · Koios Simulation |
| ⚡ **Adaptive Conversation** | v2 decision engine dynamically adjusts difficulty and follow-up depth mid-session |
| 🏆 **Achievements & Streaks** | Gamified progress with badges, milestones, and daily streaks |
| 🔒 **100% Local & Private** | No accounts, no API keys, no subscriptions — everything runs on your machine |

---

## 🖥️ Screenshots

> The app opens on a full-screen interactive landing page, then transitions into the main dashboard shell.

```
Landing Page  →  Setup  →  Calibration  →  Live Interview  →  Results & Analytics
```

---

## 🏗️ Project Structure

```
interview/
├── frontend/                   # React 18 SPA
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.jsx       # Interactive home page (entry point)
│       │   ├── DashboardPage.jsx     # Session overview + score charts
│       │   ├── SetupPage.jsx         # Mode, difficulty, duration, resume upload
│       │   ├── CalibrationPage.jsx   # Webcam & audio calibration
│       │   ├── InterviewPage.jsx     # Live interview with real-time metrics
│       │   ├── ResultsPage.jsx       # Post-session breakdown
│       │   ├── AnalyticsPage.jsx     # Skill trends and historical charts
│       │   ├── HistoryPage.jsx       # Past sessions table
│       │   ├── AchievementsPage.jsx  # Badges and milestones
│       │   └── SettingsPage.jsx      # App preferences
│       ├── components/
│       │   ├── Layout.jsx            # Panel, SectionLabel, Reticle
│       │   ├── Cards.jsx             # BrutalButton, StatCard, Meter
│       │   └── Charts.jsx            # RadialScore and chart components
│       ├── services/
│       │   └── api.js                # All backend API calls
│       ├── utils/
│       │   ├── constants.js          # Color palette, page titles, personas
│       │   └── data.js               # Mock/seed data
│       ├── App.jsx                   # Root router + sidebar shell
│       └── index.css                 # Design system & global styles
│
└── backend/                    # Python FastAPI server
    ├── routes/
    │   ├── health.py                 # GET /api/health
    │   ├── interview.py              # Session start, SSE stream, evaluate
    │   ├── conversation.py           # v2 adaptive conversation & history
    │   ├── analytics.py              # Skill tracking & confidence analytics
    │   └── fraud.py                  # Fraud event logging & risk analysis
    ├── services/
    │   ├── ollama.py                 # Ollama LLM client
    │   ├── fraud.py                  # Deterministic scoring + Qwen analysis
    │   └── tts.py                    # Text-to-speech helpers
    ├── models/                       # Pydantic request/response models
    ├── engines/                      # Core interview question engines
    ├── data/                         # Personality configs, question banks
    ├── sessions.json                 # Flat-file session persistence
    ├── main.py                       # FastAPI app entry point
    └── requirements.txt
```

---

## 🛠️ Tech Stack

### Frontend
| Tech | Version | Purpose |
|---|---|---|
| **React** | 18.2 | UI framework |
| **Recharts** | 2.10 | Score & trend charts |
| **Lucide React** | 0.294 | Icon library |
| **Tailwind CSS** | 3.3 | Utility styling |
| **uuid** | 14 | Session ID generation |

### Backend
| Tech | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.111 | REST API + SSE streaming |
| **Uvicorn** | 0.29 | ASGI server |
| **Ollama** | — | Local LLM inference |
| **httpx** | 0.27 | Async HTTP client |
| **sse-starlette** | 2.1 | Server-Sent Events |
| **pypdf** | 4.2 | Resume PDF parsing |
| **python-dotenv** | 1.0 | Environment config |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+
- **Python** 3.10+
- **Ollama** installed and running → [ollama.com](https://ollama.com)

### 1. Pull the LLM model

```bash
ollama pull qwen2.5:3b
```

> You can use any Ollama-compatible model. Set `OLLAMA_MODEL` in `backend/.env` to switch.

---

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

---

### 3. Start the Frontend

```bash
cd frontend
npm install
npm start
```

App opens at **http://localhost:3000**

---

### 4. Environment Configuration

Create or edit `backend/.env`:

```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
PORT=8000
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend + Ollama connectivity check |
| `POST` | `/api/interview/start` | Create a new interview session |
| `GET` | `/api/interview/ask` | SSE stream — get next AI question |
| `POST` | `/api/interview/evaluate` | Score a candidate response |
| `GET` | `/api/interview/session` | Fetch session state |
| `POST` | `/api/interview/decide` | v2 adaptive decision engine |
| `GET` | `/api/interview/conversation` | v2 full conversation history |
| `GET` | `/api/analytics/skills` | Aggregated skill scores |
| `GET` | `/api/analytics/skills/session` | Per-session skill breakdown |
| `POST` | `/api/analytics/confidence` | Log confidence data point |
| `GET` | `/api/analytics/confidence` | Retrieve confidence history |
| `POST` | `/api/fraud/log` | Append fraud events + recalculate score |
| `POST` | `/api/fraud/analyze` | Run LLM qualitative risk analysis |
| `GET` | `/api/fraud/report` | Get fraud report for a session |

---

## 🎭 Interview Modes

| Mode | Focus Area |
|---|---|
| 🗄️ **SQL** | JOINs, window functions, CTEs, query optimization, schema design |
| 🐍 **Python** | Data structures, OOP, Pandas/NumPy, async, testing |
| 📊 **Data Science** | ML algorithms, statistics, model evaluation, feature engineering |
| 🤝 **HR** | STAR method, behavioural questions, leadership, conflict resolution |
| 🚀 **Koios Simulation** | Full-loop simulation: technical + system design + behavioural |

---

## 🎭 AI Personas

| Persona | Style |
|---|---|
| 😊 Friendly Coach | Encouraging & patient — great for beginners |
| 👔 Professional | Formal & structured — standard interview style |
| 🧑‍⚖️ Strict Examiner | Demanding & rigorous — maximum challenge |
| 💻 Senior Engineer | Deep technical focus — trade-offs & edge cases |
| 🤝 HR Recruiter | Warm & behavioural — STAR method focused |
| 🚀 Startup Founder | Fast-paced & impact-driven — skip the formalities |

---

## 📏 Difficulty & Duration

**Difficulty Levels:** Junior · Mid · Senior

**Session Lengths:** 15 mins · 30 mins · 45 mins

---

## 📊 Metrics Tracked

- **Technical Knowledge** — LLM-scored answer accuracy
- **Communication Skills** — clarity, structure, and articulation
- **Confidence Level** — derived from speech pace and delivery
- **Eye Contact** — webcam-tracked gaze consistency
- **Speech Rate** — words per minute monitoring
- **Attention Level** — focus detection via computer vision

---

## 🛡️ Fraud Detection

The built-in fraud engine monitors for suspicious behaviour during interviews:

- Tab switches & focus loss
- Fullscreen exits & page-exit attempts
- No face / multiple faces detected
- Excessive look-away events
- Camera or microphone disabled

Each event is logged, a **deterministic risk score** is computed, and optionally a **Qwen LLM qualitative analysis** produces a risk label (`LOW` / `MEDIUM` / `HIGH`) with actionable suggestions.

---

## 🎨 Design System

The app uses a premium dark brutalist design system with CSS variables:

| Token | Value | Usage |
|---|---|---|
| `--ink` | `#0a0a0a` | Page background |
| `--panel` | `#111111` | Card / sidebar background |
| `--panel2` | `#171717` | Secondary panels |
| `--accent` | `#6366f1` | Primary brand colour (indigo) |
| `--signal` | `#22c55e` | Success / online |
| `--alarm` | `#ef4444` | Error / danger |
| `--amber` | `#f59e0b` | Warning / caution |
| `--blue` | `#3b82f6` | Info |
| `--steel` | `#6b7280` | Muted text |

**Typography:** Inter (UI) + JetBrains Mono (code/metrics)

---

## 📜 Available Scripts

### Frontend (`/frontend`)
```bash
npm start       # Development server on :3000
npm run build   # Production bundle
npm test        # Run tests
```

### Backend (`/backend`)
```bash
python main.py              # Start with auto-reload
uvicorn main:app --reload   # Alternative start
```

---

## 🗺️ Roadmap

- [ ] Resume-aware question personalisation
- [ ] Export session report as PDF
- [ ] Multi-language interview support
- [ ] Mobile-responsive interview mode
- [ ] Whisper-based local speech-to-text

---

## 📄 License

**MIT** — free to use, modify, and distribute.

---

## 👤 Author

Built with ❤️ as a local-first AI tooling project.
Powered by [Ollama](https://ollama.com) · [FastAPI](https://fastapi.tiangolo.com) · [React](https://react.dev)
