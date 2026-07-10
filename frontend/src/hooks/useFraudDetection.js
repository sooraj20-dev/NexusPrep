/**
 * useFraudDetection — camera & behavioural integrity hook
 *
 * Detection layers
 * ─────────────────
 * 1. Browser events  : tab switch, focus loss, fullscreen exit, page exit
 * 2. MediaStream     : camera / mic track ended (device disabled)
 * 3. face-api.js     : face count + head-pose every 5 s
 *                      duration-based: flags only after ≥ LOOK_AWAY_THRESHOLD_MS
 *                      consecutive ms of absence / gaze deviation
 *
 * Deterministic score
 * ────────────────────
 * Each event type carries a point weight + per-type cap.
 * Score is recomputed in JS on every new event (mirrors backend logic).
 *
 * Backend sync
 * ─────────────
 * Every SYNC_INTERVAL_MS (30 s) and on explicit flush(), the hook sends:
 *   • POST /api/fraud/log     — typed event objects (dedup by id)
 *   • POST /api/fraud/analyze — aggregated summary counts for Qwen
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logFraudEvents, analyzeFraud } from '../services/api';

// ── Constants ──────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS        = 5_000;   // face scan every 5 s
const SYNC_INTERVAL_MS        = 30_000;  // backend sync every 30 s
const LOOK_AWAY_THRESHOLD_MS  = 3_000;   // 3 s continuous → flag event
const NO_FACE_THRESHOLD_MS    = 3_000;   // 3 s no face    → flag event

// Anti-false-positive guards
const STARTUP_GRACE_MS        = 6_000;   // ignore ALL events for first 6 s after activation
const BLUR_DEBOUNCE_MS        = 8_000;   // min 8 s between consecutive focus_loss events
const TAB_SWITCH_DEBOUNCE_MS  = 5_000;   // min 5 s between consecutive tab_switch events
const FULLSCREEN_DEBOUNCE_MS  = 4_000;   // min 4 s between consecutive fullscreen_exit events

// face-api.js tiny model CDN (hosted by justadudewhohacks, widely used)
const FACEAPI_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ── Deterministic weights (mirrors backend) ────────────────────────────────
const WEIGHTS = {
  tab_switch:        { pts: 20, cap: 60 },
  focus_loss:        { pts: 10, cap: 40 },
  fullscreen_exit:   { pts: 15, cap: 30 },
  page_exit_attempt: { pts: 25, cap: 50 },
  no_face:           { pts: 15, cap: 45 },
  multiple_faces:    { pts: 30, cap: 60 },
  look_away:         { pts: 10, cap: 30 },
  camera_disabled:   { pts: 40, cap: 80 },
  mic_disabled:      { pts: 15, cap: 30 },
};

function computeScore(events) {
  const counts = {};
  events.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
  let total = 0;
  for (const [type, count] of Object.entries(counts)) {
    const w = WEIGHTS[type];
    if (w) total += Math.min(w.pts * count, w.cap);
  }
  return Math.min(total, 100);
}

function riskLabel(score) {
  if (score < 25) return 'LOW';
  if (score < 60) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Build aggregated summary counts from the event list.
 * This is what gets sent to Qwen — not raw events.
 */
function buildSummary(events, sessionStartMs, cameraDisabled, micDisabled) {
  const counts = {};
  const durMs  = {};
  events.forEach(e => {
    counts[e.type] = (counts[e.type] || 0) + 1;
    durMs[e.type]  = (durMs[e.type] || 0) + (e.durationMs || 0);
  });
  const score = computeScore(events);
  return {
    session_duration_sec:        Math.round((Date.now() - sessionStartMs) / 1000),
    tab_switches:                counts.tab_switch        || 0,
    focus_losses:                counts.focus_loss        || 0,
    fullscreen_exits:            counts.fullscreen_exit   || 0,
    page_exit_attempts:          counts.page_exit_attempt || 0,
    no_face_occurrences:         counts.no_face           || 0,
    no_face_total_sec:           Math.round((durMs.no_face || 0) / 1000),
    multiple_faces_occurrences:  counts.multiple_faces    || 0,
    look_away_occurrences:       counts.look_away         || 0,
    look_away_total_sec:         Math.round((durMs.look_away || 0) / 1000),
    camera_disabled:             cameraDisabled,
    mic_disabled:                micDisabled,
    deterministic_score:         score,
  };
}

// ── Ejection rules ────────────────────────────────────────────────────────
// These types eject the user immediately on the FIRST occurrence.
const EJECT_ON_FIRST = new Set(['tab_switch']);

