/**
 * useTTS — Text-to-Speech hook.
 *
 * On native (iOS/Android via Capacitor) → @capacitor-community/text-to-speech
 * On web (browser)                      → Web Speech API
 *
 * The public API is identical in both paths:
 *   { speaking, speak(text, opts), cancel, voices }
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { isNative } from "../utils/platform";

// ── Native TTS (Capacitor plugin) ───────────────────────────────────────────

let CapTTS = null;
if (isNative) {
  import("@capacitor-community/text-to-speech").then(m => { CapTTS = m.TextToSpeech; });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices]     = useState([]);
  const utteranceRef            = useRef(null);

  // Load available voices (Web Speech API — async in Chrome)
  useEffect(() => {
    if (isNative) return; // native voices handled by OS
    const load = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  /**
   * Speak the given text.
   * @param {string}   text
   * @param {object}   [opts]
   * @param {number}   [opts.rate=1.0]   - Speech rate (0.5–2)
   * @param {number}   [opts.pitch=1.0]  - Pitch (0–2)
   * @param {string}   [opts.lang="en-US"]
   * @param {string}   [opts.voiceName]  - Preferred voice name (exact match)
   * @param {Function} [opts.onStart]    - Called when speech actually starts
   * @param {Function} [opts.onEnd]      - Called when speech ends normally
   * @param {Function} [opts.onError]    - Called if speech fails to start or errors
   */
  const speak = useCallback((text, opts = {}) => {
    if (!text?.trim()) return;

    const rate  = opts.rate  ?? 1.0;
    const pitch = opts.pitch ?? 1.0;
    const lang  = opts.lang  ?? "en-US";
    const voiceName = opts.voiceName ?? "";
    const onStart   = opts.onStart ?? (() => {});
    const onEnd     = opts.onEnd ?? (() => {});
    const onError   = opts.onError ?? (() => {});

    // ── Native path (Capacitor) ─────────────────────────────────────────
    if (isNative) {
      if (!CapTTS) {
        onError(new Error("Native TTS is not ready yet"));
        return false;
      }

      setSpeaking(true);
      onStart();
      CapTTS.speak({
        text,
        lang,
        rate,
        pitch,
        volume: 1.0,
        category: "ambient",
      })
        .then(() => {
          setSpeaking(false);
          onEnd();
        })
        .catch((err) => {
          setSpeaking(false);
          onError(err instanceof Error ? err : new Error("Native TTS failed"));
        });
      return true;
    }

    // ── Web path (Speech Synthesis API) ──────────────────────────────────
    if (!window.speechSynthesis) {
      onError(new Error("Speech synthesis is unavailable on this device"));
      return false;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate  = rate;
    u.pitch = pitch;
    u.lang  = lang;

    // Pick voice — user-selected name takes priority
    const langPrefix = lang.slice(0, 2);
    let chosen = null;

    if (voiceName) {
      chosen = voices.find(v => v.name === voiceName);
    }

    if (!chosen) {
      // Score voices: prefer premium/natural/enhanced voices for the right language
      const PREMIUM_KEYWORDS = ["premium", "enhanced", "natural", "neural", "wavenet"];
      const candidates = voices.filter(v => v.lang === lang || v.lang.startsWith(langPrefix));

      if (candidates.length) {
        // Sort: premium first, then exact lang match, then local service
        candidates.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aPremium = PREMIUM_KEYWORDS.some(k => aName.includes(k)) ? 1 : 0;
          const bPremium = PREMIUM_KEYWORDS.some(k => bName.includes(k)) ? 1 : 0;
          if (bPremium !== aPremium) return bPremium - aPremium;
          const aExact = a.lang === lang ? 1 : 0;
          const bExact = b.lang === lang ? 1 : 0;
          if (bExact !== aExact) return bExact - aExact;
          // Prefer local voices (lower latency)
          const aLocal = a.localService ? 1 : 0;
          const bLocal = b.localService ? 1 : 0;
          return bLocal - aLocal;
        });
        chosen = candidates[0];
      }
    }

    if (chosen) u.voice = chosen;

    setSpeaking(true);

    u.onstart = () => {
      setSpeaking(true);
      onStart();
    };
    u.onend   = () => {
      setSpeaking(false);
      onEnd();
    };
    u.onerror = (event) => {
      setSpeaking(false);
      const message = typeof event?.error === "string"
        ? event.error
        : "Speech synthesis failed";
      onError(new Error(message));
    };

    try {
      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
      return true;
    } catch (err) {
      setSpeaking(false);
      onError(err instanceof Error ? err : new Error("Speech synthesis failed"));
      return false;
    }
  }, [voices]);

  const cancel = useCallback(() => {
    if (isNative && CapTTS) {
      CapTTS.stop().catch(() => {});
    } else {
      window.speechSynthesis?.cancel();
    }
    setSpeaking(false);
  }, []);

  return { speaking, speak, cancel, voices };
}
