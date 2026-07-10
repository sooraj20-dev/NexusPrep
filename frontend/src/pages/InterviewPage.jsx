import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, Mic, MicOff, Radio, Send, SkipForward,
  AlertTriangle, Loader2, ChevronRight, Star, Volume2,
  TrendingUp, TrendingDown, Minus, Zap, Sparkles
} from 'lucide-react';
import { BrutalButton } from '../components/Cards';
import { FraudMonitor } from '../components/FraudMonitor';
import { ConfidenceDashboard } from '../components/ConfidenceDashboard';
import { InterviewerAvatar } from '../components/avatar/InterviewerAvatar';
import { AvatarController } from '../components/avatar/AvatarController';
import { useFraudDetection } from '../hooks/useFraudDetection';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useConversation } from '../hooks/useConversation';
import { useConfidenceAnalytics } from '../hooks/useConfidenceAnalytics';
import { COLORS } from '../utils/constants';
import { startSession, streamQuestion, evaluateAnswer, deleteSession, suggestAnswer, getSession } from '../services/api';
import { ttsManager } from '../services/tts/TTSManager';




// ── Evaluation card ──────────────────────────────────────────
function EvaluationCard({ evaluation, question, answer, sessionConfig, onNext, isDone }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');

  if (!evaluation) return null;

  const handleGetSuggestion = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await suggestAnswer({
        question: question,
        answer: answer,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        type: sessionConfig?.type || 'General',
        difficulty: sessionConfig?.difficulty || 'Mid',
      });
      setSuggestion(res.suggested_answer);
    } catch (err) {
      setError('Failed to load suggestion. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border)', background: 'var(--panel2)',
      padding: '14px', borderRadius: 10,
    }}>
      {/* Strengths & Improvements */}
      <div style={{ display: 'grid', gap: 6 }}>
        {evaluation.strengths && (
          <div style={{ fontSize: '0.75rem', color: COLORS.signal, lineHeight: 1.4 }}>
            ✓ {evaluation.strengths}
          </div>
        )}
        {evaluation.improvements && (
          <div style={{ fontSize: '0.75rem', color: COLORS.amber, lineHeight: 1.4 }}>
            ↑ {evaluation.improvements}
          </div>
        )}
        {evaluation.tip && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2, lineHeight: 1.4 }}>
            💡 {evaluation.tip}
          </div>
        )}
      </div>

      {/* Suggested Response Section */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {onNext && (
          <button
            onClick={onNext}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: COLORS.signal, border: `1px solid ${COLORS.signal}`, borderRadius: 8,
              color: 'var(--ink)', fontSize: '0.78rem', fontWeight: 700,
              padding: '10px 14px', width: '100%', cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0,255,136,0.15)',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {isDone ? 'View Results' : 'Next Question'}
            <ChevronRight size={14} />
          </button>
        )}

        {!suggestion && !loading && (
          <button
            onClick={handleGetSuggestion}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600,
              padding: '8px 12px', width: '100%', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--panel2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel)'; }}
          >
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            Suggest a Better Response
          </button>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 0' }}>
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
            Generating model response…
          </div>
        )}

        {error && (
          <div style={{ fontSize: '0.72rem', color: COLORS.alarm, textAlign: 'center', padding: '4px 0' }}>
            {error}
          </div>
        )}

        {suggestion && (
          <div style={{ animation: 'slideDown 0.2s ease-out' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Suggested Model Response
            </div>
            <p style={{
              background: 'var(--panel)', padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-primary)',
              lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {suggestion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main InterviewPage ───────────────────────────────────────
export function InterviewPage({ go, sessionConfig, sessionId: propSessionId, setSessionId }) {
  const [sessionId, setSId] = useState(propSessionId);

  const [questionText, setQuestionText] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [isStreaming, setIsStreaming] = useState(false);

  const [answer, setAnswer]         = useState('');
  const [inputMode, setInputMode]   = useState(sessionConfig?.answerMode || 'type');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [avgScore, setAvgScore]     = useState(null);

  // ── v2: Conversational engine decision metadata ───────────────
  const [currentDecision, setCurrentDecision] = useState(null);
  // { action, reason, difficulty, skill, question, expected_depth, estimated_time }

  // ── v2: Practice mode ────────────────────────────────────────
  const practiceMode = sessionConfig?.practiceMode === true;
  const cameraOff = sessionConfig?.cameraMode === 'off';

  // ── v2: Avatar state machine ─────────────────────────────────
  const [avatarState, setAvatarState] = useState('idle');
  const [avatarPersonality, setAvatarPersonality] = useState(
    sessionConfig?.personality || 'professional'
  );
  const avatarControllerRef = useRef(null);
  if (!avatarControllerRef.current) {
    avatarControllerRef.current = new AvatarController((state, personality) => {
      setAvatarState(state);
      if (personality) setAvatarPersonality(personality);
    });
  }

  // ── v2: Question start timestamp (for WPM) ───────────────────
  const questionStartTimeRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef(null);
  const sseRef = useRef(null);
  const answerRef = useRef(null);

  const [phase, setPhase] = useState('init');

  const [audio, setAudio] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const {
    isSupported: speechSupported,
    isListening,
    interimText,
    liveText,
    error:       speechError,
    start:       startMic,
    stop:        stopMic,
    toggle:      toggleMic,
    reset:       resetMic,
  } = useSpeechRecognition({
    // autoStopOnSilence intentionally false — user presses button to stop
    onTranscript: useCallback((text) => { setAnswer(text); }, []),
  });

  // Stop mic whenever we leave the answering phase or audio starts playing
  useEffect(() => {
    if (phase !== 'answering' || isPlayingAudio) {
      stopMic();
    }
  }, [phase, isPlayingAudio, stopMic]);

  const stopMicIfActive = useCallback(() => {
    stopMic();
  }, [stopMic]);

  const interviewActive = phase !== 'init' && phase !== 'error';
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const [fraudWarning, setFraudWarning] = useState(null);
  const [fraudEjection, setFraudEjection] = useState(null);
  const fraudEjectedRef = useRef(false);
  const warnToastTimer  = useRef(null);

  const EJECT_LABELS = {
    tab_switch:      'You switched browser tabs.',
    no_face:         'No face detected 3 times.',
    multiple_faces:  'Multiple faces detected 3 times.',
    camera_disabled: 'Camera was disabled 3 times.',
  };
  const WARN_LABELS = {
    no_face:         'No face detected',
    multiple_faces:  'Multiple faces detected',
    camera_disabled: 'Camera was turned off',
  };

  const handleFraudWarn = useCallback((type, warningNum) => {
    clearTimeout(warnToastTimer.current);
    setFraudWarning({ type, warningNum });
    warnToastTimer.current = setTimeout(() => setFraudWarning(null), 4000);
  }, []);

  const handleFraudEject = useCallback(async (type) => {
    if (fraudEjectedRef.current) return;
    fraudEjectedRef.current = true;
    clearTimeout(warnToastTimer.current);
    setFraudWarning(null);
    setFraudEjection({ type });
    if (audio) { audio.pause(); }
    sseRef.current?.close();
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
    const sid = sessionIdRef.current;
    if (sid) {
      try { await deleteSession(sid); } catch (err) { console.warn('[FraudEject] deleteSession failed:', err); }
    }
    setTimeout(() => go('dashboard'), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, go]);

  const {
    events: fraudEvents, fraudScore, fraudRisk, isMonitoring,
    faceApiReady, cameraDisabled, micDisabled, warningCounts,
    flush: flushFraud,
    setIsTyping,
    eyeContactPct,   // v2: forwarded to confidence analytics
  } = useFraudDetection({
    videoRef,
    streamRef,
    sessionId,
    // active: interviewActive,
    active: false, // TEMPORARILY DISABLED: Set to false to temporarily stop fraud monitoring (eject, warnings, focus loss, etc.)
    onEject: handleFraudEject,
    onWarn: handleFraudWarn,
  });

  // ── v2: Conversational decision hook ─────────────────────────
  const { recordAnswerAndDecide, isDeciding } = useConversation(sessionId);

  // ── v2: Confidence analytics ─────────────────────────────────
  const getTranscript = useCallback(() => answer, [answer]);
  const getEyeContact = useCallback(() => eyeContactPct ?? 80, [eyeContactPct]);

  const { metrics: confidenceMetrics, resetForNewQuestion: resetConfidence } = useConfidenceAnalytics({
    sessionId,
    active: phase === 'answering',
    getTranscript,
    getEyeContact,
    questionStartTime: questionStartTimeRef.current,
    phase,
  });

  const fmtTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (timerStarted) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerStarted]);

  useEffect(() => {
    return () => { if (sseRef.current) sseRef.current.close(); };
  }, []);

  useEffect(() => {
    if (cameraOff) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("Error accessing webcam:", err));
    }
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [cameraOff]);

  useEffect(() => {
    return () => { ttsManager.stop(); };
  }, []);

  const playQuestionSpeech = useCallback((text, onEndedCallback = null) => {
    if (!text) {
      if (onEndedCallback) onEndedCallback();
      return;
    }
    ttsManager.stop();
    setIsPlayingAudio(true);
    avatarControllerRef.current?.onSpeechStart();

    const personality = sessionConfig?.personality || 'professional';
    ttsManager.speak(text, personality)
      .then(() => {
        setIsPlayingAudio(false);
        avatarControllerRef.current?.onSpeechEnd();
        if (onEndedCallback) onEndedCallback();
      })
      .catch((err) => {
        console.error("TTS failed:", err);
        setIsPlayingAudio(false);
        avatarControllerRef.current?.onSpeechEnd();
        if (onEndedCallback) onEndedCallback();
      });
  }, [sessionConfig?.personality]);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      ttsManager.stop();
      setIsPlayingAudio(false);
      avatarControllerRef.current?.onSpeechEnd();
    }
    else if (questionText) {
      playQuestionSpeech(questionText);
    }
  };

  const askNextQuestion = useCallback((sid, decisionOverride = null) => {
    if (audio) { audio.pause(); setIsPlayingAudio(false); }
    stopMic();
    resetMic();
    resetConfidence();
    sseRef.current?.close();
    setQuestionText('');
    setAnswer('');
    setEvaluation(null);
    setCurrentDecision(decisionOverride);
    avatarControllerRef.current?.setState('thinking');

    // v2: If we have a pre-decided question, skip SSE and display it directly
    if (decisionOverride?.question) {
      setIsStreaming(false);
      setPhase('questioning');
      setTimerStarted(true);
      setQuestionText(decisionOverride.question);
      setQuestionIndex(prev => prev + 1);
      questionStartTimeRef.current = Date.now();
      setTimeout(() => {
        avatarControllerRef.current?.setState('speaking');
        playQuestionSpeech(decisionOverride.question, () => {
          setPhase('answering');
          if (inputMode === 'speak') {
            startMic();
          } else {
            setTimeout(() => answerRef.current?.focus(), 100);
          }
        });
      }, 300);
      return;
    }

    setIsStreaming(true);
    setPhase('questioning');

    sseRef.current = streamQuestion(sid, {
      onMeta: (meta) => { setQuestionIndex(meta.questionIndex); setMaxQuestions(meta.maxQuestions); },
      onChunk: ({ text }) => { setQuestionText((prev) => prev + text); setTimerStarted(true); },
      onDone: (data) => {
        setIsStreaming(false);
        const qi = data.questionIndex !== undefined ? data.questionIndex : data.question_index;
        const qText = data.question;
        setQuestionIndex(qi + 1);
        questionStartTimeRef.current = Date.now();
        avatarControllerRef.current?.setState('speaking');
        if (qText) {
          playQuestionSpeech(qText, () => {
            setPhase('answering');
            setTimerStarted(true);
            if (inputMode === 'speak') {
              startMic();
            } else {
              setTimeout(() => answerRef.current?.focus(), 100);
            }
          });
        }
      },
      onError: (err) => { setIsStreaming(false); setQuestionText(`Error: ${err.message}`); setPhase('error'); avatarControllerRef.current?.setState('idle'); },
    });
  }, [audio, playQuestionSpeech, resetConfidence, inputMode, startMic]);

  useEffect(() => {
    let active = true;
    if (sessionId) {
      (async () => {
        try {
          setPhase('init');
          const sessionData = await getSession(sessionId);
          if (!active) return;
          setMaxQuestions(sessionData.maxQuestions);
          setQuestionIndex(sessionData.questionIndex);
          askNextQuestion(sessionId);
        } catch (err) {
          if (!active) return;
          console.error("Failed to restore session details:", err);
          askNextQuestion(sessionId);
        }
      })();
      return;
    }
    (async () => {
      try {
        setPhase('init');
        const meta = await startSession(sessionConfig);
        if (!active) { deleteSession(meta.sessionId).catch(() => {}); return; }
        setSId(meta.sessionId);
        setSessionId(meta.sessionId);
        setMaxQuestions(meta.maxQuestions);
        askNextQuestion(meta.sessionId);
      } catch (err) {
        if (!active) return;
        setPhase('error');
        setQuestionText(`Failed to start session: ${err.message}`);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitAnswer = async () => {
    const finalAnswer = (isListening ? liveText : answer).trim();
    if (!finalAnswer || isEvaluating) return;
    stopMicIfActive();
    setAnswer(finalAnswer);
    setIsEvaluating(true);
    setPhase('evaluating');
    avatarControllerRef.current?.setState('thinking');
    try {
      // Pass the voice metrics to the backend evaluation
      const result = await evaluateAnswer(sessionId, finalAnswer, confidenceMetrics);
      const score = result.evaluation?.score ?? 60;
      setEvaluation(result.evaluation);
      setAvgScore(result.averageScore);
      setPhase('evaluated');

      if (inputMode === 'speak') {
        if (!practiceMode) {
          // Real Simulation mode: immediately auto-progress without audio feedback
          if (questionIndex >= maxQuestions) {
            go('results');
          } else {
            let nextDecision = null;
            try {
              nextDecision = await recordAnswerAndDecide(finalAnswer, score);
            } catch (e) {
              console.error("Error deciding next question:", e);
            }
            askNextQuestion(sessionId, nextDecision);
          }
        } else {
          // Practice mode: speak feedback and wait for user to click next
          const feedbackText = result.evaluation?.verbal_feedback || "Good points. Let's move forward.";
          avatarControllerRef.current?.setState('speaking');

          // Pre-fetch the decision in background
          if (questionIndex < maxQuestions) {
            recordAnswerAndDecide(finalAnswer, score).catch(() => {});
          }

          playQuestionSpeech(feedbackText, () => {
            // Once feedback ends, just stay on the evaluated phase so they can click next or get suggested answer.
          });
        }
      } else {
        if (score >= 80) avatarControllerRef.current?.smile('idle');
        else avatarControllerRef.current?.setState('idle');

        if (questionIndex < maxQuestions - 1) {
          recordAnswerAndDecide(finalAnswer, score).catch(() => {}); // non-blocking
        }
      }
    } catch (err) {
      setEvaluation({ score: 0, grade: 'Error', strengths: '', improvements: err.message, tip: '' });
      setPhase('error');
      avatarControllerRef.current?.setState('idle');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = useCallback(() => {
    stopMicIfActive();
    if (questionIndex >= maxQuestions) { go('results'); return; }
    // v2: Use pre-fetched decision if available (non-blocking, already ready)
    // We import consumeDecision from the hook for this
    askNextQuestion(sessionId);
  }, [stopMicIfActive, questionIndex, maxQuestions, go, askNextQuestion, sessionId]);

  const handleFinish = () => {
    // TEMPORARILY DISABLED: Stop fraud event flushing on finish
    // if (sessionId) flushFraud(sessionId).catch(() => {});
    go('results');
  };

  const isDone = questionIndex >= maxQuestions && phase === 'evaluated';

  const phaseColor = {
    init: COLORS.amber, questioning: COLORS.blue, answering: COLORS.signal,
    evaluating: COLORS.amber, evaluated: COLORS.signal, done: COLORS.signal, error: COLORS.alarm,
  }[phase] || COLORS.steel;

  const phaseLabel = {
    init: 'STARTING…', questioning: 'AI SPEAKING', answering: 'YOUR TURN',
    evaluating: 'ANALYSING', evaluated: 'REVIEWED', done: 'COMPLETE', error: 'ERROR',
  }[phase] || phase.toUpperCase();

  // ── Ejection overlay ─────────────────────────────────────────────
  const ejectionOverlay = fraudEjection && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,10,0.98)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{ fontSize: '3rem' }}>🚫</div>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: '1.2rem',
        fontWeight: 700, color: COLORS.alarm, textAlign: 'center',
      }}>Interview Terminated</div>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
        color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380, lineHeight: 1.7,
      }}>{EJECT_LABELS[fraudEjection.type] || 'Integrity violation detected.'}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
        Returning to dashboard…
      </div>
    </div>
  );

  const warningToast = fraudWarning && (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 8888, minWidth: 320,
      background: 'var(--panel)', border: '1px solid rgba(245,158,11,0.4)',
      borderRadius: 10, color: 'var(--text-primary)',
      padding: '12px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>
          Warning {fraudWarning.warningNum} / 2
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {WARN_LABELS[fraudWarning.type]} — one more will end the interview.
        </div>
      </div>
    </div>
  );

  return (
    <>
      {ejectionOverlay}
      {warningToast}
      <style>{`
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes wave     { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
        @keyframes micPulse { 0%,100%{box-shadow:0 0 0 6px rgba(99,102,241,0.15)} 50%{box-shadow:0 0 0 14px rgba(99,102,241,0.04)} }
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        .interview-shell {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          gap: 8px;
          padding: 8px;
          box-sizing: border-box;
        }

        /* ── Top bar ── */
        .iv-topbar {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
        }

        /* ── Body: 3-column grid ── */
        .iv-body {
          flex: 1 1 0;
          min-height: 0;
          display: grid;
          grid-template-columns: 210px 1fr 210px;
          gap: 8px;
          overflow: hidden;
        }

        .iv-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
        }
        .iv-col::-webkit-scrollbar { width: 4px; }
        .iv-col::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

        .iv-panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          flex-shrink: 0;
        }
        .iv-panel.grow {
          flex: 1 1 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .iv-question-body {
          flex: 1 1 0;
          min-height: 0;
          padding: 14px;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow-y: auto;
        }
        .iv-question-body::-webkit-scrollbar { width: 3px; }
        .iv-question-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

        .iv-answer-area {
          flex: 1 1 0;
          min-height: 80px;
          width: 100%;
          background: var(--panel2);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
          resize: none;
          outline: none;
          line-height: 1.6;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .iv-answer-area:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .iv-camera {
          width: 100%;
          aspect-ratio: 4/3;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 8px;
          object-fit: cover;
          display: block;
        }

        .iv-progress-track {
          height: 3px;
          background: var(--panel2);
          border-radius: 99px;
          margin-top: 6px;
        }
        .iv-progress-fill {
          height: 100%;
          background: var(--signal, #00ff88);
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        .iv-kv { display: flex; justify-content: space-between; align-items: center; }
        .iv-kv + .iv-kv { margin-top: 8px; }
        .iv-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--steel); }
        .iv-val   { font-size: 0.7rem; font-weight: 700; }

        .iv-divider { border: none; border-top: 1px solid var(--panel2); margin: 8px 0; }
      `}</style>

      <div className="interview-shell">

        {/* ══ TOP BAR ══ */}
        <div className="iv-topbar">
          {/* Left: timer */}
          {inputMode !== 'speak' ? (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtTime(elapsed)}</div>
          ) : (
            <div style={{ width: 60 }} />
          )}

          {/* Center: progress */}
          <div style={{ minWidth: 220, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1 }}>
              Question {Math.min(questionIndex + 1, maxQuestions)} / {maxQuestions}
            </div>
            <div className="iv-progress-track" style={{ width: '100%' }}>
              <div className="iv-progress-fill" style={{ width: `${(questionIndex / maxQuestions) * 100}%` }} />
            </div>
          </div>

          {/* Right: status + avg score */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            {avgScore !== null && (
              <div style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', fontWeight: 700,
                color: avgScore >= 80 ? COLORS.signal : avgScore >= 60 ? COLORS.amber : COLORS.alarm,
                background: `${avgScore >= 80 ? COLORS.signal : avgScore >= 60 ? COLORS.amber : COLORS.alarm}18`,
                padding: '2px 8px', borderRadius: 12,
              }}>
                avg {avgScore}%
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.75rem', fontWeight: 600, color: phaseColor,
            }}>
              <Radio size={11} style={{ animation: phase === 'answering' ? 'pulse 1.5s infinite' : 'none' }} />
              {phaseLabel}
            </div>
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div className="iv-body">

          {/* ── LEFT COLUMN ── */}
          <div className="iv-col">
            {/* Camera */}
            {!cameraOff && (
              <div className="iv-panel" style={{ padding: '10px' }}>
                <div className="iv-label" style={{ marginBottom: 6 }}>Webcam</div>
                <video ref={videoRef} autoPlay playsInline muted className="iv-camera" />
              </div>
            )}

            {/* Session info */}
            <div className="iv-panel">
              <div className="iv-label" style={{ marginBottom: 8 }}>Session</div>
              <div style={{ fontSize: '0.72rem' }}>
                <div className="iv-kv">
                  <span style={{ color: 'var(--text-muted)' }}>Type</span>
                  <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sessionConfig?.type || '—'}</b>
                </div>
                <div className="iv-kv">
                  <span style={{ color: 'var(--text-muted)' }}>Difficulty</span>
                  <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sessionConfig?.difficulty || '—'}</b>
                </div>
                <div className="iv-kv">
                  <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                  <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sessionConfig?.duration || '—'}</b>
                </div>
                <div className="iv-kv">
                  <span style={{ color: 'var(--text-muted)' }}>Questions</span>
                  <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{questionIndex} / {maxQuestions}</b>
                </div>
                {inputMode !== 'speak' && (
                  <div className="iv-kv">
                    <span style={{ color: 'var(--text-muted)' }}>Time</span>
                    <b style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: 'var(--accent)' }}>{fmtTime(elapsed)}</b>
                  </div>
                )}
              </div>
            </div>

            {/* Audio input indicator */}
            <div className="iv-panel">
              <div className="iv-label" style={{ marginBottom: 6 }}>Audio Input</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: inputMode === 'speak' ? COLORS.signal : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: inputMode === 'speak' && isListening ? COLORS.signal : 'var(--text-faint)', flexShrink: 0, display: 'inline-block' }} />
                {inputMode === 'speak'
                  ? isListening ? 'Recording' : 'Standby (voice)'
                  : 'Keyboard only'}
              </div>
            </div>

            {/* Keyboard shortcut */}
            <div className="iv-panel" style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
                <kbd style={{ background: 'var(--panel2)', padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.65rem' }}>Ctrl</kbd>
                {' + '}
                <kbd style={{ background: 'var(--panel2)', padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.65rem' }}>Enter</kbd>
                {' to submit'}
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN ── */}
          <div className="iv-col">

            {/* AI Question panel — grows to fill */}
            <div className="iv-panel grow">
              {/* v2: Avatar header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexShrink: 0 }}>
                <InterviewerAvatar state={avatarState} personality={avatarPersonality} size={72} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* v2: Decision metadata chips */}
                  {currentDecision && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                      {/* Skill chip */}
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600,
                        padding: '2px 8px', background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
                        borderRadius: 20, letterSpacing: '0.04em',
                      }}>
                        {currentDecision.skill}
                      </span>
                      {/* Difficulty chip */}
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600,
                        padding: '2px 8px', borderRadius: 20,
                        border: `1px solid ${currentDecision.difficulty === 'increase' ? COLORS.alarm + '55' : currentDecision.difficulty === 'decrease' ? COLORS.signal + '55' : 'var(--border)'}`,
                        color: currentDecision.difficulty === 'increase' ? COLORS.alarm : currentDecision.difficulty === 'decrease' ? COLORS.signal : 'var(--text-muted)',
                        background: 'var(--panel2)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {currentDecision.difficulty === 'increase' ? <TrendingUp size={9} /> : currentDecision.difficulty === 'decrease' ? <TrendingDown size={9} /> : <Minus size={9} />}
                        {currentDecision.difficulty}
                      </span>
                      {/* Action chip */}
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600,
                        padding: '2px 8px', borderRadius: 20,
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                        color: COLORS.amber,
                      }}>
                        {currentDecision.action?.replace('_', ' ')}
                      </span>
                      {/* Time estimate */}
                      {currentDecision.estimated_time && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600,
                          padding: '2px 8px', borderRadius: 20,
                          border: '1px solid var(--border)', color: 'var(--text-faint)',
                          background: 'var(--panel2)',
                        }}>
                          ~{currentDecision.estimated_time}s
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {currentDecision ? currentDecision.action?.replace('_', ' ') || 'AI Interviewer' : 'AI Interviewer'}
                    </span>
                    {isStreaming || isDeciding ? (
                      <Loader2 size={12} style={{ color: COLORS.amber, animation: 'spin 1s linear infinite' }} />
                    ) : (
                      questionText && (
                        <button
                          onClick={handleToggleAudio}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            border: `1px solid ${isPlayingAudio ? COLORS.alarm + '55' : 'var(--border)'}`,
                            background: isPlayingAudio ? 'rgba(239,68,68,0.1)' : 'var(--panel2)',
                            color: isPlayingAudio ? COLORS.alarm : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600,
                          }}
                        >
                          <Volume2 size={11} style={{ animation: isPlayingAudio ? 'pulse 1s ease-in-out infinite' : 'none' }} />
                          {isPlayingAudio ? 'Playing' : 'Listen'}
                        </button>
                      )
                    )}
                  </div>

                  {/* v2: Reason tooltip */}
                  {currentDecision?.reason && (
                    <div style={{
                      fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={currentDecision.reason}>
                      {currentDecision.reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Question body — scrollable, fills remaining space */}
              <div className="iv-question-body">
                {phase === 'init' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', flexShrink: 0 }} />
                    Starting your {sessionConfig?.type} session…
                  </div>
                )}
                {phase === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: COLORS.alarm, fontSize: '0.8rem' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    {questionText}
                  </div>
                )}
                {(phase === 'questioning' || phase === 'answering' || phase === 'evaluating' || phase === 'evaluated') && (
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {questionText}
                    {isStreaming && (
                      <span style={{
                        display: 'inline-block', width: 2, height: '1em',
                        background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom',
                        animation: 'blink 0.8s steps(1) infinite',
                      }} />
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Answer panel — grows to fill */}
            {(phase === 'answering' || phase === 'evaluating' || phase === 'evaluated' || phase === 'error') && (
              <div className="iv-panel grow">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {inputMode === 'speak' ? 'Voice Analyzer' : 'Your Answer'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {inputMode !== 'speak' && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>{answer.length} chars</span>
                    )}
                    {phase === 'answering' && speechSupported && (
                      <div style={{ display: 'flex', gap: 3, background: 'var(--panel2)', borderRadius: 20, padding: '2px 3px', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => { stopMicIfActive(); setInputMode('type'); }}
                          style={{
                            fontSize: '0.65rem', fontWeight: 600,
                            padding: '2px 10px', borderRadius: 20,
                            background: inputMode === 'type' ? 'var(--panel)' : 'transparent',
                            color: inputMode === 'type' ? 'var(--text-primary)' : 'var(--text-faint)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: inputMode === 'type' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >Type</button>
                        <button
                          onClick={() => setInputMode('speak')}
                          style={{
                            fontSize: '0.65rem', fontWeight: 600,
                            padding: '2px 10px', borderRadius: 20,
                            background: inputMode === 'speak' ? 'var(--panel)' : 'transparent',
                            color: inputMode === 'speak' ? COLORS.signal : 'var(--text-faint)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: inputMode === 'speak' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >Speak</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SPEAK MODE UI (Voice Call visualizer) ── */}
                {inputMode === 'speak' ? (
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '20px', gap: 12, minHeight: '180px',
                  }}>
                    {(phase === 'answering' || phase === 'questioning' || phase === 'init') && (
                      <>
                        {/* Waveform / pulsing circle */}
                        <button
                          onClick={toggleMic}
                          disabled={phase !== 'answering'}
                          style={{
                            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
                            background: isListening ? 'rgba(239,68,68,0.12)' : 'var(--panel)',
                            border: `2px solid ${isListening ? COLORS.alarm : 'var(--border)'}`,
                            display: 'grid', placeItems: 'center',
                            cursor: phase === 'answering' ? 'pointer' : 'not-allowed',
                            animation: isListening ? 'micPulse 1.5s ease-in-out infinite' : 'none',
                            transition: 'border-color 0.2s, background 0.2s',
                          }}
                        >
                          {isListening ? (
                            <MicOff size={22} style={{ color: COLORS.alarm }} />
                          ) : (
                            <Mic size={22} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '0.75rem', fontWeight: 700,
                            color: isListening ? COLORS.alarm : 'var(--text-muted)',
                            letterSpacing: '0.06em',
                          }}>
                            {isListening ? '● AI is listening' : phase === 'answering' ? '○ Mic standby' : 'Waiting for AI'}
                          </div>
                          <p style={{
                            fontSize: '0.72rem', color: 'var(--text-faint)',
                            marginTop: 4, maxWidth: '260px', margin: '4px auto 0',
                            lineHeight: 1.5,
                          }}>
                            {isListening
                              ? 'Speak clearly. Click the button below to submit.'
                              : phase === 'answering'
                              ? 'Click the microphone button to begin speaking.'
                              : 'Please wait until the AI finishes speaking.'}
                          </p>
                        </div>

                        {/* Speech transcript preview */}
                        {liveText && (
                          <div style={{
                            width: '100%', fontSize: '0.72rem', color: 'var(--text-primary)',
                            textAlign: 'center', fontStyle: 'italic',
                            opacity: 0.85, padding: '8px 10px',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            maxHeight: '64px', overflowY: 'auto', lineHeight: 1.5,
                          }}>
                            "{liveText}"
                          </div>
                        )}

                        <BrutalButton
                          icon={Send}
                          onClick={handleSubmitAnswer}
                          disabled={!liveText.trim() || phase !== 'answering'}
                          className="w-full"
                          style={{
                            background: COLORS.signal,
                            borderColor: COLORS.signal,
                            color: 'var(--ink)',
                          }}
                        >
                          Done Speaking
                        </BrutalButton>
                      </>
                    )}

                    {phase === 'evaluating' && (
                      <div style={{ textAlign: 'center', padding: 12 }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: COLORS.amber, margin: '0 auto 10px' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.amber }}>
                          Analyzing voice &amp; content
                        </div>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                          Analyzing speaking rate, pauses, and content quality…
                        </p>
                      </div>
                    )}

                    {phase === 'evaluated' && (
                      <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: COLORS.signal }}>
                          Speech Analysis Complete
                        </div>
                        {practiceMode && evaluation?.verbal_feedback && (
                          <div style={{
                            background: 'var(--panel)',
                            padding: '10px 14px',
                            border: '1px solid var(--border)', borderRadius: 8,
                            textAlign: 'left', fontSize: '0.8rem',
                            lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-primary)',
                          }}>
                            "{evaluation.verbal_feedback}"
                          </div>
                        )}
                        {isPlayingAudio ? (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', animation: 'pulse 1.5s infinite' }}>
                            AI is speaking. Please wait…
                          </div>
                        ) : (
                          <BrutalButton icon={isDone ? CheckCircle2 : ChevronRight} onClick={isDone ? handleFinish : handleNextQuestion} className="w-full mt-2">
                            {isDone ? 'View Results' : 'Next Question'}
                          </BrutalButton>
                        )}
                      </div>
                    )}

                    {phase === 'error' && (
                      <div style={{ textAlign: 'center', padding: 12, color: COLORS.alarm }}>
                        <AlertTriangle size={22} style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Voice Analysis Failed</div>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {evaluation?.improvements || 'Speech synthesis or connection failed.'}
                        </p>
                        <BrutalButton icon={SkipForward} onClick={handleNextQuestion} className="mt-3 w-full">
                          Continue Interview
                        </BrutalButton>
                      </div>
                    )}
                  </div>
                ) : (
                  // ── TYPE MODE UI (Original Textarea) ──
                  <>
                    <textarea
                      ref={answerRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={phase === 'evaluating' || phase === 'evaluated'}
                      placeholder="Type your answer here…"
                      className="iv-answer-area"
                      style={{ opacity: phase === 'evaluated' ? 0.7 : 1 }}
                      onFocus={() => setIsTyping(true)}
                      onBlur={() => setIsTyping(false)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmitAnswer(); }}
                    />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexShrink: 0 }}>
                      {phase === 'answering' && (
                        <>
                          <BrutalButton icon={Send} onClick={handleSubmitAnswer} disabled={!answer.trim()} className="flex-1">
                            Submit
                          </BrutalButton>
                          <BrutalButton icon={SkipForward} variant="outline" onClick={handleNextQuestion}>
                            Skip
                          </BrutalButton>
                        </>
                      )}
                      {phase === 'evaluated' && (
                        <BrutalButton icon={isDone ? CheckCircle2 : ChevronRight} onClick={isDone ? handleFinish : handleNextQuestion} className="flex-1">
                          {isDone ? 'View Results' : 'Next Question'}
                        </BrutalButton>
                      )}
                    </div>

                    {phase === 'evaluating' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: COLORS.amber, fontSize: '0.68rem', flexShrink: 0 }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Evaluating with AI…
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Evaluation card */}
            {practiceMode && evaluation && (
              <div style={{ flexShrink: 0 }}>
                <EvaluationCard 
                  evaluation={evaluation} 
                  question={questionText} 
                  answer={answer} 
                  sessionConfig={sessionConfig} 
                  onNext={isDone ? handleFinish : handleNextQuestion}
                  isDone={isDone}
                />
                {/* v2: Practice mode encouragement */}
                {evaluation && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px',
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 8,
                    fontSize: '0.72rem', color: COLORS.signal,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Zap size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <b>Practice tip: </b>
                      {evaluation.score >= 80
                        ? 'Excellent! You clearly understand this topic. Keep this structure in real interviews.'
                        : evaluation.score >= 60
                        ? `Good start. ${evaluation.improvements || 'Try to be more specific next time.'}`
                        : `Don't worry — here's a hint: ${evaluation.tip || 'Try breaking your answer into key points.'}`
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="iv-col">
            {/* Live status */}
            <div className="iv-panel">
              <div className="iv-label" style={{ marginBottom: 6 }}>Status</div>
              <div className="iv-mono font-bold" style={{ fontSize: '0.75rem', color: phaseColor }}>
                {phaseLabel}
              </div>
            </div>

            {/* v2: Confidence analytics */}
            <ConfidenceDashboard
              metrics={confidenceMetrics}
              active={phase === 'answering'}
            />

            {/* Integrity monitor */}
            <div className="iv-panel grow">
              <div className="iv-label" style={{ marginBottom: 8 }}>{practiceMode ? 'Practice Monitor' : 'Integrity Monitor'}</div>
              <FraudMonitor
                fraudScore={fraudScore}
                fraudRisk={practiceMode ? 'LOW' : fraudRisk}
                events={fraudEvents}
                isMonitoring={isMonitoring && !practiceMode}
                faceApiReady={faceApiReady}
                cameraDisabled={cameraDisabled}
                micDisabled={micDisabled}
                warningCounts={practiceMode ? {} : warningCounts}
                cameraOff={cameraOff}
              />
            </div>

            {/* Finish button */}
            <div className="iv-panel" style={{ marginTop: 'auto' }}>
              <BrutalButton icon={Star} variant="outline" onClick={handleFinish} className="w-full">
                Finish Interview
              </BrutalButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}