// These types warn the user on occurrences 1 & 2, then eject on 3rd.
const EJECT_AFTER_WARNINGS = new Set(['no_face', 'multiple_faces', 'camera_disabled']);
const WARN_LIMIT = 2; // after this many warnings, next = eject

// ── Hook ───────────────────────────────────────────────────────────────────
/**
 * @param {React.RefObject}  videoRef    — existing <video> element ref
 * @param {React.RefObject}  streamRef   — existing MediaStream ref
 * @param {string|null}      sessionId   — current interview session id
 * @param {boolean}          active      — true while interview is running
 * @param {Function}         onEject     — called with (type) when user must be removed
 * @param {Function}         onWarn      — called with (type, warningNumber) on 1st/2nd offence
 */
export function useFraudDetection({ videoRef, streamRef, sessionId, active, onEject, onWarn }) {
  const [events, setEvents]         = useState([]);
  const [fraudScore, setFraudScore] = useState(0);
  const [fraudRisk, setFraudRisk]   = useState('LOW');
  const [faceApiReady, setFaceApiReady] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const eventsRef       = useRef([]);          // shadow ref for callbacks
  const syncedIdsRef    = useRef(new Set());   // ids already POSTed
  const sessionStartRef = useRef(Date.now());
  const scanTimerRef    = useRef(null);
  const syncTimerRef    = useRef(null);
  const faceApiRef      = useRef(null);

  // Duration trackers (for consecutive-absence detection)
  const noFaceStartRef    = useRef(null);
  const lookAwayStartRef  = useRef(null);

  // Debounce / grace trackers
  const monitoringStartRef   = useRef(null);  // when active monitoring began
  const lastBlurRef          = useRef(0);     // timestamp of last focus_loss
  const lastTabSwitchRef     = useRef(0);     // timestamp of last tab_switch
  const lastFullscreenRef    = useRef(0);     // timestamp of last fullscreen_exit
  const enteredFullscreenRef = useRef(false); // only flag exit if WE entered fullscreen

  // Typing guard — while the user is focused on the answer textarea,
  // window.blur fires in some browsers (focus shifts from window → element).
  // We suppress focus_loss events during that window.
  const isTypingRef = useRef(false);
  const typingResetTimer = useRef(null);

  // Disable flags
  const [cameraDisabled, setCameraDisabled] = useState(false);
  const [micDisabled,    setMicDisabled]    = useState(false);
  const cameraDisabledRef = useRef(false);
  const micDisabledRef    = useRef(false);

  // Ejection tracking
  const occurrenceCountsRef = useRef({});   // { [type]: number } — per-type hit counts
  const ejectedRef          = useRef(false); // prevent double-eject
  const [warningCounts, setWarningCounts] = useState({});

  // ── Callback refs (prevent stale closure bug in emit) ────────────────────
  // emit() is memoized with [] deps. Storing callbacks in refs ensures it
  // always calls the LATEST onEject/onWarn even after sessionId changes.
  const onEjectRef = useRef(onEject);
  const onWarnRef  = useRef(onWarn);
  useEffect(() => { onEjectRef.current = onEject; }, [onEject]);
  useEffect(() => { onWarnRef.current  = onWarn;  }, [onWarn]);

  // ── Event emitter ────────────────────────────────────────────────────────
  const emit = useCallback((type, severity, durationMs = 0, metadata = {}) => {
    // Don't record any new events once ejected
    if (ejectedRef.current) return;

    const event = {
      id:        uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      severity,
      durationMs,
      metadata,
    };
    eventsRef.current = [...eventsRef.current, event];
    setEvents([...eventsRef.current]);
    const score = computeScore(eventsRef.current);
    setFraudScore(score);
    setFraudRisk(riskLabel(score));

    // ── Ejection logic ──────────────────────────────────────────────
    // Increment occurrence count for this type
    const counts = occurrenceCountsRef.current;
    counts[type] = (counts[type] || 0) + 1;
    const hitCount = counts[type];

    if (EJECT_ON_FIRST.has(type)) {
      // tab_switch → eject immediately on first hit
      ejectedRef.current = true;
      onEjectRef.current?.(type, hitCount);
    } else if (EJECT_AFTER_WARNINGS.has(type)) {
      if (hitCount > WARN_LIMIT) {
        // 3rd+ hit → eject
        ejectedRef.current = true;
        onEjectRef.current?.(type, hitCount);
      } else {
        // 1st or 2nd hit → warn
        setWarningCounts({ ...counts });
        onWarnRef.current?.(type, hitCount);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load face-api.js from CDN ─────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const loadFaceApi = async () => {
      try {
        // Dynamically inject the face-api script only once
        if (!window.faceapi) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm-nobundle.js';
            script.type = 'module';
            // fallback: use the UMD build instead
            const fallback = document.createElement('script');
            fallback.src = 'https://cdn.jsdelivr.net/npm/face-api.js/dist/face-api.min.js';
            fallback.onload = resolve;
            fallback.onerror = reject;
            document.head.appendChild(fallback);
          });
        }
        if (cancelled) return;

        const faceapi = window.faceapi;
        if (!faceapi) return;

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_CDN),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACEAPI_CDN),
        ]);

        if (!cancelled) {
          faceApiRef.current = faceapi;
          setFaceApiReady(true);
        }
      } catch {
        // face-api unavailable — browser events still work fine
      }
    };

    loadFaceApi();
    return () => { cancelled = true; };
  }, [active]);

  // ── Browser event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    // Record when monitoring started so grace period works correctly
    monitoringStartRef.current = Date.now();

    /** Returns true if we are still in the startup grace period. */
    const inGrace = () =>
      Date.now() - (monitoringStartRef.current || 0) < STARTUP_GRACE_MS;

    const onVisibilityChange = () => {
      // Ignore hidden events during grace period or too soon after last one
      if (document.visibilityState !== 'hidden') return;
      if (inGrace()) return;
      const now = Date.now();
      if (now - lastTabSwitchRef.current < TAB_SWITCH_DEBOUNCE_MS) return;
      lastTabSwitchRef.current = now;
      emit('tab_switch', 'high');
    };

    const onBlur = () => {
      // window blur fires on: TTS audio play, file dialogs, OS notifications,
      // camera permission prompts — heavily debounced to avoid false positives.
      if (inGrace()) return;
      // ← Typing guard: clicking into a textarea can fire window.blur in
      // some Chromium builds — skip fraud event while user is answering.
      if (isTypingRef.current) return;
      const now = Date.now();
      if (now - lastBlurRef.current < BLUR_DEBOUNCE_MS) return;
      // Additional guard: if document is still visible (just a widget focus
      // shift within the page), don't count it as focus loss.
      if (document.visibilityState === 'visible' &&
          document.hasFocus && document.hasFocus()) return;
      lastBlurRef.current = now;
      emit('focus_loss', 'medium');
    };

    const onFullscreenChange = () => {
      if (inGrace()) return;
      if (document.fullscreenElement) {
        // User entered fullscreen — record it so we can detect exit
        enteredFullscreenRef.current = true;
        return;
      }
      // Only flag exit if we actually entered fullscreen first
      if (!enteredFullscreenRef.current) return;
      const now = Date.now();
      if (now - lastFullscreenRef.current < FULLSCREEN_DEBOUNCE_MS) return;
      lastFullscreenRef.current = now;
      enteredFullscreenRef.current = false;
      emit('fullscreen_exit', 'low');
    };

    const onBeforeUnload = (e) => {
      // Only fire if the event is a genuine unload (has a returnValue or type check)
      // Some browser extensions / audio APIs trigger this spuriously
      if (inGrace()) return;
      if (!e.isTrusted) return; // non-user-initiated unloads are ignored
      emit('page_exit_attempt', 'high');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active, emit]);

  // ── MediaStream track monitor (camera / mic disable detection) ───────────
  useEffect(() => {
    if (!active || !streamRef?.current) return;

    const stream = streamRef.current;
    const handlers = [];

    stream.getVideoTracks().forEach(track => {
      const handler = () => {
        if (!cameraDisabledRef.current) {
          cameraDisabledRef.current = true;
          setCameraDisabled(true);
          emit('camera_disabled', 'high');
        }
      };
      track.addEventListener('ended', handler);
      handlers.push({ track, handler, type: 'ended' });
    });

    stream.getAudioTracks().forEach(track => {
      const handler = () => {
        if (!micDisabledRef.current) {
          micDisabledRef.current = true;
          setMicDisabled(true);
          emit('mic_disabled', 'medium');
        }
      };
      track.addEventListener('ended', handler);
      handlers.push({ track, handler, type: 'ended' });
    });

    return () => {
      handlers.forEach(({ track, handler, type }) =>
        track.removeEventListener(type, handler)
      );
    };
  }, [active, streamRef, emit]);

  // ── Face scanning (every 5 s, duration-based) ────────────────────────────
  useEffect(() => {
    if (!active || !faceApiReady) return;

    const faceapi = faceApiRef.current;
    if (!faceapi) return;

    const scan = async () => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2) return;

      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks(true);
        const count = detections.length;

        if (count === 0) {
          // No face — start / continue duration timer
          if (!noFaceStartRef.current) {
            noFaceStartRef.current = Date.now();
          } else {
            const dur = Date.now() - noFaceStartRef.current;
            if (dur >= NO_FACE_THRESHOLD_MS) {
              emit('no_face', 'high', dur);
              noFaceStartRef.current = null; // reset so next continuous absence is a new event
            }
          }
          // Reset look-away timer (can't look away if no face detected)
          lookAwayStartRef.current = null;
        } else {
          // Face(s) present — reset no-face timer
          noFaceStartRef.current = null;

          if (count > 1) {
            emit('multiple_faces', 'high', 0, { count });
          }

          // Head pose via landmarks (yaw detection using eye symmetry)
          if (detections[0]?.landmarks) {
            const lm = detections[0].landmarks;
            const leftEye  = lm.getLeftEye();
            const rightEye = lm.getRightEye();
            const nose     = lm.getNose();

            const eyeMidX    = (leftEye[0].x + rightEye[3].x) / 2;
            const noseTipX   = nose[3].x;
            const eyeSpan    = rightEye[3].x - leftEye[0].x;
            const yawRatio   = Math.abs(noseTipX - eyeMidX) / (eyeSpan || 1);

            const isLookingAway = yawRatio > 0.3; // empirically tuned threshold

            if (isLookingAway) {
              if (!lookAwayStartRef.current) {
                lookAwayStartRef.current = Date.now();
              } else {
                const dur = Date.now() - lookAwayStartRef.current;
                if (dur >= LOOK_AWAY_THRESHOLD_MS) {
                  emit('look_away', 'medium', dur, { yawRatio: yawRatio.toFixed(2) });
                  lookAwayStartRef.current = null;
                }
              }
            } else {
              lookAwayStartRef.current = null;
            }
          }
        }
      } catch {
        // Ignore transient canvas errors
      }
    };

    scanTimerRef.current = setInterval(scan, SCAN_INTERVAL_MS);
    setIsMonitoring(true);

    return () => {
      clearInterval(scanTimerRef.current);
      setIsMonitoring(false);
    };
  }, [active, faceApiReady, videoRef, emit]);

  // ── Backend sync (every 30 s) ─────────────────────────────────────────────
  const syncToBackend = useCallback(async (sid) => {
    const allEvents = eventsRef.current;
    if (!sid || allEvents.length === 0) return;

    // Only POST events not yet synced
    const newEvents = allEvents.filter(e => !syncedIdsRef.current.has(e.id));
    if (newEvents.length > 0) {
      try {
        await logFraudEvents(sid, newEvents);
        newEvents.forEach(e => syncedIdsRef.current.add(e.id));
      } catch { /* non-critical */ }
    }

    // Always send latest summary to Qwen
    try {
      const summary = buildSummary(
        allEvents,
        sessionStartRef.current,
        cameraDisabledRef.current,
        micDisabledRef.current,
      );
      await analyzeFraud(sid, summary);
    } catch { /* non-critical */ }
  }, []);

  // Periodic sync
  useEffect(() => {
    if (!active || !sessionId) return;
    syncTimerRef.current = setInterval(() => syncToBackend(sessionId), SYNC_INTERVAL_MS);
    return () => clearInterval(syncTimerRef.current);
  }, [active, sessionId, syncToBackend]);

  // Final flush on deactivation
  const flush = useCallback((sid) => {
    return syncToBackend(sid || sessionId);
  }, [sessionId, syncToBackend]);

  /**
   * Call setIsTyping(true) on textarea focus and setIsTyping(false) on blur.
   * This prevents window.blur events from being mis-classified as focus_loss
   * while the candidate is actively typing their answer.
   */
  const setIsTyping = useCallback((typing) => {
    clearTimeout(typingResetTimer.current);
    if (typing) {
      isTypingRef.current = true;
    } else {
      // Small delay so the window.blur (which fires just before textarea focus)
      // is still suppressed, then we allow fraud events again.
      typingResetTimer.current = setTimeout(() => {
        isTypingRef.current = false;
      }, 600);
    }
  }, []);

  return {
    events,
    fraudScore,
    fraudRisk,
    isMonitoring,
    faceApiReady,
    cameraDisabled,
    micDisabled,
    warningCounts,
    flush,
    setIsTyping,  // wire to textarea onFocus / onBlur in InterviewPage
  };
}
