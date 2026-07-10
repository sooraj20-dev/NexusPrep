/**
 * useSpeechRecognition — Web Speech API wrapper
 *
 * Memory usage : 0 MB  (runs entirely in the browser engine)
 * CPU usage    : ~0%   (native browser implementation)
 * Internet     : Chrome/Edge sends audio to Google for transcription
 * Fallback     : isSupported = false → UI can hide the mic button
 *
 * Behaviour
 * ─────────
 * • continuous = true   — keeps listening until stop() is called
 * • interimResults = true — shows live "in-progress" transcript
 * • Final transcript is appended to the answer via onTranscript callback
 * • liveText = finalBuffer + interimText (use this for textarea display)
 * • autoStopOnSilence: when true, stops after SILENCE_MS of silence
 *   (disabled by default — user controls stop with the mic button)
 * • Calling start() while already running is a no-op (safe)
 *
 * Bug fixes (2026-06-25)
 * ──────────────────────
 * • Added stoppingRef guard: prevents the onend auto-restart from racing
 *   with an in-flight stop(), which caused "aborted" errors.
 * • onTranscript stored in a ref so start() is stable across renders
 *   (no dep-chain re-creation that was causing the mic to be torn down).
 * • liveText returned from hook so InterviewPage can show interim words
 *   directly in the textarea without a separate italic preview.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const SILENCE_MS = 3000; // stop after 3 s of silence (only when autoStopOnSilence=true)

export function useSpeechRecognition({ onTranscript, lang = 'en-US', autoStopOnSilence = false }) {
  const [isListening,  setIsListening]  = useState(false);
  const [interimText,  setInterimText]  = useState('');
  const [liveText,     setLiveText]     = useState(''); // finalBuffer + interim for textarea
  const [error,        setError]        = useState(null);
  const isSupported = Boolean(SpeechRecognitionAPI);

  // Store callback in a ref so start() never needs it as a dependency
  const onTranscriptRef     = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const recognitionRef       = useRef(null);
  const silenceTimer         = useRef(null);
  const finalBufferRef       = useRef('');       // confirmed words this session
  const shouldBeListeningRef = useRef(false);    // user intent
  const stoppingRef          = useRef(false);    // deliberate stop in progress — blocks auto-restart

  // ── Reset silence timer every time new speech arrives ────────────────────
  const resetSilenceTimer = useCallback((stopFn) => {
    if (!autoStopOnSilence) return;
    clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      stopFn?.();
    }, SILENCE_MS);
  }, [autoStopOnSilence]);

  // ── Start listening ───────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    // If a stop is still in flight, defer start by a tick
    if (stoppingRef.current) {
      setTimeout(start, 80);
      return;
    }

    setError(null);
    setInterimText('');

    // Only clear the buffer on a fresh start (not a restart after onend)
    if (!shouldBeListeningRef.current) {
      finalBufferRef.current = '';
      setLiveText('');
    }
    shouldBeListeningRef.current = true;
    stoppingRef.current          = false;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang            = lang;
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (e) => {
      let interim = '';
      let newFinal = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          newFinal += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (newFinal) {
        finalBufferRef.current += newFinal;
        onTranscriptRef.current?.(finalBufferRef.current.trim());
      }

      setInterimText(interim);
      // Merge so textarea always shows the full live picture
      setLiveText((finalBufferRef.current + interim).trimStart());

      // Reset silence timer so we don't stop mid-sentence
      resetSilenceTimer(() => recognition.stop());
    };

    recognition.onerror = (e) => {
      if (e.error === 'aborted') {
        // 'aborted' is expected during a deliberate stop — not a real error
        return;
      }
      if (e.error === 'no-speech') {
        // Normal silence — not worth surfacing to the user
        return;
      }
      setError(`Mic error: ${e.error}`);
      // On real errors, abandon auto-restart
      shouldBeListeningRef.current = false;
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer.current);
      recognitionRef.current = null;

      if (stoppingRef.current) {
        // We explicitly stopped — don't restart
        stoppingRef.current = false;
        setIsListening(false);
        setInterimText('');
        return;
      }

      if (shouldBeListeningRef.current) {
        // Natural end (browser stops after a few seconds of silence in continuous mode)
        // Auto-restart to keep the session going
        setTimeout(() => {
          if (shouldBeListeningRef.current && !stoppingRef.current) {
            start();
          }
        }, 120);
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      // start() can throw if called too quickly after a previous stop
      recognitionRef.current = null;
      shouldBeListeningRef.current = false;
      setError(`Could not start microphone: ${err.message}`);
    }

    // Kick off silence watchdog only if auto-stop is enabled
    if (autoStopOnSilence) {
      resetSilenceTimer(() => recognition.stop());
    }
  // start is intentionally closed over lang + resetSilenceTimer + autoStopOnSilence
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, lang, resetSilenceTimer, autoStopOnSilence]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    stoppingRef.current          = true;   // ← blocks onend auto-restart
    clearTimeout(silenceTimer.current);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // recognitionRef is cleared in onend — don't null it here
      // to avoid a race where onend fires after we've already set it null
    } else {
      // Nothing running — clear the flag immediately
      stoppingRef.current = false;
      setIsListening(false);
      setInterimText('');
    }
  }, []);

  // ── Toggle (mic button handler) ───────────────────────────────────────────
  const toggle = useCallback(() => {
    if (shouldBeListeningRef.current) stop();
    else start();
  }, [start, stop]);

  // ── Reset buffer (call when moving to the next question) ─────────────────
  const reset = useCallback(() => {
    finalBufferRef.current = '';
    setLiveText('');
    setInterimText('');
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      stoppingRef.current          = true;
      clearTimeout(silenceTimer.current);
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    liveText,     // ← NEW: use this for the textarea value
    error,
    start,
    stop,
    toggle,
    reset,        // ← NEW: call between questions
  };
}
