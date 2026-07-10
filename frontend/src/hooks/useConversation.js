/**
 * useConversation — manages adaptive conversational interview flow.
 *
 * Calls POST /api/interview/decide after each evaluated answer.
 * Returns a rich decision object the UI uses to show:
 *   - Why the question was asked (reason)
 *   - Which skill is being probed (skill)
 *   - Difficulty direction (increase / maintain / decrease)
 *   - Estimated answer time
 *
 * Falls back gracefully to the SSE /ask endpoint if the decision
 * engine fails or times out.
 */

import { useState, useCallback, useRef } from 'react';

const BASE = 'http://localhost:8000/api';

/**
 * @typedef {Object} Decision
 * @property {string} action         - follow_up | clarify | challenge | new_topic | behavioral | coding
 * @property {string} reason         - Why this question was chosen
 * @property {string} difficulty     - increase | maintain | decrease
 * @property {string} skill          - Skill being targeted
 * @property {string} question       - The actual question text
 * @property {string} expected_depth - low | medium | high
 * @property {number} estimated_time - Estimated seconds for answer
 * @property {boolean} [_fallback]   - true if LLM failed and fallback was used
 */

export function useConversation(sessionId) {
  /** @type {[Decision|null, Function]} */
  const [pendingDecision, setPendingDecision] = useState(null);
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const abortRef = useRef(null);

  /**
   * Append an answer to the conversation log (called after evaluation).
   * Then immediately trigger the decision engine for the next question.
   */
  const recordAnswerAndDecide = useCallback(async (answerText, score) => {
    if (!sessionId) return null;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsDeciding(true);
    setDecisionError(null);
    setPendingDecision(null);

    try {
      const res = await fetch(`${BASE}/interview/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Decision failed: ${res.status}`);
      }

      /** @type {Decision} */
      const decision = await res.json();
      setPendingDecision(decision);
      return decision;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.warn('[useConversation] Decision engine failed, will fall back to /ask:', err.message);
      setDecisionError(err.message);
      return null; // caller should fall back to SSE /ask
    } finally {
      setIsDeciding(false);
    }
  }, [sessionId]);

  /**
   * Consume the pending decision (call when displaying the next question).
   * Clears state so it can't be used twice.
   */
  const consumeDecision = useCallback(() => {
    const d = pendingDecision;
    setPendingDecision(null);
    return d;
  }, [pendingDecision]);

  /** Clear any pending decision (e.g. on session reset). */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPendingDecision(null);
    setIsDeciding(false);
    setDecisionError(null);
  }, []);

  return {
    pendingDecision,
    isDeciding,
    decisionError,
    recordAnswerAndDecide,
    consumeDecision,
    reset,
  };
}
