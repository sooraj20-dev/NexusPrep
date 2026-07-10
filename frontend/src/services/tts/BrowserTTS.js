/**
 * BrowserTTS — Web Speech SpeechSynthesis implementation of TTSProvider.
 *
 * Wraps the browser's built-in SpeechSynthesis API.
 * Applies personality-driven rate, pitch, and preferred voice.
 */

import { TTSProvider } from './TTSProvider';

export class BrowserTTS extends TTSProvider {
  constructor() {
    super();
    this._utterance = null;
    this._speaking = false;
  }

  get isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  get isSpeaking() {
    return this._speaking;
  }

  /**
   * @param {string} text
   * @param {{ rate?: number, pitch?: number, voiceName?: string }} options
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    if (!this.isSupported || !text?.trim()) return Promise.resolve();

    this.stop();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text.replace(/[\r\n]+/g, ' '));
      utterance.rate  = Math.max(0.1, Math.min(10, options.rate  ?? 1.0));
      utterance.pitch = Math.max(0,   Math.min(2,  options.pitch ?? 1.0));
      utterance.lang  = 'en-US';
      utterance.volume = 1;

      // Try to find preferred voice using keywords in order of preference
      const voiceKeywords = options.voiceKeywords || (options.voiceName ? [options.voiceName] : []);
      if (voiceKeywords.length > 0) {
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;
        for (const keyword of voiceKeywords) {
          const match = voices.find(v =>
            v.lang.toLowerCase().startsWith('en') &&
            v.name.toLowerCase().includes(keyword.toLowerCase())
          );
          if (match) {
            selectedVoice = match;
            break;
          }
        }
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.onstart  = () => { this._speaking = true; };
      utterance.onend    = () => { this._speaking = false; this._utterance = null; resolve(); };
      utterance.onerror  = (e) => {
        this._speaking = false;
        this._utterance = null;
        // 'interrupted' is normal when stop() is called — not an error
        if (e.error === 'interrupted' || e.error === 'canceled') resolve();
        else reject(new Error(e.error));
      };

      this._utterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (!this.isSupported) return;
    this._speaking = false;
    this._utterance = null;
    window.speechSynthesis.cancel();
  }

  pause() {
    if (this.isSupported) window.speechSynthesis.pause();
  }

  resume() {
    if (this.isSupported) window.speechSynthesis.resume();
  }
}
