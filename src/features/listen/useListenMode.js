/**
 * useListenMode — Two-stage "Listen Mode" for AAC.
 * ==================================================
 * Stage 1: Cheap wake word detection (always-on, low CPU)
 *   Web    → Web Speech API (SpeechRecognition) — free, OS-level
 *   Mobile → @capacitor-community/speech-recognition — native, low power
 *
 * Stage 2: High-fidelity transcription (post-wake)
 *   Audio capture → buffer full utterance → Whisper on-device STT
 *
 * The transcript feeds into the heuristic/LLM prediction pipeline
 * (Mode B contextual replies) via the onTranscript callback.
 *
 * STATE MACHINE:
 *   IDLE → LISTENING → WAKE_DETECTED → RECORDING → TRANSCRIBING
 *     → GENERATING → SUGGESTIONS → SPEAKING → IDLE
 *
 * PRIVACY: Wake detection may use cloud STT (browser-dependent).
 * Full transcription is always on-device via Whisper.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { createAudioCapture } from "./audioCapture";
import { createWakeWordDetector, isWakeWordSupported } from "./wakeWordDetector";
import { useWhisper } from "./useWhisper";

// ── States ────────────────────────────────────────────────────────────────────

export const LISTEN_STATES = {
  IDLE:          "idle",
  LISTENING:     "listening",       // Stage 1: passive wake word detection
  WAKE_CHECKING: "wake_checking",   // Brief — kept for UI compat
  WAKE_DETECTED: "wake_detected",   // Wake word confirmed (brief flash)
  RECORDING:     "recording",       // Stage 2: capturing full utterance
  TRANSCRIBING:  "transcribing",    // Running Whisper STT on buffered audio
  GENERATING:    "generating",      // LLM generating replies
  SUGGESTIONS:   "suggestions",     // Showing reply suggestions
  SPEAKING:      "speaking",        // TTS playing selected reply
};

// ── Config ────────────────────────────────────────────────────────────────────

const FULL_RECORD_TIMEOUT   = 15000;  // Max recording for full utterance
const FULL_SILENCE_MS       = 2000;   // Silence to end full recording
const WAKE_DETECTED_FLASH   = 600;    // Brief visual pause on wake detection

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {object}    opts
 * @param {string[]}  [opts.wakeKeywords]   — Trigger words (any match activates)
 * @param {string}    [opts.lang]           — ISO 639-1 for STT (e.g. "en")
 * @param {string}    [opts.ttsLang]        — TTS BCP 47 tag (e.g. "en-US")
 * @param {Function}  opts.speak            — TTS speak function from useTTS
 * @param {boolean}   opts.speaking         — Is TTS currently speaking?
 * @param {object}    [opts.llmEngine]      — WebLLM engine ref (for reply generation)
 * @param {string}    [opts.whisperModel]   — "tiny"|"base"|"small"
 * @param {Function}  [opts.onTranscript]   — Called with (transcript) for prediction pipeline
 */
