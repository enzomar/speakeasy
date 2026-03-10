/**
 * wakeWordDetector — Platform-aware cheap wake word detection.
 * =============================================================
 * Stage 1 of the two-stage listen pipeline.  Runs continuously with
 * minimal CPU/battery using the OS-level speech recognition engine.
 *
 * PLATFORMS:
 *   Web   → Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 *            Free, runs in Chrome/Edge/Safari. Streams interim results
 *            that we scan for the wake keyword(s).
 *
 *   Mobile → @capacitor-community/speech-recognition (native iOS/Android STT)
 *            Uses Apple Speech / Google STT — low power, on-device.
 *            Gracefully imported; falls back to Web Speech API if unavailable.
 *
 * API:
 *   const detector = createWakeWordDetector({
 *     keywords:  ["luma", "marco"],
 *     lang:      "en-US",
 *     onWake:    (transcript) => { … },   // keyword found in transcript
 *     onPartial: (text) => { … },         // optional: interim text stream
 *     onError:   (err) => { … },
 *   });
 *   await detector.start();
 *   detector.stop();
 *
 * PRIVACY: Web Speech API may route audio through cloud (browser-dependent).
 * Mobile native STT runs on-device on modern iOS 17+ / Android 13+.
 */

import { isNative, platform } from "../../shared/platform";

// ── Web Speech API implementation ─────────────────────────────────────────────

function createWebSpeechDetector({ keywords, lang, onWake, onPartial, onError }) {
  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!SpeechRecognition) {
    return {
      start: async () => { onError?.("SpeechRecognition not supported in this browser."); },
      stop:  () => {},
      isRunning: () => false,
      supported: false,
    };
  }

  let recognition = null;
  let running      = false;
  let intentional  = false; // user called stop()

  function matchesKeyword(text) {
    if (!keywords?.length) return true;
    const lower = text.toLowerCase();
    return keywords.some(kw => kw && lower.includes(kw.toLowerCase()));
  }

  function createRecognition() {
    const rec = new SpeechRecognition();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang           = lang || "en-US";

    rec.onresult = (event) => {
      // Scan results for wake keyword
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0]?.transcript?.trim() || "";

        onPartial?.(text);

        // Only trigger wake on FINAL results to avoid false positives from interim guesses
        if (result.isFinal && matchesKeyword(text)) {
          // Strip wake keyword and pass remaining text
          const stripped = stripKeywords(text, keywords);
          console.log("[WakeWord] matched:", text, "→ stripped:", stripped);
          onWake?.(stripped, text);
          // Restart to clear state and keep listening
          restart();
          return;
        }
      }
    };

    rec.onerror = (event) => {
      // "no-speech" and "aborted" are normal — just restart
      if (event.error === "no-speech" || event.error === "aborted") {
        if (running && !intentional) restart();
        return;
      }
      // "not-allowed" means mic blocked
      if (event.error === "not-allowed") {
        running = false;
        onError?.("Microphone access denied. Please enable it in Settings.");
        return;
      }
      onError?.(event.error);
      if (running && !intentional) restart();
    };

    rec.onend = () => {
      // Auto-restart if we didn't intentionally stop
      if (running && !intentional) {
        setTimeout(() => {
          if (running && !intentional) restart();
        }, 200);
      }
    };

    return rec;
  }

  let restartPending = false; // guard against double-restart race

  function restart() {
    if (restartPending) return; // prevent stacking restarts
    restartPending = true;
    try { recognition?.stop(); } catch { /* ignore */ }
    recognition = null;
    if (running && !intentional) {
      setTimeout(() => {
        restartPending = false;
        if (running && !intentional) {
          try {
            recognition = createRecognition();
            recognition.start();
          } catch (e) {
            onError?.(e.message);
          }
        }
      }, 300);
    } else {
      restartPending = false;
    }
  }

  return {
    start: async () => {
      if (running) return;
      running     = true;
      intentional = false;
      try {
        recognition = createRecognition();
        recognition.start();
      } catch (e) {
        running = false;
        onError?.(e.message);
      }
    },

    stop: () => {
      intentional = true;
      running     = false;
      try { recognition?.stop(); } catch { /* ignore */ }
      recognition = null;
    },

    isRunning: () => running,
    supported: true,
  };
}

