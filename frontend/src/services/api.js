/**
 * Frontend API service
 * Thin wrapper for all backend calls. Uses the CRA proxy so no CORS config needed in dev.
 */

const BASE = '/api';
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : '';

/** Check if the backend + Ollama are online */
export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * Start a new interview session.
 * @param {{ type: string, difficulty: string, duration: string }} config
 * @returns {Promise<{ sessionId: string, maxQuestions: number, ... }>}
 */
export async function startSession(config) {
  const res = await fetch(`${BASE}/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Start failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Stream the next interview question via SSE.
 * Calls onMeta, onChunk, onDone, onError callbacks.
 *
 * @param {string} sessionId
 * @param {{ onMeta?, onChunk, onDone, onError }} handlers
 * @returns {EventSource} — call .close() to abort
 */
export function streamQuestion(sessionId, { onMeta, onChunk, onDone, onError }) {
  // Use direct URL to port 8000 — CRA's proxy buffers SSE responses which
  // breaks real-time streaming. CORS on the backend allows localhost origins.
  const url = `${BACKEND_URL}${BASE}/interview/ask?sessionId=${encodeURIComponent(sessionId)}`;
  const source = new EventSource(url);
  let completed = false;

  source.addEventListener('meta', (e) => {
    try { onMeta?.(JSON.parse(e.data)); } catch {}
  });

  source.addEventListener('chunk', (e) => {
    try { onChunk?.(JSON.parse(e.data)); } catch {}
  });

  source.addEventListener('done', (e) => {
    completed = true;
    source.close();
    try { onDone?.(JSON.parse(e.data)); } catch {}
  });

  source.addEventListener('error', (e) => {
    completed = true;
    source.close();
    try {
      const data = JSON.parse(e.data || '{}');
      onError?.(new Error(data.message || 'Stream error'));
    } catch {
      onError?.(new Error('Stream error'));
    }
  });

  // onerror fires on connection drops AND on the reconnect tick after a normal
  // close — guard with `completed` so we don't surface a false error.
  source.onerror = () => {
    if (completed || source.readyState === EventSource.CLOSED) return;
    source.close();
    onError?.(new Error('Could not connect to backend. Is it running on port 8000?'));
  };

  return source;
}

/**
 * Evaluate the candidate's answer.
 * @param {string} sessionId
 * @param {string} answer
 * @param {object} voiceMetrics
 * @returns {Promise<{ evaluation: object, averageScore: number, ... }>}
 */
export async function evaluateAnswer(sessionId, answer, voiceMetrics = null) {
  const res = await fetch(`${BASE}/interview/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answer, voiceMetrics }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Evaluation failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get the full session summary.
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/interview/session?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Session fetch failed: ${res.status}`);
  return res.json();
}

/** Get all saved sessions */
export async function getSessions() {
  const res = await fetch(`${BASE}/interview/sessions`);
  if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
  return res.json();
}

/** Delete a session */
export async function deleteSession(sessionId) {
  const res = await fetch(`${BASE}/interview/session?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return res.json();
}

/** Upload and parse a resume file */
export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/interview/upload-resume`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

// ── Fraud detection ──────────────────────────────────────────────────────────

/**
 * POST typed fraud events to the backend (dedup by id is handled server-side).
 * @param {string} sessionId
 * @param {Array}  events  — FraudEvent[] from useFraudDetection
 */
export async function logFraudEvents(sessionId, events) {
  const res = await fetch(`${BASE}/fraud/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, events }),
  });
  if (!res.ok) throw new Error(`Fraud log failed: ${res.status}`);
  return res.json();
}

/**
 * Send aggregated summary counts to Qwen for qualitative analysis.
 * @param {string} sessionId
 * @param {object} summary — built by buildSummary() inside the hook
 */
export async function analyzeFraud(sessionId, summary) {
  const res = await fetch(`${BASE}/fraud/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...summary }),
  });
  if (!res.ok) throw new Error(`Fraud analyze failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch the stored fraud report for a session.
 * @param {string} sessionId
 */
export async function getFraudReport(sessionId) {
  const res = await fetch(`${BASE}/fraud/report?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Fraud report fetch failed: ${res.status}`);
  return res.json();
}

// ── v2 additions ─────────────────────────────────────────────────────────────

/**
 * Ask the decision engine what question to ask next.
 * @param {string} sessionId
 */
export async function decideNextQuestion(sessionId) {
  const res = await fetch(`${BASE}/interview/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`Decision failed: ${res.status}`);
  return res.json();
}

/** Fetch the aggregated global skill profile */
export async function getGlobalSkills() {
  const res = await fetch(`/api/analytics/skills`);
  if (!res.ok) throw new Error(`Global skills fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch the skill profile for a specific session.
 * @param {string} sessionId
 */
export async function getSessionSkills(sessionId) {
  const res = await fetch(`/api/analytics/skills/session?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Session skills fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Store a real-time confidence snapshot on the backend.
 * @param {object} snapshot
 */
export async function saveConfidenceSnapshot(snapshot) {
  const res = await fetch(`/api/analytics/confidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`Confidence snapshot save failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch the confidence timeline for a session.
 * @param {string} sessionId
 */
export async function getConfidenceTimeline(sessionId) {
  const res = await fetch(`/api/analytics/confidence?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Confidence timeline fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Get a suggested model answer based on candidate response analysis.
 * @param {{ question: string, answer: str, strengths?: str, improvements?: str, type?: str, difficulty?: str }} payload
 * @returns {Promise<{ suggested_answer: string }>}
 */
export async function suggestAnswer(payload) {
  const res = await fetch(`${BASE}/interview/suggest-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Suggested answer failed: ${res.status}`);
  return res.json();
}