export function useListenMode(opts = {}) {
  const {
    wakeKeywords = ["speakeasy"],
    lang         = "en",
    ttsLang      = "en-US",
    speak,
    speaking     = false,
    llmEngine    = null,
    whisperModel = "tiny",
    onTranscript,
  } = opts;

  // ── State ───────────────────────────────────────────────────────────────

  const [state, setState]             = useState(LISTEN_STATES.IDLE);
  const [energy, setEnergy]           = useState(0);
  const [transcript, setTranscript]   = useState("");
  const [partialText, setPartialText] = useState(""); // Stage 1 interim text
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError]             = useState(null);
  const [selectedReply, setSelectedReply] = useState("");
  const [active, setActive]           = useState(false);

  const captureRef   = useRef(null);   // Stage 2 audio capture
  const detectorRef  = useRef(null);   // Stage 1 wake word detector
  const stateRef     = useRef(state);
  const activeRef    = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { activeRef.current = active; }, [active]);

  // ── Whisper hook (Stage 2 high-fidelity STT) ────────────────────────────

  const whisper = useWhisper({ model: whisperModel, lang });

  // ── Transition helper ───────────────────────────────────────────────────

  const transition = useCallback((newState) => {
    console.log("[ListenMode] state:", stateRef.current, "→", newState);
    stateRef.current = newState;
    setState(newState);
  }, []);

  // ── BCP 47 language tag for speech recognition ──────────────────────────

  const bcp47 = lang.length === 2
    ? `${lang}-${lang.toUpperCase()}`
    : lang;

  // ── LLM reply generation ────────────────────────────────────────────────

  const generateReplies = useCallback(async (question) => {
    transition(LISTEN_STATES.GENERATING);

    const langName = {
      en: "English", es: "Spanish", fr: "French",
      it: "Italian", pt: "Portuguese",
    }[lang] || "English";

    const systemPrompt = [
      `You assist a deaf or hard-of-hearing user replying quickly in conversation.`,
      `Generate exactly 3 short, natural possible replies to the following question or statement.`,
      `Replies must be in ${langName}.`,
      `Output ONLY the 3 replies, one per line, numbered 1. 2. 3.`,
      `Keep each reply under 10 words. No explanation.`,
    ].join(" ");

    const userPrompt = `Question or statement:\n"${question}"\n\nReplies:`;

    if (llmEngine) {
      try {
        const reply = await llmEngine.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
          max_tokens:  120,
          temperature: 0.6,
          top_p:       0.9,
          stream:      false,
        });
        const raw = reply.choices[0]?.message?.content ?? "";
        const parsed = parseReplies(raw);
        if (parsed.length > 0) {
          setSuggestions(parsed);
          transition(LISTEN_STATES.SUGGESTIONS);
          return;
        }
      } catch (err) {
        console.warn("[useListenMode] LLM generation failed:", err);
      }
    }

    // Fallback
    const fallback = generateFallbackReplies(question, lang);
    setSuggestions(fallback);
    transition(LISTEN_STATES.SUGGESTIONS);
  }, [llmEngine, lang, transition]);

  // ── Stage 2: Record full utterance → Whisper → transcript ───────────────
  // Use a ref for resumeWakeDetection to break circular dependency
  const resumeWakeRef = useRef(null);

  const startFullRecording = useCallback(async (wakeSnippet) => {
    transition(LISTEN_STATES.RECORDING);

    // Pre-load Whisper model in background
    whisper.transcribe(new Float32Array(16000), lang).catch(() => {});

    const fullCapture = createAudioCapture({
      energyThreshold: 0.010,
      silenceTimeout:  FULL_SILENCE_MS,
      maxRecordingMs:  FULL_RECORD_TIMEOUT,

      onEnergy: (rms) => setEnergy(rms),
      onVoiceStart: () => {},

      onVoiceEnd: async (fullAudio) => {
        transition(LISTEN_STATES.TRANSCRIBING);

        const fullText = await whisper.transcribe(fullAudio, lang);
        // Combine: if wake snippet had content, prepend it
        const combined = wakeSnippet
          ? `${wakeSnippet} ${fullText ?? ""}`.trim()
          : (fullText?.trim() || "");

        setTranscript(combined);
        console.log("[ListenMode] transcript (full):", combined);
        if (combined) {
          onTranscript?.(combined);
          await generateReplies(combined);
        } else {
          setError("Could not understand the speech. Please try again.");
          transition(LISTEN_STATES.IDLE);
          if (activeRef.current) resumeWakeRef.current?.();
        }
      },
    });

    captureRef.current = fullCapture;
    await fullCapture.start();
  }, [whisper, lang, transition, generateReplies, onTranscript]);

  // ── Stage 1: Start cheap wake word detection ────────────────────────────

  const startWakeDetection = useCallback(() => {
    // Stop any existing detector
    detectorRef.current?.stop();

    console.log("[ListenMode] Starting wake detection — keywords:", wakeKeywords, "lang:", bcp47);

    const detector = createWakeWordDetector({
      keywords: wakeKeywords,
      lang:     bcp47,

      onWake: async (stripped, rawText) => {
        // Wake word found!
        console.log("[useListenMode] Wake word detected:", rawText);
        detector.stop(); // pause Stage 1

        transition(LISTEN_STATES.WAKE_DETECTED);

        // Brief visual flash
        await new Promise(r => setTimeout(r, WAKE_DETECTED_FLASH));

        // If the wake snippet already has a meaningful phrase (≥3 words),
        // use it directly with Whisper for HQ refinement
        if (stripped.trim().split(/\s+/).length >= 3) {
          setTranscript(stripped);
          console.log("[ListenMode] transcript (wake snippet):", stripped);
          onTranscript?.(stripped);
          await generateReplies(stripped);
          return;
        }

        // Otherwise, enter Stage 2: full recording with audio capture + Whisper
        await startFullRecording(stripped || "");
      },

      onPartial: (text) => {
        setPartialText(text);
      },

      onError: (err) => {
        console.warn("[useListenMode] Wake detection error:", err);
        // Don't surface transient errors to user unless it's permissions
        if (err.includes?.("denied") || err.includes?.("not-allowed")) {
          setError("Microphone access denied. Please enable it in Settings.");
        }
      },
    });

    detectorRef.current = detector;
    detector.start();
    transition(LISTEN_STATES.LISTENING);
  }, [wakeKeywords, bcp47, transition, startFullRecording, generateReplies, onTranscript]);

  // Resume wake detection (used after TTS finishes or dismiss)
  const resumeWakeDetection = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setPartialText("");
    startWakeDetection();
  }, [startWakeDetection]);

  // Keep ref in sync so startFullRecording can call it without stale closure
  resumeWakeRef.current = resumeWakeDetection;

  // ── Start listen mode (public) ──────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (stateRef.current !== LISTEN_STATES.IDLE) return false;

    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");
    setPartialText("");

    if (!isWakeWordSupported()) {
      setError("Speech recognition is not supported on this device/browser.");
      return false;
    }

    try {
      startWakeDetection();
      return true;
    } catch (err) {
      console.error("[useListenMode] Start failed:", err);
      setError(err.message?.includes("Permission")
        ? "Microphone access denied. Please enable it in Settings."
        : "Failed to start listening. Check microphone access.");
      setActive(false);
      activeRef.current = false;
      transition(LISTEN_STATES.IDLE);
      return false;
    }
  }, [startWakeDetection, transition]);

  // ── Stop listen mode ──────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    transition(LISTEN_STATES.IDLE);
    setEnergy(0);
    setPartialText("");
  }, [transition]);

  // ── Manual stop recording (user taps "Done") ─────────────────────────

  const stopRecording = useCallback(() => {
    captureRef.current?.stopRecording();
  }, []);

  // ── Select a reply → TTS ─────────────────────────────────────────────

  const selectReply = useCallback((text) => {
    if (!text || !speak) return;
    setError(null);
    setSelectedReply(text);
    transition(LISTEN_STATES.SPEAKING);
    speak(text, {
      lang: ttsLang,
      onError: () => {
        setError("Could not speak the reply. Please try again.");
        transition(LISTEN_STATES.SUGGESTIONS);
      },
    });
  }, [speak, ttsLang, transition]);

  // ── Watch TTS completion → auto-resume listening ─────────────────────

  useEffect(() => {
    if (stateRef.current === LISTEN_STATES.SPEAKING && !speaking) {
      const timer = setTimeout(() => {
        if (activeRef.current) {
          setTranscript("");
          setSuggestions([]);
          setSelectedReply("");
          transition(LISTEN_STATES.IDLE);
          setTimeout(() => startListening(), 100);
        } else {
          transition(LISTEN_STATES.IDLE);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [speaking, transition, startListening]);

  // ── Dismiss / Continue ────────────────────────────────────────────────

  const dismiss = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");
    setPartialText("");
    transition(LISTEN_STATES.IDLE);
    if (activeRef.current) {
      setTimeout(() => startListening(), 100);
    }
  }, [transition, startListening]);

  // Dismiss overlay but keep transcript so Mode B predictions stay active on the board
  const dismissToBoard = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    setError(null);
    // NOTE: transcript is NOT cleared — it feeds the AI prediction context
    setSuggestions([]);
    setSelectedReply("");
    setPartialText("");
    transition(LISTEN_STATES.IDLE);
    if (activeRef.current) {
      setTimeout(() => startListening(), 100);
    }
  }, [transition, startListening]);

  const continueListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");
    setPartialText("");
    transition(LISTEN_STATES.IDLE);
    setTimeout(() => startListening(), 100);
  }, [startListening, transition]);

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      detectorRef.current = null;
      captureRef.current?.stop();
      captureRef.current = null;
    };
  }, []);

  // ── Public API ────────────────────────────────────────────────────────

  return {
    // State
    state,
    energy,
    transcript,
    partialText,     // Stage 1 interim text (for UI display)
    suggestions,
    selectedReply,
    error,
    whisperReady:    whisper.ready,
    whisperLoading:  whisper.loading,
    whisperProgress: whisper.progress,

    // Toggle
    active,
    activate: useCallback(async () => {
      const started = await startListening();
      setActive(started);
      activeRef.current = started;
    }, [startListening]),
    deactivate: useCallback(() => {
      setActive(false);
      activeRef.current = false;
      setError(null);
      stopListening();
    }, [stopListening]),

    // Actions
    startListening,
    stopListening,
    stopRecording,
    selectReply,
    dismiss,
    dismissToBoard,
    continueListening,

    /** Skip wake word detection and jump directly to full recording (Stage 2).
     *  Used by the FAB long-press shortcut. */
    quickRecord: useCallback(async () => {
      if (stateRef.current !== LISTEN_STATES.IDLE) return;
      setError(null);
      setTranscript("");
      setSuggestions([]);
      setSelectedReply("");
      setPartialText("");
      setActive(true);
      activeRef.current = true;
      transition(LISTEN_STATES.WAKE_DETECTED);
      await new Promise(r => setTimeout(r, WAKE_DETECTED_FLASH));
      await startFullRecording("");
    }, [transition, startFullRecording]),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseReplies(raw) {
  return raw
    .split("\n")
    .map(line => line.replace(/^\s*\d+[.)]\s*/, "").replace(/^[-•]\s*/, "").replace(/^[""]|[""]$/g, "").trim())
    .filter(line => line.length > 0 && line.length < 100)
    .slice(0, 4);
}

