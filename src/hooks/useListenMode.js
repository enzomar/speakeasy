/**
 * useListenMode — Offline "Listen Mode" state machine for AAC.
 * ==============================================================
 * Orchestrates the full pipeline:
 *   IDLE → LISTENING → WAKE_DETECTED → RECORDING → TRANSCRIBING
 *     → GENERATING → SUGGESTIONS → SPEAKING → IDLE
 *
 * COMPONENTS:
 *   1. Audio capture (audioCapture.js) — mic + energy-based VAD
 *   2. Wake word detection — checks short transcription snippets for trigger word
 *   3. Whisper STT (useWhisper) — on-device speech-to-text
 *   4. WebLLM — on-device reply generation (reuses existing engine)
 *   5. TTS — speaks the selected reply
 *
 * WAKE WORD STRATEGY:
 *   Two-stage approach to avoid heavy continuous Whisper:
 *   Stage 1: Energy-based VAD detects someone is speaking nearby
 *   Stage 2: Record a short segment (2–3 s), transcribe with Whisper,
 *            check if transcript contains the wake word(s)
 *   If wake word found → switch to full recording mode
 *   If not → discard and return to listening
 *
 * This avoids running Whisper continuously while still providing true
 * keyword detection. CPU usage during idle listening is < 1%.
 *
 * PRIVACY: All processing is on-device. No audio leaves the phone.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { createAudioCapture } from "../utils/audioCapture";
import { useWhisper }         from "./useWhisper";

// ── States ────────────────────────────────────────────────────────────────────

export const LISTEN_STATES = {
  IDLE:                "idle",
  LISTENING:           "listening",         // Passive mic, waiting for voice
  WAKE_CHECKING:       "wake_checking",     // Transcribing short clip for wake word
  WAKE_DETECTED:       "wake_detected",     // Wake word confirmed (brief flash)
  RECORDING:           "recording",         // Capturing full utterance
  TRANSCRIBING:        "transcribing",      // Running Whisper STT
  GENERATING:          "generating",        // LLM generating replies
  SUGGESTIONS:         "suggestions",       // Showing reply suggestions
  SPEAKING:            "speaking",          // TTS playing selected reply
};

// ── Config ────────────────────────────────────────────────────────────────────

const WAKE_SNIPPET_MS       = 3000;   // Length of audio snippet for wake word check
const WAKE_SILENCE_MS       = 800;    // Silence to end wake snippet
const FULL_RECORD_TIMEOUT   = 15000;  // Max recording for full utterance
const FULL_SILENCE_MS       = 2000;   // Silence to end full recording
const WAKE_DETECTED_FLASH   = 600;    // Brief visual pause on wake detection

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string[]} [opts.wakeKeywords]  — Array of trigger words (any match activates)
 * @param {string}   [opts.lang]          — Language code for STT (ISO 639-1)
 * @param {string}   [opts.ttsLang]       — TTS language code (e.g. "en-US")
 * @param {Function} opts.speak           — TTS speak function from useTTS
 * @param {boolean}  opts.speaking        — Is TTS currently speaking?
 * @param {object}   [opts.llmEngine]     — WebLLM engine ref (for reply generation)
 * @param {string}   [opts.whisperModel]  — "tiny"|"base"|"small"
 */
