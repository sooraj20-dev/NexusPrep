export const COLORS = {
  // Base
  ink:    "#0a0a0a",
  paper:  "#f0f0f0",
  panel:  "#111111",
  panel2: "#171717",
  // Semantic
  alarm:  "#ef4444",
  signal: "#22c55e",
  amber:  "#f59e0b",
  steel:  "#6b7280",
  blue:   "#3b82f6",
  accent: "#6366f1",
};

export const monoTick = {
  fill: "#6b7280",
  fontSize: 11,
  fontFamily: "Inter, sans-serif",
};

export const scoreColor = (v) => {
  return v >= 80 ? COLORS.signal : v >= 65 ? COLORS.amber : COLORS.alarm;
};

export const pageTitles = {
  landing:     "Home",
  dashboard:   "Dashboard",
  setup:       "New Interview",
  calibration: "Calibration",
  interview:   "Interview",
  results:     "Results",
  analytics:   "Analytics",
  history:     "History",
  achievements:"Achievements",
  settings:    "Settings",
};

// v2 — Interviewer personality configs (mirrors backend/data/personalities.py)
export const PERSONALITIES = {
  friendly: {
    label: 'Friendly Coach',
    emoji: '😊',
    description: 'Encouraging & patient — great for beginners',
    tts: { rate: 1.0, pitch: 1.1 },
  },
  professional: {
    label: 'Professional',
    emoji: '👔',
    description: 'Formal & structured — standard interview style',
    tts: { rate: 0.95, pitch: 1.0 },
  },
  strict: {
    label: 'Strict Examiner',
    emoji: '🧑‍⚖️',
    description: 'Demanding & rigorous — maximum challenge',
    tts: { rate: 0.9, pitch: 0.9 },
  },
  senior_engineer: {
    label: 'Senior Engineer',
    emoji: '💻',
    description: 'Deep technical focus — trade-offs & edge cases',
    tts: { rate: 1.0, pitch: 0.95 },
  },
  hr: {
    label: 'HR Recruiter',
    emoji: '🤝',
    description: 'Warm & behavioral — STAR method focused',
    tts: { rate: 1.05, pitch: 1.1 },
  },
  startup_founder: {
    label: 'Startup Founder',
    emoji: '🚀',
    description: 'Fast-paced & impact-driven — skip the formalities',
    tts: { rate: 1.1, pitch: 1.05 },
  },
};