function generateFallbackReplies(question, lang) {
  const lower = question.toLowerCase();

  const replies = {
    en: {
      time:    ["It's at 10 AM", "I'll check and let you know", "I'm not sure, let me look"],
      yesno:   ["Yes", "No", "Maybe, let me think"],
      what:    ["I'll explain in a moment", "Let me check first", "I'm not sure"],
      how:     ["I'm doing well, thanks", "Could be better", "I'm fine"],
      where:   ["I'll show you", "It's nearby", "I'm not sure where"],
      general: ["OK, got it", "I'll think about it", "Can you repeat that?"],
    },
    es: {
      time:    ["Es a las 10", "Voy a verificar", "No estoy seguro"],
      yesno:   ["Sí", "No", "Tal vez"],
      what:    ["Te explico en un momento", "Déjame verificar", "No estoy seguro"],
      how:     ["Bien, gracias", "Podría estar mejor", "Estoy bien"],
      where:   ["Te muestro", "Está cerca", "No estoy seguro dónde"],
      general: ["OK, entendido", "Lo pensaré", "¿Puedes repetir?"],
    },
    fr: {
      time:    ["C'est à 10h", "Je vais vérifier", "Je ne suis pas sûr"],
      yesno:   ["Oui", "Non", "Peut-être"],
      what:    ["Je t'explique bientôt", "Laisse-moi vérifier", "Je ne suis pas sûr"],
      how:     ["Bien, merci", "Ça pourrait aller mieux", "Ça va"],
      where:   ["Je te montre", "C'est à côté", "Je ne sais pas où"],
      general: ["OK, compris", "J'y réfléchirai", "Tu peux répéter ?"],
    },
    it: {
      time:    ["Alle 10", "Controllo e ti dico", "Non sono sicuro"],
      yesno:   ["Sì", "No", "Forse"],
      what:    ["Ti spiego tra un momento", "Fammi controllare", "Non sono sicuro"],
      how:     ["Bene, grazie", "Potrebbe andare meglio", "Sto bene"],
      where:   ["Te lo mostro", "È qui vicino", "Non sono sicuro dove"],
      general: ["OK, capito", "Ci penserò", "Puoi ripetere?"],
    },
    pt: {
      time:    ["Às 10h", "Vou verificar", "Não tenho certeza"],
      yesno:   ["Sim", "Não", "Talvez"],
      what:    ["Explico num momento", "Deixa eu verificar", "Não tenho certeza"],
      how:     ["Bem, obrigado", "Poderia estar melhor", "Estou bem"],
      where:   ["Eu te mostro", "É perto", "Não sei onde"],
      general: ["OK, entendi", "Vou pensar", "Pode repetir?"],
    },
  };

  const langReplies = replies[lang] || replies.en;

  if (/what time|when|hora|heure|quando/i.test(lower)) return langReplies.time;
  if (/^(do|does|did|is|are|was|were|can|could|will|would|should|have|has|had)\b/i.test(lower) || /\?$/.test(question.trim())) return langReplies.yesno;
  if (/^(how are|how('s| is)? (it|everything|you))/i.test(lower) || /comment (ça va|vas)/i.test(lower)) return langReplies.how;
  if (/^where\b|^où\b|^donde\b|^dove\b/i.test(lower)) return langReplies.where;
  if (/^what\b|^que\b|^qu'/i.test(lower)) return langReplies.what;

  return langReplies.general;
}