export function useListenMode(opts = {}) {
  const {
    wakeKeywords = ["speakeasy"],
    lang        = "en",
    ttsLang     = "en-US",
    speak,
    speaking    = false,
    llmEngine   = null,
    whisperModel = "tiny",
  } = opts;

  // ── State ───────────────────────────────────────────────────────────────

  const [state, setState]             = useState(LISTEN_STATES.IDLE);
  const [energy, setEnergy]           = useState(0);
  const [transcript, setTranscript]   = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError]             = useState(null);
  const [selectedReply, setSelectedReply] = useState("");
  const [active, setActive]           = useState(false); // master toggle (like Alexa)

  const captureRef  = useRef(null);
  const stateRef    = useRef(state);
  const activeRef   = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // ── Whisper hook ────────────────────────────────────────────────────────

  const whisper = useWhisper({ model: whisperModel, lang });

  // ── Transition helper ───────────────────────────────────────────────────

  const transition = useCallback((newState) => {
    stateRef.current = newState;
    setState(newState);
  }, []);

  // ── Wake word matching (supports multiple keywords) ─────────────────────

  const matchesWakeWord = useCallback((text) => {
    if (!wakeKeywords.length) return true; // no keywords → always trigger
    const lower = text.toLowerCase();
    return wakeKeywords.some(kw => kw && lower.includes(kw));
  }, [wakeKeywords]);

  // ── LLM reply generation ────────────────────────────────────────────────

  const generateReplies = useCallback(async (question) => {
    transition(LISTEN_STATES.GENERATING);

    // Determine language name for the prompt
    const langName = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ar: "Arabic", zh: "Chinese",
      ja: "Japanese", ko: "Korean",
    }[lang] || "English";

    const systemPrompt = [
      `You assist a deaf or hard-of-hearing user replying quickly in conversation.`,
      `Generate exactly 3 short, natural possible replies to the following question or statement.`,
      `Replies must be in ${langName}.`,
      `Output ONLY the 3 replies, one per line, numbered 1. 2. 3.`,
      `Keep each reply under 10 words. No explanation.`,
    ].join(" ");

    const userPrompt = `Question or statement:\n"${question}"\n\nReplies:`;

    // Try WebLLM if available
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

    // Fallback: generate simple contextual replies
    const fallback = generateFallbackReplies(question, lang);
    setSuggestions(fallback);
    transition(LISTEN_STATES.SUGGESTIONS);
  }, [llmEngine, lang, transition]);

  // ── Start listen mode ───────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (stateRef.current !== LISTEN_STATES.IDLE) return false;

    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");

    try {
      // Pre-load Whisper model in background
      whisper.transcribe(new Float32Array(16000), lang).catch(() => {});

      const capture = createAudioCapture({
        energyThreshold: 0.012,
        silenceTimeout:  WAKE_SILENCE_MS,
        maxRecordingMs:  WAKE_SNIPPET_MS,

        onEnergy: (rms) => {
          setEnergy(rms);
        },

        onVoiceStart: () => {
          // Voice detected — we'll wait for the snippet to complete
        },

        onVoiceEnd: async (audioBuffer) => {
          // Got a short audio snippet — check for wake word
          if (stateRef.current !== LISTEN_STATES.LISTENING) return;

          transition(LISTEN_STATES.WAKE_CHECKING);
          const text = await whisper.transcribe(audioBuffer, lang);

          if (!text || !matchesWakeWord(text)) {
            // No wake word — return to passive listening
            transition(LISTEN_STATES.LISTENING);
            return;
          }

          // ── Wake word detected! ─────────────────────────────────────
          transition(LISTEN_STATES.WAKE_DETECTED);

          // Brief haptic/visual flash
          await new Promise(r => setTimeout(r, WAKE_DETECTED_FLASH));

          // Check if the snippet already contains a full question
          const stripped = stripWakeWord(text, wakeKeywords);
          if (stripped.trim().split(/\s+/).length >= 3) {
            // The snippet already has meaningful content — use it directly
            setTranscript(stripped);
            await generateReplies(stripped);
            return;
          }

          // Otherwise, switch to full recording mode
          transition(LISTEN_STATES.RECORDING);

          // Stop old capture, start new one with longer timeout
          capture.stop();

          const fullCapture = createAudioCapture({
            energyThreshold: 0.010,
            silenceTimeout:  FULL_SILENCE_MS,
            maxRecordingMs:  FULL_RECORD_TIMEOUT,

            onEnergy: (rms) => setEnergy(rms),
            onVoiceStart: () => {},

            onVoiceEnd: async (fullAudio) => {
              transition(LISTEN_STATES.TRANSCRIBING);
              const fullText = await whisper.transcribe(fullAudio, lang);
              const final    = fullText?.trim() || stripped;

              setTranscript(final);

              if (final) {
                await generateReplies(final);
              } else {
                setError("Could not understand the speech. Please try again.");
                transition(LISTEN_STATES.IDLE);
              }
            },
          });

          captureRef.current = fullCapture;
          await fullCapture.start();
        },
      });

      captureRef.current = capture;
      await capture.start();
      transition(LISTEN_STATES.LISTENING);
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
  }, [whisper, lang, matchesWakeWord, wakeKeywords, generateReplies, transition]);

  // ── Stop listen mode ──────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    transition(LISTEN_STATES.IDLE);
    setEnergy(0);
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
      // TTS finished → resume listening if still active
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

  // ── Dismiss / Continue → resume listening if active ────────────────────

  const dismiss = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");
    transition(LISTEN_STATES.IDLE);
    // Resume if mode is still toggled on
    if (activeRef.current) {
      setTimeout(() => startListening(), 100);
    }
  }, [transition, startListening]);

  const continueListening = useCallback(() => {
    setError(null);
    setTranscript("");
    setSuggestions([]);
    setSelectedReply("");
    transition(LISTEN_STATES.IDLE);
    setTimeout(() => startListening(), 100);
  }, [startListening, transition]);

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
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
    suggestions,
    selectedReply,
    error,
    whisperReady:   whisper.ready,
    whisperLoading: whisper.loading,
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
    continueListening,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse LLM output into an array of reply strings.
 * Handles numbered lists, dashed lists, or plain lines.
 */
