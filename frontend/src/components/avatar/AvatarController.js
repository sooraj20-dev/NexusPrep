/**
 * AvatarController — state machine for the AI interviewer avatar.
 *
 * States:
 *   idle       → default, gentle breathing animation
 *   thinking   → processing animation (LLM generating)
 *   speaking   → mouth open/close animation (TTS playing)
 *   listening  → attentive pose (candidate answering)
 *   smiling    → brief expression after a good answer
 *   questioning → focused expression when asking
 *
 * Transitions:
 *   idle → thinking (LLM starts)  
 *   thinking → speaking (TTS starts)
 *   speaking → listening (TTS ends)
 *   listening → thinking (evaluation starts)
 *   any → smiling (brief 1.5s burst on good score)
 *
 * Future-ready:
 *   AvatarController only manages state. The rendering layer
 *   (InterviewerAvatar.jsx today) can be swapped to Three.js,
 *   Live2D, or Ready Player Me without touching interview logic.
 */

const VALID_STATES = ['idle', 'thinking', 'speaking', 'listening', 'smiling', 'questioning'];

export class AvatarController {
  constructor(onStateChange) {
    this._state = 'idle';
    this._onStateChange = onStateChange || (() => {});
    this._smileTimer = null;
    this._personality = 'professional';
  }

  get state() {
    return this._state;
  }

  get personality() {
    return this._personality;
  }

  /** Set the active interviewer personality (affects color/expression). */
  setPersonality(personality) {
    this._personality = personality;
    this._onStateChange(this._state, personality);
  }

  /**
   * Transition to a new avatar state.
   * @param {'idle'|'thinking'|'speaking'|'listening'|'smiling'|'questioning'} newState
   */
  setState(newState) {
    if (!VALID_STATES.includes(newState)) {
      console.warn(`[AvatarController] Unknown state: ${newState}`);
      return;
    }
    if (this._state === newState) return;
    this._state = newState;
    this._onStateChange(newState, this._personality);
  }

  /**
   * Trigger a brief smile (1.5s), then return to previous state.
   * @param {string} returnState — state to return to after smile
   */
  smile(returnState = 'idle') {
    clearTimeout(this._smileTimer);
    this.setState('smiling');
    this._smileTimer = setTimeout(() => {
      this.setState(returnState);
    }, 1500);
  }

  /** Handle interview phase changes from InterviewPage. */
  onPhaseChange(phase, score = null) {
    clearTimeout(this._smileTimer);
    switch (phase) {
      case 'init':
        this.setState('idle');
        break;
      case 'questioning':
        this.setState('thinking');
        break;
      case 'answering':
        // Brief 'questioning' then 'listening'
        this.setState('questioning');
        setTimeout(() => this.setState('listening'), 800);
        break;
      case 'evaluating':
        this.setState('thinking');
        break;
      case 'evaluated':
        if (score !== null && score >= 80) {
          this.smile('idle');
        } else {
          this.setState('idle');
        }
        break;
      default:
        this.setState('idle');
    }
  }

  /** Call when TTS starts speaking. */
  onSpeechStart() {
    this.setState('speaking');
  }

  /** Call when TTS ends. */
  onSpeechEnd() {
    if (this._state === 'speaking') {
      this.setState('listening');
    }
  }

  /** Cleanup timers. */
  destroy() {
    clearTimeout(this._smileTimer);
  }
}
