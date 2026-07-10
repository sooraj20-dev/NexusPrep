/**
 * useConfidenceAnalytics — real-time confidence estimation during interviews.
 *
 * Measured signals (all client-side, no AI models):
 *  - Words Per Minute (from speech transcript word count / elapsed time)
 *  - Filler words (uh, umm, like, basically, actually, you know, sort of, kind of)
 *  - Pause count (estimated from speech recognition restart cycles)
 *  - Eye contact % (forwarded from face-api.js head pose via externalGazeRef)
 *  - Speech stability (volume consistency via AudioContext)
 *
 * Confidence formula (weighted):
 *   eye_contact    25%
 *   speech_pace    20%
 *   pauses         20%
 *   fillers        20%
 *   stability      15%
 *
 * Updates every 2s. Stores timeline snapshots. Syncs to backend every 30s.
 *
 * Usage:
 *   const { metrics, snapshot } = useConfidenceAnalytics({
 *     sessionId,
 *     active,
 *     getTranscript,   // () => string — current answer text
 *     getEyeContact,   // () => number — 0-100, from fraud hook
 *     questionStartTime, // Date timestamp when question started
 *   });
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Filler word list ────────────────────────────────────────────────────────
const FILLER_PATTERN = /\b(uh|uhh|um|umm|hmm|like|basically|actually|you know|sort of|kind of|i mean|right|okay|so yeah|literally)\b/gi;

// ── WPM ideal range ─────────────────────────────────────────────────────────
const WPM_MIN = 80;
const WPM_IDEAL_LOW = 120;
const WPM_IDEAL_HIGH = 170;
const WPM_MAX = 250;

// ── Update & sync intervals ──────────────────────────────────────────────────
const UPDATE_INTERVAL_MS = 2000;
const SYNC_INTERVAL_MS = 30_000;

const BASE = 'http://localhost:8000/api';

function computeWpmScore(wpm) {
  if (wpm === 0) return 50; // no data yet — neutral
  if (wpm < WPM_MIN) return Math.max(0, (wpm / WPM_MIN) * 60);
  if (wpm <= WPM_IDEAL_LOW) return 60 + ((wpm - WPM_MIN) / (WPM_IDEAL_LOW - WPM_MIN)) * 40;
  if (wpm <= WPM_IDEAL_HIGH) return 100;
  if (wpm <= WPM_MAX) return 100 - ((wpm - WPM_IDEAL_HIGH) / (WPM_MAX - WPM_IDEAL_HIGH)) * 40;
  return 60;
}

function computeFillerScore(fillerCount, wordCount) {
  if (wordCount < 10) return 80; // not enough data
  const ratio = fillerCount / wordCount;
  if (ratio === 0) return 100;
  if (ratio < 0.02) return 95;
  if (ratio < 0.05) return 80;
  if (ratio < 0.10) return 60;
  if (ratio < 0.15) return 40;
  return 20;
}

function computePauseScore(pauseCount, elapsedSec) {
  if (elapsedSec < 10) return 80;
  const pausesPerMin = (pauseCount / elapsedSec) * 60;
  if (pausesPerMin === 0) return 100;
  if (pausesPerMin < 2) return 100;
  if (pausesPerMin < 4) return 80;
  if (pausesPerMin < 7) return 60;
  if (pausesPerMin < 10) return 40;
  return 20;
}

function computeConfidence({ eyeContact, wpmScore, fillerScore, pauseScore, stability }) {
  const ec = Math.max(0, Math.min(100, eyeContact));
  return Math.round(
    ec          * 0.25 +
    wpmScore    * 0.20 +
    pauseScore  * 0.20 +
    fillerScore * 0.20 +
    stability   * 0.15
  );
}

function countFillers(text) {
  const matches = text.match(FILLER_PATTERN);
  return matches ? matches.length : 0;
}

export function useConfidenceAnalytics({
  sessionId,
  active,
  getTranscript,
  getEyeContact,
  questionStartTime,
  phase,
}) {
  const [metrics, setMetrics] = useState({
    confidence: 75,
    eyeContact: 80,
    wpm: 0,
    wpmLabel: 'No data',
    fillerCount: 0,
    pauseCount: 0,
    stability: 80,
    confidenceLabel: 'Calculating...',
  });

  const [timeline, setTimeline] = useState([]);

  // Tracking refs (mutable, no re-render)
  const wordCountRef      = useRef(0);
  const fillerCountRef    = useRef(0);
  const pauseCountRef     = useRef(0);
  const prevTranscriptRef = useRef('');
  const stabilityRef      = useRef(80);
  const lastSyncRef       = useRef(Date.now());

  // Audio analyser for volume stability
  const analyserRef       = useRef(null);
  const audioCtxRef       = useRef(null);
  const volumeSamplesRef  = useRef([]);

  // Set up AudioContext for volume tracking
  useEffect(() => {
    if (!active) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;
        })
        .catch(() => { /* mic unavailable, stability stays at default */ });
    } catch {
      // AudioContext not available
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [active]);

  // Sample volume for stability
  const sampleVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      sum += Math.abs(buf[i] - 128);
    }
    const rms = sum / buf.length;
    volumeSamplesRef.current.push(rms);
    if (volumeSamplesRef.current.length > 30) volumeSamplesRef.current.shift();
  }, []);

  const computeStability = useCallback(() => {
    const samples = volumeSamplesRef.current;
    if (samples.length < 5) return 80;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    // Low coefficient of variation = consistent = high stability
    if (cv < 0.2) return 100;
    if (cv < 0.4) return 85;
    if (cv < 0.6) return 70;
    if (cv < 0.9) return 55;
    return 40;
  }, []);

  // Sync snapshot to backend
  const syncToBackend = useCallback(async (snapshot) => {
    if (!sessionId) return;
    try {
      await fetch(`${BASE}/analytics/confidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          timestamp: Date.now() / 1000,
          score: snapshot.confidence,
          eye_contact: snapshot.eyeContact,
          wpm: snapshot.wpm,
          filler_count: snapshot.fillerCount,
          pause_count: snapshot.pauseCount,
          phase: phase || 'answering',
        }),
      });
    } catch { /* non-critical, silent */ }
  }, [sessionId, phase]);

  // Main metrics update loop
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      // ── Get live transcript ────────────────────────────────────────────
      const transcript = getTranscript?.() || '';
      const currentWords = transcript.trim().split(/\s+/).filter(Boolean);
      const wordCount = currentWords.length;

      // Detect new words added since last check → count fillers in new segment
      if (transcript !== prevTranscriptRef.current) {
        const newText = transcript.slice(prevTranscriptRef.current.length);
        fillerCountRef.current += countFillers(newText);

        // Detect pauses: if transcript wasn't growing for a bit (rough heuristic)
        // We count distinct "restart" cycles where new text appears after silence
        if (prevTranscriptRef.current.length > 0 && newText.trim().length > 0) {
          const gap = transcript.length - prevTranscriptRef.current.length;
          if (gap < 3 && prevTranscriptRef.current.length > 10) {
            pauseCountRef.current += 1; // very small new addition = restart after pause
          }
        }
        prevTranscriptRef.current = transcript;
      }

      wordCountRef.current = wordCount;

      // ── Compute WPM ──────────────────────────────────────────────────
      const elapsedSec = questionStartTime
        ? Math.max(1, (Date.now() - questionStartTime) / 1000)
        : 1;
      const wpm = Math.round((wordCount / elapsedSec) * 60);

      // ── Sample volume ─────────────────────────────────────────────────
      sampleVolume();
      const stability = computeStability();
      stabilityRef.current = stability;

      // ── Eye contact ──────────────────────────────────────────────────
      const eyeContact = Math.round(getEyeContact?.() ?? 80);

      // ── Sub-scores ───────────────────────────────────────────────────
      const wpmScore    = computeWpmScore(wpm);
      const fillerScore = computeFillerScore(fillerCountRef.current, wordCount);
      const pauseScore  = computePauseScore(pauseCountRef.current, elapsedSec);

      const confidence = computeConfidence({ eyeContact, wpmScore, fillerScore, pauseScore, stability });

      // ── WPM label ─────────────────────────────────────────────────────
      let wpmLabel = 'No data';
      if (wpm > 0) {
        if (wpm < WPM_MIN) wpmLabel = 'Too slow';
        else if (wpm < WPM_IDEAL_LOW) wpmLabel = 'Slightly slow';
        else if (wpm <= WPM_IDEAL_HIGH) wpmLabel = 'Ideal pace';
        else if (wpm <= WPM_MAX) wpmLabel = 'Slightly fast';
        else wpmLabel = 'Too fast';
      }

      const confidenceLabel =
        confidence >= 85 ? 'High' :
        confidence >= 70 ? 'Good' :
        confidence >= 55 ? 'Fair' :
        'Low';

      const newMetrics = {
        confidence,
        eyeContact,
        wpm,
        wpmLabel,
        fillerCount: fillerCountRef.current,
        pauseCount: pauseCountRef.current,
        stability,
        confidenceLabel,
      };

      setMetrics(newMetrics);

      const snap = {
        t: Date.now(),
        ...newMetrics,
      };
      setTimeline(prev => [...prev.slice(-150), snap]); // keep last 5 minutes

      // Sync to backend every 30s
      if (Date.now() - lastSyncRef.current > SYNC_INTERVAL_MS) {
        lastSyncRef.current = Date.now();
        syncToBackend(newMetrics);
      }
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [active, getTranscript, getEyeContact, questionStartTime, sampleVolume, computeStability, syncToBackend]);

  // Reset when a new question starts
  const resetForNewQuestion = useCallback(() => {
    wordCountRef.current      = 0;
    fillerCountRef.current    = 0;
    pauseCountRef.current     = 0;
    prevTranscriptRef.current = '';
    volumeSamplesRef.current  = [];
    stabilityRef.current      = 80;
  }, []);

  return {
    metrics,
    timeline,
    resetForNewQuestion,
  };
}
