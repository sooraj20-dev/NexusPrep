/**
 * TTSManager — singleton factory for TTS providers.
 *
 * Usage:
 *   import { ttsManager } from './TTSManager';
 *   ttsManager.speak(text, { personality: 'friendly' });
 *   ttsManager.stop();
 *
 * To swap providers in the future:
 *   ttsManager.setProvider(new AzureTTS(config));
 */

import { BrowserTTS } from './BrowserTTS';

// Personality-to-TTS-options mapping
// These values align with backend/data/personalities.py
export const PERSONALITY_TTS = {
  friendly: {
    rate: 1.0,
    pitch: 1.15,
    voiceKeywords: ['google us english', 'zira', 'samantha', 'female', 'en-us']
  },
  professional: {
    rate: 0.95,
    pitch: 1.0,
    voiceKeywords: ['google uk english female', 'samantha', 'david', 'en-gb', 'en-us']
  },
  strict: {
    rate: 0.9,
    pitch: 0.85,
    voiceKeywords: ['google uk english male', 'david', 'daniel', 'male', 'en-gb']
  },
  senior_engineer: {
    rate: 1.0,
    pitch: 0.92,
    voiceKeywords: ['google us english male', 'david', 'en-us', 'male']
  },
  hr: {
    rate: 1.05,
    pitch: 1.1,
    voiceKeywords: ['google uk english female', 'hazel', 'samantha', 'female', 'en-gb']
  },
  startup_founder: {
    rate: 1.12,
    pitch: 1.02,
    voiceKeywords: ['google us english', 'david', 'en-us']
  },
};

class TTSManager {
  constructor() {
    this._provider = new BrowserTTS();
    this._currentPersonality = 'professional';
    this._onBoundary = null; // callback for mouth-sync (Feature 5)
    this._onStart = null;
    this._onEnd = null;
  }

  /** Replace the active TTS provider (e.g. to swap in Azure/ElevenLabs). */
  setProvider(provider) {
    this.stop();
    this._provider = provider;
  }

  /** @returns {boolean} */
  get isSupported() {
    return this._provider.isSupported;
  }

  /** @returns {boolean} */
  get isSpeaking() {
    return this._provider.isSpeaking;
  }

  setPersonality(personality) {
    this._currentPersonality = personality;
  }

  /**
   * Speak text using current personality TTS settings.
   * @param {string} text
   * @param {string?} personalityOverride
   * @returns {Promise<void>}
   */
  async speak(text, personalityOverride) {
    const personality = personalityOverride || this._currentPersonality;
    const options = PERSONALITY_TTS[personality] || PERSONALITY_TTS.professional;
    this._onStart?.();
    try {
      await this._provider.speak(text, options);
    } finally {
      this._onEnd?.();
    }
  }

  stop() {
    this._provider.stop();
    this._onEnd?.();
  }

  pause() { this._provider.pause(); }
  resume() { this._provider.resume(); }

  /** Register callbacks for avatar mouth-sync (Feature 5). */
  on(event, cb) {
    if (event === 'start')  this._onStart = cb;
    if (event === 'end')    this._onEnd   = cb;
    if (event === 'boundary') this._onBoundary = cb;
  }
}

// Singleton instance shared across the app
export const ttsManager = new TTSManager();