// ── Capacitor native STT implementation ───────────────────────────────────────

function createNativeDetector({ keywords, lang, onWake, onPartial, onError }) {
  let running  = false;
  let plugin   = null;
  let listener = null;

  function matchesKeyword(text) {
    if (!keywords?.length) return false; // no keywords → never wake
    const lower = text.toLowerCase();
    return keywords.some(kw => kw && lower.includes(kw.toLowerCase()));
  }

  return {
    start: async () => {
      if (running) return;
      try {
        // Dynamic import — only loaded on native
        // Use string concatenation to prevent Vite from statically analysing
        // and attempting to resolve this optional native-only package at dev time.
        const pkgName = "@capacitor-community" + "/speech-recognition";
        const mod = await import(/* @vite-ignore */ pkgName);
        plugin = mod.SpeechRecognition;

        // Request permission
        const { speechRecognition } = await plugin.requestPermissions();
        if (speechRecognition !== "granted") {
          onError?.("Speech recognition permission denied.");
          return;
        }

        running = true;

        // Listen for partial results
        listener = await plugin.addListener("partialResults", (data) => {
          const text = data.matches?.[0] || data.value || "";
          onPartial?.(text);

          if (matchesKeyword(text)) {
            const stripped = stripKeywords(text, keywords);
            onWake?.(stripped, text);
            // Restart to clear and keep listening
            plugin.stop().catch(() => {});
            if (running) {
              setTimeout(() => startNativeListening(), 500);
            }
          }
        });

        await startNativeListening();

      } catch (err) {
        running = false;
        // Fallback: plugin not installed, use web speech
        onError?.("Native STT unavailable: " + (err.message || err));
      }
    },

    stop: () => {
      running = false;
      try {
        plugin?.stop();
        listener?.remove();
      } catch { /* ignore */ }
      plugin   = null;
      listener = null;
    },

    isRunning: () => running,
    supported: true, // assumed if we're on native
  };

  async function startNativeListening() {
    if (!running || !plugin) return;
    try {
      await plugin.start({
        language:       lang || "en-US",
        partialResults: true,
        popup:          false, // no native UI overlay
      });
    } catch (err) {
      if (running) {
        // Retry once after a short delay
        setTimeout(() => {
          if (running) plugin?.start({
            language:       lang || "en-US",
            partialResults: true,
            popup:          false,
          }).catch(() => {});
        }, 1000);
      }
    }
  }
}

// ── Keyword stripping helper ──────────────────────────────────────────────────

function stripKeywords(text, keywords) {
  if (!keywords?.length) return text;
  let result = text;
  for (const kw of keywords) {
    if (!kw) continue;
    // Remove keyword + optional trailing comma/colon + space
    const pattern = new RegExp(
      `\\b${escapeRegex(kw)}\\b[,:]?\\s*`, "gi"
    );
    result = result.replace(pattern, "");
  }
  return result.trim() || text;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * Create a platform-appropriate wake word detector.
 *
 * @param {object}   opts
 * @param {string[]} opts.keywords  — Wake words to detect (any match triggers)
 * @param {string}   opts.lang      — BCP 47 language tag (e.g. "en-US", "it-IT")
 * @param {(stripped: string, raw: string) => void} opts.onWake — Wake word detected
 * @param {(text: string) => void} [opts.onPartial]  — Interim transcript stream
 * @param {(err: string) => void}  [opts.onError]    — Error callback
 * @returns {{ start: () => Promise<void>, stop: () => void, isRunning: () => boolean, supported: boolean }}
 */
export function createWakeWordDetector(opts) {
  // On native mobile, try Capacitor plugin first
  if (isNative && (platform === "ios" || platform === "android")) {
    return createNativeDetector(opts);
  }
  // Web: use Web Speech API
  return createWebSpeechDetector(opts);
}

/**
 * Check if any wake word detection is supported on this platform.
 */
export function isWakeWordSupported() {
  if (isNative) return true;
  return !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}