function parseReplies(raw) {
  return raw
    .split("\n")
    .map(line => line.replace(/^\s*\d+[.)]\s*/, "").replace(/^[-•]\s*/, "").replace(/^[""]|[""]$/g, "").trim())
    .filter(line => line.length > 0 && line.length < 100)
    .slice(0, 4); // Max 4 suggestions
}

/**
 * Remove any wake keyword from the beginning of a transcription.
 * e.g. "Hey Marco what time is the meeting" → "what time is the meeting"
 */
function stripWakeWord(text, keywords) {
  if (!keywords || !keywords.length) return text;

  let result = text;
  for (const kw of keywords) {
    if (!kw) continue;
    const p = new RegExp(`^${escapeRegex(kw)}[,:]?\\s*`, "i");
    result = result.replace(p, "");
  }
  return result.trim() || text;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate simple fallback replies when LLM is unavailable.
 * Returns 3 generic but useful responses based on question type.
 */
function generateFallbackReplies(question, lang) {
  const lower = question.toLowerCase();

  const replies = {
    en: {
      time:     ["It's at 10 AM", "I'll check and let you know", "I'm not sure, let me look"],
      yesno:    ["Yes", "No", "Maybe, let me think"],
      what:     ["I'll explain in a moment", "Let me check first", "I'm not sure"],
      how:      ["I'm doing well, thanks", "Could be better", "I'm fine"],
      where:    ["I'll show you", "It's nearby", "I'm not sure where"],
      general:  ["OK, got it", "I'll think about it", "Can you repeat that?"],
    },
    es: {
      time:     ["Es a las 10", "Voy a verificar", "No estoy seguro"],
      yesno:    ["Sí", "No", "Tal vez"],
      what:     ["Te explico en un momento", "Déjame verificar", "No estoy seguro"],
      how:      ["Bien, gracias", "Podría estar mejor", "Estoy bien"],
      where:    ["Te muestro", "Está cerca", "No estoy seguro dónde"],
      general:  ["OK, entendido", "Lo pensaré", "¿Puedes repetir?"],
    },
    fr: {
      time:     ["C'est à 10h", "Je vais vérifier", "Je ne suis pas sûr"],
      yesno:    ["Oui", "Non", "Peut-être"],
      what:     ["Je t'explique bientôt", "Laisse-moi vérifier", "Je ne suis pas sûr"],
      how:      ["Bien, merci", "Ça pourrait aller mieux", "Ça va"],
      where:    ["Je te montre", "C'est à côté", "Je ne sais pas où"],
      general:  ["OK, compris", "J'y réfléchirai", "Tu peux répéter ?"],
    },
    de: {
      time:     ["Um 10 Uhr", "Ich schaue nach", "Bin mir nicht sicher"],
      yesno:    ["Ja", "Nein", "Vielleicht"],
      what:     ["Ich erkläre gleich", "Lass mich nachschauen", "Bin mir nicht sicher"],
      how:      ["Gut, danke", "Könnte besser sein", "Mir geht's gut"],
      where:    ["Ich zeig's dir", "In der Nähe", "Weiß nicht wo"],
      general:  ["OK, verstanden", "Ich denke drüber nach", "Kannst du das wiederholen?"],
    },
    it: {
      time:     ["Alle 10", "Controllo e ti dico", "Non sono sicuro"],
      yesno:    ["Sì", "No", "Forse"],
      what:     ["Ti spiego tra un momento", "Fammi controllare", "Non sono sicuro"],
      how:      ["Bene, grazie", "Potrebbe andare meglio", "Sto bene"],
      where:    ["Te lo mostro", "È qui vicino", "Non sono sicuro dove"],
      general:  ["OK, capito", "Ci penserò", "Puoi ripetere?"],
    },
    pt: {
      time:     ["Às 10h", "Vou verificar", "Não tenho certeza"],
      yesno:    ["Sim", "Não", "Talvez"],
      what:     ["Explico num momento", "Deixa eu verificar", "Não tenho certeza"],
      how:      ["Bem, obrigado", "Poderia estar melhor", "Estou bem"],
      where:    ["Eu te mostro", "É perto", "Não sei onde"],
      general:  ["OK, entendi", "Vou pensar", "Pode repetir?"],
    },
    ar: {
      time:     ["الساعة العاشرة", "سأتحقق", "لست متأكداً"],
      yesno:    ["نعم", "لا", "ربما"],
      what:     ["سأشرح لاحقاً", "دعني أتحقق", "لست متأكداً"],
      how:      ["بخير، شكراً", "يمكن أن يكون أفضل", "أنا بخير"],
      where:    ["سأريك", "قريب من هنا", "لست متأكداً أين"],
      general:  ["حسناً، فهمت", "سأفكر في ذلك", "هل يمكنك التكرار؟"],
    },
    zh: {
      time:     ["十点", "我查一下", "我不确定"],
      yesno:    ["是的", "不是", "也许吧"],
      what:     ["我等会解释", "让我查一下", "我不确定"],
      how:      ["很好，谢谢", "还行", "我很好"],
      where:    ["我带你去看", "就在附近", "我不确定在哪里"],
      general:  ["好的，知道了", "我想想", "你能再说一遍吗？"],
    },
    ja: {
      time:     ["10時です", "確認します", "わかりません"],
      yesno:    ["はい", "いいえ", "多分"],
      what:     ["すぐ説明します", "確認させてください", "わかりません"],
      how:      ["元気です、ありがとう", "まあまあです", "大丈夫です"],
      where:    ["見せますね", "近くです", "場所はわかりません"],
      general:  ["わかりました", "考えておきます", "もう一度言ってもらえますか？"],
    },
    ko: {
      time:     ["10시에요", "확인해볼게요", "잘 모르겠어요"],
      yesno:    ["네", "아니요", "아마요"],
      what:     ["곧 설명할게요", "확인해볼게요", "잘 모르겠어요"],
      how:      ["잘 지내요, 감사합니다", "그저 그래요", "괜찮아요"],
      where:    ["보여줄게요", "가까이에 있어요", "어디인지 모르겠어요"],
      general:  ["알겠어요", "생각해볼게요", "다시 말해줄래요?"],
    },
  };

  const langReplies = replies[lang] || replies.en;

  // Detect question type
  if (/what time|when|hora|heure|wann|quando|什么时候|何時|몇 시/i.test(lower)) {
    return langReplies.time;
  }
  if (/^(do|does|did|is|are|was|were|can|could|will|would|should|have|has|had)\b/i.test(lower) ||
      /\?$/.test(question.trim())) {
    return langReplies.yesno;
  }
  if (/^(how are|how('s| is)? (it|everything|you))/i.test(lower) || /comment (ça va|vas)/i.test(lower)) {
    return langReplies.how;
  }
  if (/^where\b|^wo\b|^où\b|^donde\b|^dove\b|在哪/i.test(lower)) {
    return langReplies.where;
  }
  if (/^what\b|^was\b|^que\b|^qu'/i.test(lower)) {
    return langReplies.what;
  }

  return langReplies.general;
}
