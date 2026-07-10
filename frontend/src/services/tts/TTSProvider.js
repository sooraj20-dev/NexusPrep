/**
 * TTSProvider — abstract base class for text-to-speech providers.
 *
 * Implementations:
 *   BrowserTTS  — Web Speech API (zero dependencies, current)
 *
 * Future providers can implement the same interface:
 *   AzureTTS, ElevenLabsTTS, PiperTTS, XTTS
 * without any changes to the UI or interview logic.
 */

export class TTSProvider {
  /** @type {boolean} */
  get isSupported() {
    return false;
  }

  /**
   * Speak the given text with optional personality-driven options.
   * @param {string} text
   * @param {{ rate?: number, pitch?: number, voice?: string }} options
   * @returns {Promise<void>} resolves when speech ends
   */
  // eslint-disable-next-line no-unused-vars
  async speak(text, options = {}) {
    throw new Error('TTSProvider.speak() must be implemented');
  }

  /**
   * Stop any currently playing speech.
   */
  stop() {}

  /**
   * Pause speech (if supported).
   */
  pause() {}

  /**
   * Resume paused speech (if supported).
   */
  resume() {}

  /** @returns {boolean} */
  get isSpeaking() {
    return false;
  }
}
