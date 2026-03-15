/**
 * App.jsx — SpeakEasy AAC · Native mobile-first layout
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Grid3X3, Clock, User, Shapes,
  Cpu, Ear, HelpCircle, ArrowLeft, Keyboard, Siren, Hand, MessageSquarePlus
} from "lucide-react";

// App-level
import { haptic }           from "./native";
import { detectEmotion }    from "../prompts/intentEmotionEngine";
import { IS_DEMO }          from "../shared/demoMode";
import { getSentenceSuggestions } from "../engine/sentenceSuggestions.js";
import { getSentenceOverrides }  from "../data/boards/index.js";

// Hooks
import { useTTS }          from "../shared/hooks/useTTS";
import { usePrediction }   from "../features/prediction/usePrediction";
import { useStorage }      from "../features/history/useStorage";
import { useAIPrediction } from "../features/prediction/useAIPrediction";
import { useLanguage }     from "../i18n/useLanguage";
import { useListenMode, LISTEN_STATES } from "../features/listen/useListenMode";
import { useFavorites }      from "../shared/hooks/useFavorites";
import { useCustomSymbols }  from "../features/symbols/useCustomSymbols";
import { useQuickPhrases }   from "../shared/hooks/useQuickPhrases";
import { useSettings }       from "../features/settings/useSettings";
import { QUICK_SUBCATEGORIES } from "../data/boardTabs";

// Components
import MessageBar        from "../features/composer/MessageBar";
import IntentBar         from "../features/board/IntentBar";
import CategoryGrid      from "../features/board/CategoryGrid";
import SymbolPicker      from "../features/board/SymbolPicker";
import PhraseGrid        from "../features/board/PhraseGrid";
import ProfilePanel      from "../features/profile/ProfilePanel";
import HistoryPanel      from "../features/history/HistoryPanel";
import ConversationPanel from "../features/listen/ConversationPanel";
import HelpModal         from "../shared/ui/HelpModal";
import SignLanguageModal from "../shared/ui/SignLanguageModal";
import AIModelModal      from "../features/settings/AIModelModal";
import InstallPrompt     from "../shared/ui/InstallPrompt";
import { FeedbackForm }  from "../shared/ui/settingsUI";
import Onboarding, { ONBOARDING_KEY } from "../features/onboarding/Onboarding";
import SmartKeyboard     from "../features/board/SmartKeyboard";
import SymbolsPanel from "../features/symbols/SymbolsPanel";
import FavoritesSheet    from "../features/board/FavoritesSheet";
import { useBoard }      from "../features/board/useBoardManager";
import BoardSelector     from "../features/board/BoardSelector";

// Auth + Subscription
import { useAuth }           from "../features/auth/useAuth";
import AuthModal             from "../features/auth/AuthModal";
import { useSubscription }   from "../features/subscription/useSubscription";
import { useFreeTier }       from "../features/subscription/useFreeTier";
import Paywall               from "../features/subscription/Paywall";
import SubscriptionBanner    from "../features/subscription/SubscriptionBanner";

// i18n
import { getUI }             from "../i18n/ui-strings";

function appendSuggestionToWords(currentWords, suggestionText) {
  const suggestionParts = suggestionText.trim().split(/\s+/).filter(Boolean);
  if (!suggestionParts.length) return currentWords;

  const currentTexts = currentWords.map(w =>
    (typeof w === "string" ? w : w.text).toLowerCase()
  );
  const normalizedSuggestion = suggestionParts.map(w => w.toLowerCase());

  let overlap = 0;
  const maxOverlap = Math.min(currentTexts.length, normalizedSuggestion.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    const tail = currentTexts.slice(-size).join(" ");
    const head = normalizedSuggestion.slice(0, size).join(" ");
    if (tail === head) {
      overlap = size;
      break;
    }
  }

  const toAppend = suggestionParts.slice(overlap);
  if (!toAppend.length) return currentWords;
  return [...currentWords, ...toAppend];
}

// ── Bottom tab bar item ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars -- Icon is used as <Icon .../>
function NavItem({ id, icon: Icon, label, active, onClick }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: "10px 0 8px",
        minHeight: 56,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--tint)" : "var(--text-3)",
        transition: "color 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <Icon size={24} strokeWidth={active ? 2.2 : 1.6} />
      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>
        {label}
      </span>
    </button>
  );
}

// ── Back header for sub-views ─────────────────────────────────────────────────
function SubViewHeader({ onBack, title, emoji, bg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: bg ?? "var(--bg)",
      borderBottom: "1px solid var(--sep)", flexShrink: 0,
    }}>
      <button
        onClick={onBack}
        aria-label="Back to home"
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: "var(--surface)", border: "1.5px solid var(--sep)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text)",
          WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
        }}
      >
        <ArrowLeft size={24} strokeWidth={2.2} />
      </button>
      {emoji && <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">{emoji}</span>}
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</span>
    </div>
  );
}

// ── FAB with long-press support ───────────────────────────────────────────────
const FAB_LONG_PRESS_MS = 500;

function FabButton({ boardMode, onToggleMode, onLongPress }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const handleDown = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress?.();
    }, FAB_LONG_PRESS_MS);
  }, [onLongPress]);

  const handleUp = useCallback(() => { clear(); }, [clear]);
  const handleLeave = useCallback(() => { clear(); }, [clear]);

  const handleClick = useCallback((e) => {
    if (firedRef.current) { e.preventDefault(); firedRef.current = false; return; }
    onToggleMode();
  }, [onToggleMode]);

  const preventMenu = useCallback((e) => e.preventDefault(), []);

  return (
    <button
      aria-label={boardMode === "symbols" ? "Switch to keyboard (long-press to listen)" : "Switch to symbol grid (long-press to listen)"}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleLeave}
      onPointerCancel={handleLeave}
      onClick={handleClick}
      onContextMenu={preventMenu}
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        border: "none",
        background: "var(--tint)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {boardMode === "symbols"
        ? <Keyboard size={24} strokeWidth={2} />
        : <Grid3X3 size={24} strokeWidth={2} />}
    </button>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Lock scroll on body while the AAC app is mounted ─────────────────────
  useEffect(() => {
    document.body.classList.add("app-active");
    // Adding 'app-active' changes #root height via CSS — re-measure --app-height
    // so the flex layout settles with the correct viewport dimensions.
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty(
        '--app-height', `${window.innerHeight}px`
      );
    });
    return () => document.body.classList.remove("app-active");
  }, []);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [words,          setWords]          = useState([]);
  const [tab,            setTab]            = useState("board");   // "board"|"symbols"|"history"|"profile"
  const { boards, currentBoard, setBoardId } = useBoard();
  const [activeCategory, setActiveCategory] = useState(null);       // null = category grid, object = symbol picker
  const [tapContext, setTapContext] = useState(null);                // { l1Label, l2Label, l3Label, l3Type } — hierarchy path
  const [emotion, setEmotion] = useState("neutral");               // null = auto-detect, or one of EMOTIONS; default neutral
  const [showHelp, setShowHelp] = useState(false);
  const [showSignGuide, setShowSignGuide] = useState(false);
  const [boardMode, setBoardMode] = useState("symbols");              // "symbols" | "keyboard"
  const [quickSubTab, setQuickSubTab] = useState(null);               // null = show sub-cat grid, string = phrase tab id
  const [lastSpoken, setLastSpoken] = useState("");                     // last spoken sentence for repeat
  const [spokenToast, setSpokenToast] = useState("");                   // brief visual confirmation after speaking

  // ── First-run onboarding ─────────────────────────────────────────────────
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem(ONBOARDING_KEY)
  );
  // Track whether the user JUST finished onboarding in this session, so we
  // can open the auth modal on the "signup" tab (they're new — don't ask to log in).
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);

  // ── Settings (persisted in localStorage) ──────────────────────────────────
  const {
    theme, setTheme,
    voiceSpeed, setVoiceSpeed,
    voicePitch, setVoicePitch,
    aiModel, setAiModel: handleChangeAiModel,
    voiceName, setVoiceName,
    hand, setHand,
    gender, setGender,
    wakeKeywords, setWakeKeywords,
    geminiApiKey, setGeminiApiKey,
    vocabMode, setVocabMode,
    aiAutoCorrect, setAiAutoCorrect,
  } = useSettings();

  // ── Auth + Subscription ─────────────────────────────────────────────────
  const {
    user, isAuthenticated, isLoading,
    signOut: authSignOut,
    changePassword: authChangePassword,
    resetPassword: authResetPassword,
    deleteAccount: authDeleteAccount,
  } = useAuth();
  const {
    isPremium, isLoading: subLoading, offering, refresh: refreshSub, restore,
  } = useSubscription(user);
  const {
    canSpeak, consumeVoice,
    canUseAI, consumeAI,
    remainingAI, remainingVoice,
    aiLimit, voiceLimit,
    showPaywall, openPaywall, closePaywall,
    isInTrial, trialDaysLeft,
  } = useFreeTier(isPremium, user?.metadata?.creationTime ?? null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { speaking, speak, cancel, voices }                         = useTTS();
  const { learn, ready: ngramReady, resetModel }                   = usePrediction();
  const { saveUtterance, history, deleteUtterance, clearHistory, exportHistory } = useStorage();
  const {
    suggestions: aiSuggestions, source: aiSource,
    llmStatus, loadProgress, isPaused,
    wifiOnly, setWifiOnly, webGpuSupported,
    predict: aiPredict,
    clearSuggestions: aiClearSuggestions,
    initEngine: aiInitEngine,
    pauseDownload: aiPause,
    resumeDownload: aiResume,
    deleteModel: aiDeleteModel,
    modelKey: aiModelKey,
  } = useAIPrediction(aiModel, geminiApiKey, aiAutoCorrect);
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const { custom: customSymbols, hidden: hiddenSymbols, addSymbol, removeSymbol, hideSymbol, unhideSymbol } = useCustomSymbols();
  const { getTab: getQuickTab } = useQuickPhrases();
  const {
    uiLangCode, setUiLang,
    typeLangCode, typeLang, setTypeLang,
    ttsLangCode, ttsLang, setTtsLang,
    listenLangCode, setListenLang,
  } = useLanguage();

  // ── Wake word (profile name + custom keywords) ──────────────────────────
  const [wakeWord, setWakeWord] = useState(() => {
    try { return localStorage.getItem("speakeasy_name_v1")?.replace(/^"|"$/g, "") || ""; }
    catch { return ""; }
  });

  // Build keywords array: user's name + selected keyword
  const wakeKeywordsList = useMemo(() => {
    const parts = wakeKeywords.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (wakeWord?.trim()) parts.unshift(wakeWord.trim().toLowerCase());
    return [...new Set(parts)];
  }, [wakeKeywords, wakeWord]);

  // ── Stable transcript callback (ref avoids hook-ordering issues) ───────
  const listenTranscriptRef = useRef(null);

  // ── Listen Mode ──────────────────────────────────────────────────────────
  const listenMode = useListenMode({
    wakeKeywords: wakeKeywordsList,
    lang:      listenLangCode,
    ttsLang:   ttsLang.ttsLang,
    speak,
    speaking,
    whisperModel: "tiny",
    onTranscript: (...args) => listenTranscriptRef.current?.(...args),
  });

  // ── Conversation history for the inline ConversationPanel ───────────────
  const [chatHistory, setChatHistory]   = useState([]);
  const lastHeardRef   = useRef("");
  const lastRepliedRef = useRef("");

  // ── Tap deduplication — prevent accidental rapid double-taps ────────────
  const lastTapRef = useRef({ word: null, ts: 0 });
  const isDuplicateTap = useCallback((word) => {
    const now = Date.now();
    const last = lastTapRef.current;
    const dup = last.word === word && now - last.ts < 300;
    lastTapRef.current = { word, ts: now };
    return dup;
  }, []);

  // Push a "heard" bubble each time a new transcript arrives
  useEffect(() => {
    const t = listenMode.transcript;
    if (t && t !== lastHeardRef.current) {
      lastHeardRef.current = t;
      setChatHistory(prev => [...prev, { type: "heard", text: t }]);
    }
  }, [listenMode.transcript]);

  // Push a "replied" bubble when the app transitions into SPEAKING state
  useEffect(() => {
    const r = listenMode.selectedReply;
    if (r && r !== lastRepliedRef.current && listenMode.state === LISTEN_STATES.SPEAKING) {
      lastRepliedRef.current = r;
      setChatHistory(prev => [...prev, { type: "replied", text: r }]);
    }
  }, [listenMode.selectedReply, listenMode.state]);

  // Clear history when listen mode is fully deactivated
  useEffect(() => {
    if (!listenMode.active) {
      setChatHistory([]);
      lastHeardRef.current   = "";
      lastRepliedRef.current = "";
    }
  }, [listenMode.active]);

  const ui = getUI(uiLangCode);

  // ── Normalise words (string | {text, __typed} | {text, __core}) ──────────
  const wordTexts = useMemo(() => words.map(w => (typeof w === "string" ? w : w.text)), [words]);

  // Words typed from CoreWordBar — the grammatical prefix for the current symbol tap.
  // Only core-tagged entries qualify; grid/fringe symbol labels are excluded.
  const corePrefixWords = useMemo(
    () => words.filter(w => w?.__core).map(w => w.text),
    [words],
  );

  // ── Recent message history (last 3 spoken sentences for LLM context) ─────
  const recentMessages = useMemo(
    () => history.slice(0, 3).map(h => h.text),
    [history],
  );

  // ── Auto-detected emotion (for IntentBar emotion chips when user hasn't overridden)
  const detectedEmotion = useMemo(
    () => detectEmotion(tapContext?.l2Canon, tapContext?.l3Canon, activeCategory?.mapTo),
    [tapContext, activeCategory],
  );

  // ── Sentence suggestions for the current tap path (board context) ──────
  const boardOverrides = useMemo(
    () => getSentenceOverrides(currentBoard.id, typeLangCode),
    [currentBoard.id, typeLangCode],
  );
  const sentenceSuggestions = useMemo(() => {
    if (!tapContext?.l1Id || !tapContext?.l2Id) return [];
    return getSentenceSuggestions({
      l1Id: tapContext.l1Id,
      l2Id: tapContext.l2Id,
      l3Id: tapContext.l3Id || undefined,
      langCode: typeLangCode,
      allowL3ToL2Fallback: false,
      emotion: emotion || detectedEmotion || undefined,
      boardOverrides,
    });
  }, [tapContext, boardOverrides, typeLangCode, emotion, detectedEmotion]);

  // Update ref after wordTexts is available
  listenTranscriptRef.current = (transcript) => {
    if (IS_DEMO) return; // demo: listen mode disabled
    if (!transcript?.trim()) return;
    console.log("[App] Listen transcript →", transcript);
    aiPredict(wordTexts, typeLangCode, activeCategory?.mapTo, tapContext, transcript, recentMessages, gender, emotion, corePrefixWords);
  };

  // ── Prediction on word changes ───────────────────────────────────────────
  useEffect(() => {
    if (!ngramReady) return;
    aiPredict(wordTexts, typeLangCode, activeCategory?.mapTo, tapContext, undefined, recentMessages, gender, emotion, corePrefixWords);
  }, [wordTexts, ngramReady, aiPredict, typeLangCode, activeCategory, tapContext, recentMessages, gender, emotion, corePrefixWords]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTap = useCallback((label) => {
    if (isDuplicateTap(label)) return;
    haptic(); setWords(prev => [...prev, label]);
  }, [isDuplicateTap]);

  /** Core word tap — adds a translated core-vocabulary word, tagged so the
   *  prediction engine can distinguish it from fringe (grid) symbol labels. */
  const handleCoreWordTap = useCallback((label) => {
    if (isDuplicateTap(label)) return;
    haptic();
    setWords(prev => [...prev, { text: label, __core: true }]);
  }, [isDuplicateTap]);

  /** Vocab grid tap — speaks or composes depending on vocabMode setting */
  const handleVocabSpeak = useCallback((word) => {
    if (vocabMode === "compose" && isDuplicateTap(word)) return;
    haptic();
    if (vocabMode === "compose") {
      setWords(prev => [...prev, word]);
    } else {
      speak(word, { lang: ttsLang.ttsLang, rate: voiceSpeed, pitch: voicePitch, voiceName });
    }
  }, [vocabMode, speak, ttsLang.ttsLang, voiceSpeed, voicePitch, voiceName, isDuplicateTap]);



  const handleSuggestionSelect = useCallback((word) => {
    setWords(prev => appendSuggestionToWords(prev, word));
  }, []);

  const handleCommitTyped = useCallback((text) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length) setWords(prev => [...prev, ...parts.map(p => ({ text: p, __typed: true }))]);
  }, []);

  const handleTyping = useCallback((draft) => {
    if (!ngramReady) return;
    const all = [...wordTexts, draft].filter(Boolean);
    aiPredict(all, typeLangCode, activeCategory?.mapTo, tapContext, undefined, recentMessages, gender, undefined, corePrefixWords);
  }, [wordTexts, ngramReady, aiPredict, typeLangCode, activeCategory, tapContext, recentMessages, gender, corePrefixWords]);

  const handleSpeak = useCallback((sentenceOverride) => {
    const sentence = sentenceOverride ?? wordTexts.join(" ");
    if (!sentence.trim() || speaking) return;
    // ── Free-tier voice limit check (skipped in demo) ──────────────────────
    if (!IS_DEMO && !consumeVoice()) return; // limit reached → paywall is shown by consumeVoice
    haptic();
    // Reset grid immediately so the user can start building the next sentence
    // right after tapping speak — no need to wait for TTS to fire onStart.
    setWords([]);
    setTapContext(null);
    setEmotion("neutral");
    setActiveCategory(null);
    speak(sentence, {
      lang: ttsLang.ttsLang,
      rate: voiceSpeed,
      pitch: voicePitch,
      voiceName,
      onStart: () => {
        saveUtterance(sentence);
        learn(sentence);
        setLastSpoken(sentence);
        setSpokenToast(sentence);
        setTimeout(() => setSpokenToast(""), 2500);
      },
    });
  }, [wordTexts, speaking, speak, saveUtterance, learn, ttsLang, voiceSpeed, voicePitch, voiceName, consumeVoice]);

  /** Repeat last spoken sentence */
  const handleRepeat = useCallback(() => {
    if (lastSpoken) handleSpeak(lastSpoken);
  }, [lastSpoken, handleSpeak]);

  /** SOS — jump to emergency from anywhere */
  const handleSOS = useCallback(() => {
    haptic();
    setTab("board");
    setBoardMode("symbols");
    setActiveCategory({ id: "emergency", action: "emergency" });
  }, []);

  const handleRemoveWord = useCallback((idx) => setWords(prev => prev.filter((_, i) => i !== idx)), []);
  const handleDeleteLast = useCallback(() => setWords(prev => prev.slice(0, -1)), []);
  const handleClear      = useCallback(() => { setWords([]); setTapContext(null); setEmotion("neutral"); }, []);
  const handleStopSpeaking = useCallback(() => cancel(), [cancel]);

  const handleIntentSpeak  = useCallback((text) => handleSpeak(text), [handleSpeak]);
  const handleResetAI      = useCallback(() => { resetModel(); }, [resetModel]);

  // ── Category navigation ──────────────────────────────────────────────────
  const handleCategorySelect = useCallback((cat) => {
    haptic();
    setActiveCategory(cat);
    setTapContext(null); // reset hierarchy path on new category
  }, []);
  const handleCategoryBack   = useCallback(() => { setActiveCategory(null); setTapContext(null); setQuickSubTab(null); }, []);

  /** Called by SymbolPicker on each L2/L3 tap — updates hierarchy context for AI */
  const handleTapContext = useCallback((ctx) => setTapContext(ctx), []);

  /** 1-tap speak for phrase grids (Quick Phrases / Emergency) */
  const handlePhraseSpeak = useCallback((text) => handleSpeak(text), [handleSpeak]);

  /** History reuse: load words into message bar and switch to board */
  const handleHistoryReuse = useCallback((text) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length) {
      setWords(parts);
      setTab("board");
    }
  }, []);

  /** History speak: speak immediately */
  const handleHistorySpeak = useCallback((text) => handleSpeak(text), [handleSpeak]);

  // ── AI status dot ─────────────────────────────────────────────────────────
  const [showAIModal,      setShowAIModal]      = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const aiIsNone = aiModel === "none";
  const aiDotColor =
    IS_DEMO                      ? "var(--orange)" :
    aiIsNone                     ? "var(--text-4)" :
    llmStatus === "ready"        ? "var(--green)" :
    llmStatus === "loading"      ? "var(--orange)" :
    llmStatus === "paused"       ? "var(--orange)" :
    llmStatus === "wifi_blocked" ? "var(--tint)" : "var(--text-4)";
  const aiStatusLabel =
    IS_DEMO                      ? "n-gram" :
    aiIsNone                     ? "AI off" :
    llmStatus === "ready"        ? "AI ready" :
    llmStatus === "loading"      ? `AI ${loadProgress}%` :
    llmStatus === "paused"       ? `Paused ${loadProgress}%` :
    llmStatus === "wifi_blocked" ? "Wi-Fi only" :
    llmStatus === "unsupported"  ? "n-gram" : "n-gram";

  // ── Glow mode ────────────────────────────────────────────────────
  // "speaking" = green border glow when TTS is active
  // "dot"      = orbiting dot (passive listening / idle)
  // "full"     = full border glow (active listen transcript states)
  const glowMode = (() => {
    if (speaking) return "speaking";
    if (!listenMode.active) return null;
    const s = listenMode.state;
    if (s === "wake_detected" || s === "recording" || s === "transcribing" ||
        s === "generating" || s === "suggestions" || s === "speaking") {
      return "full";
    }
    return "dot";
  })();

  // ── Onboarding complete ─────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback(({ langCode, name, avatar, gender: g, hand: h }) => {
    try {
      localStorage.setItem("speakeasy_name_v1",   name);
      localStorage.setItem("speakeasy_avatar_v1", avatar);
    } catch { /* ignore */ }
    setGender(g);
    setHand(h);
    setUiLang(langCode);
    setJustCompletedOnboarding(true); // new user → show signup tab
    setOnboardingDone(true);
  }, [setGender, setHand, setUiLang]);

  const resetOnboarding = useCallback(() => {
    try { localStorage.removeItem(ONBOARDING_KEY); } catch { /* ignore */ }
    setOnboardingDone(false);
  }, []);

  if (!onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // ── Mandatory auth gate (skipped in demo mode) ─────────────────────────
  if (!IS_DEMO) {
    // Show a spinner while Firebase resolves the persisted session.
    if (isLoading) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "var(--bg)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "3px solid var(--sep)",
            borderTopColor: "var(--tint)",
            animation: "spin 0.7s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      );
    }

    // No account → block the entire app and force sign-in.
    if (!isAuthenticated) {
      return (
        <AuthModal
          isOpen
          required
          lang={uiLangCode}
          initialMode={justCompletedOnboarding ? "signup" : "login"}
          onClose={null}
          onSuccess={() => { /* auth state listener updates isAuthenticated automatically */ }}
        />
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height:        "var(--app-height, 100svh)",
      display:       "flex",
      flexDirection: "column",
      background:    "var(--bg)",
      width:         "100%",
      overflow:      "hidden",
      position:      "relative",
    }}>

      {/* ── Border glow: TTS speaking (green) or listen mode (blue) ── */}
      {glowMode && (
        <div
          className={`listen-glow listen-glow--${glowMode}`}
          aria-hidden="true"
        />
      )}

        {/* ─────────────────── HEADER (always visible) ─────────────────── */}
        <header style={{
          background:     "var(--glass-bg)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderBottom:   "var(--glass-border)",
          padding:        "var(--safe-top, 4px) 8px 8px",
          display:        "flex",
          position:       "relative",
          overflow:       "hidden",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
          zIndex:         20,
          minHeight:      64,
        }}>
          {/* Icons — left-aligned with consistent gap */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, width: "100%", paddingLeft: 4 }}>
            {!IS_DEMO && (
            <button
              onClick={() => setShowAIModal(true)}
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: "var(--elevated)", border: "0.5px solid var(--sep)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                position: "relative",
                overflow: "hidden",
              }}
              aria-label={`AI model status: ${aiStatusLabel}`}
            >
              <Cpu size={16} strokeWidth={2} style={{ color: aiDotColor, flexShrink: 0 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: aiDotColor, lineHeight: 1 }}>AI</span>
            </button>
            )}

            {/* ⚠️ SOS — always-visible emergency shortcut */}
            <button
              onClick={handleSOS}
              aria-label="Emergency SOS"
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: "#FFF0F0",
                border: "1.5px solid #E03131",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer", transition: "all 0.18s ease",
                color: "#C92A2A",
                touchAction: "manipulation",
                flexShrink: 0,
              }}
            >
              <Siren size={20} strokeWidth={2} />
              <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>SOS</span>
            </button>

            {/* Listen Mode toggle — activates like Alexa */}
            {!IS_DEMO && (
            <button
              onClick={() => {
                haptic();
                if (listenMode.active) listenMode.deactivate();
                else void listenMode.activate();
              }}
              aria-label={listenMode.active ? (ui.listenStop ?? "Stop Listening") : (ui.listenStart ?? "Start Listening")}
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: listenMode.active ? "var(--tint)" : "var(--elevated)",
                border: `0.5px solid ${listenMode.active ? "var(--tint)" : "var(--sep)"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer", transition: "all 0.18s ease",
                color: listenMode.active ? "#fff" : "var(--text-3)",
                position: "relative",
                touchAction: "manipulation",
                overflow: "hidden",
                animation: listenMode.state === "listening" ? "pulse 2s ease infinite" : "none",
              }}
            >
              <Ear size={20} strokeWidth={1.8} />
              <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>{ui.headerListen ?? "Listen"}</span>
            </button>
            )}

            {/* Sign Language Guide button */}
            <button
              onClick={() => setShowSignGuide(true)}
              aria-label={ui.headerSign ?? "Sign"}
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: "var(--elevated)",
                border: "0.5px solid var(--sep)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer", transition: "all 0.18s ease",
                color: "var(--text-3)",
                touchAction: "manipulation",
              }}
            >
              <Hand size={20} strokeWidth={1.8} />
              <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>{ui.headerSign ?? "Sign"}</span>
            </button>

            {/* Help button */}
            <button
              onClick={() => setShowHelp(true)}
              aria-label={ui.headerHelp ?? "Help"}
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: "var(--elevated)",
                border: "0.5px solid var(--sep)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer", transition: "all 0.18s ease",
                color: "var(--text-3)",
                touchAction: "manipulation",
              }}
            >
              <HelpCircle size={20} strokeWidth={1.8} />
              <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>{ui.headerHelp ?? "Help"}</span>
            </button>

            {/* Feedback button */}
            <button
              onClick={() => { haptic(); setShowFeedbackModal(true); }}
              aria-label="Send Feedback"
              style={{
                width: 48, height: 54, borderRadius: 14,
                background: "var(--elevated)",
                border: "0.5px solid var(--sep)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: "pointer", transition: "all 0.18s ease",
                color: "var(--text-3)",
                touchAction: "manipulation",
              }}
            >
              <MessageSquarePlus size={20} strokeWidth={1.8} />
              <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>Feedback</span>
            </button>

          </div>

          {/* ── DEMO mode diagonal ribbon ── */}
          {IS_DEMO && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute", top: 0, right: 0,
                width: 86, height: 86,
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              <div style={{
                position: "absolute",
                top: 20, right: -26,
                width: 110,
                background: "#E03131",
                color: "#fff",
                fontSize: 9,
                fontWeight: 900,
                textAlign: "center",
                padding: "4px 0",
                transform: "rotate(45deg)",
                letterSpacing: "0.12em",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                userSelect: "none",
              }}>
                DEMO
              </div>
            </div>
          )}
        </header>

        {/* ─── Spoken-sentence confirmation toast ─── */}
        {spokenToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "absolute", top: 68, left: 12, right: 12,
              zIndex: 200,
              background: "#2B8A3E", color: "#fff",
              padding: "8px 14px", borderRadius: 12,
              fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
              animation: "fadeIn 0.2s ease",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{spokenToast}</span>
          </div>
        )}

        {/* ─────────────────── SENTENCE BUILDER + INTENT BAR (board only) ─────────────────── */}
        {tab === "board" && <>
          <MessageBar
            words={words}
            speaking={speaking}
            onSpeak={handleSpeak}
            onRemoveWord={handleRemoveWord}
            onDeleteLast={handleDeleteLast}
            onClear={handleClear}
            onCommitTyped={handleCommitTyped}
            onTyping={handleTyping}
            onStopSpeaking={handleStopSpeaking}
            onSaveFavorite={addFavorite}
            lastSpoken={lastSpoken}
            onRepeat={handleRepeat}
            dir={typeLang.dir}
            ui={ui}
          />
          {boardMode === "symbols" && (
            <>
            <IntentBar
              suggestions={sentenceSuggestions}
              onSelect={handleSuggestionSelect}
              onSpeak={handleIntentSpeak}
              source="template"
              ui={ui}
              emotion={emotion}
              onEmotionChange={setEmotion}
              detectedEmotion={detectedEmotion}
            />
            </>
          )}
        </>}

        {/* ─────────────────── MAIN CONTENT ─────────────────── */}
        {/* flex:1 — nav is a natural flex sibling below, no padding compensation needed */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* ── Inline conversation panel — replaces old bottom-sheet overlay ── */}
          {tab === "board" && (
            <ConversationPanel
              state={listenMode.state}
              energy={listenMode.energy}
              transcript={listenMode.transcript}
              partialText={listenMode.partialText}
              suggestions={listenMode.suggestions}
              selectedReply={listenMode.selectedReply}
              error={listenMode.error}
              wakeWord={wakeWord || wakeKeywordsList[0] || "Hey"}
              whisperLoading={listenMode.whisperLoading}
              whisperProgress={listenMode.whisperProgress}
              chatHistory={chatHistory}
              conversational={listenMode.conversational}
              onStopRecording={listenMode.stopRecording}
              onSelectReply={listenMode.selectReply}
              onDismiss={listenMode.dismiss}
              onTypeReply={listenMode.dismissToBoard}
              onContinue={listenMode.continueListening}
              onStopSpeaking={handleStopSpeaking}
              ui={ui}
            />
          )}

          {/* Board — category grid (home) or symbol picker (drilled-in) */}
          <div style={{
            display: tab === "board" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}>
            {boardMode === "keyboard" ? (
              /* ── Smart Keyboard mode ── */
              <SmartKeyboard
                langCode={typeLangCode}
                words={wordTexts}
                predictions={aiSuggestions}
                onAcceptWord={(word) => {
                  const trimmed = word.trim();
                  if (trimmed) setWords(prev => [...prev, trimmed]);
                }}
                onBackspace={() => setWords(prev => prev.slice(0, -1))}
                onSubmit={() => handleSpeak()}
              />
            ) : (
              /* ── Symbol grid mode (default) ── */
              <>
            {activeCategory ? (
              activeCategory.action === "quick" ? (
                quickSubTab ? (
                  /* ── Drilled into a quick-phrase sub-category ── */
                  <>
                    <SubViewHeader
                      onBack={() => setQuickSubTab(null)}
                      title={ui?.[QUICK_SUBCATEGORIES.find(c => c.id === quickSubTab)?.labelKey] ?? quickSubTab}
                      emoji={QUICK_SUBCATEGORIES.find(c => c.id === quickSubTab)?.emoji ?? "⭐"}
                      bg={QUICK_SUBCATEGORIES.find(c => c.id === quickSubTab)?.bg ?? "#FFF9DB"}
                    />
                    <PhraseGrid
                      phrases={getQuickTab(quickSubTab)}
                      langCode={typeLangCode}
                      onTapSpeak={handlePhraseSpeak}
                    />
                  </>
                ) : (
                  /* ── Quick-phrase sub-category picker (2×2 grid) ── */
                  <>
                    <SubViewHeader onBack={handleCategoryBack} title={ui?.catQuick?.replace("\n", " ") ?? "Quick Phrases"} emoji="⚡" bg="#FFF9DB" />
                    <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", padding: 14 }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 14,
                      }}>
                        {QUICK_SUBCATEGORIES.map(sc => (
                          <button
                            key={sc.id}
                            onClick={() => { haptic(); setQuickSubTab(sc.id); }}
                            style={{
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              gap: 10,
                              padding: "28px 12px",
                              borderRadius: 20,
                              background: sc.bg,
                              border: `2px solid ${sc.color}22`,
                              cursor: "pointer",
                              WebkitTapHighlightColor: "transparent",
                              touchAction: "manipulation",
                              transition: "transform 0.12s ease",
                            }}
                            onPointerDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
                            onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                            onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                          >
                            <span style={{ fontSize: 44, lineHeight: 1 }} aria-hidden="true">{sc.emoji}</span>
                            <span style={{
                              fontSize: 17, fontWeight: 700, color: sc.color,
                              letterSpacing: "0.01em", textAlign: "center",
                            }}>
                              {ui?.[sc.labelKey] ?? sc.id}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )
              ) : activeCategory.action === "favorites" ? (
                <FavoritesSheet
                  favorites={favorites}
                  onBack={handleCategoryBack}
                  onSpeak={(text) => handleSpeak(text)}
                  onEdit={(item) => {
                    const parts = item.text.trim().split(/\s+/).filter(Boolean);
                    if (parts.length) { setWords(parts); handleCategoryBack(); }
                  }}
                  onRemove={removeFavorite}
                  leftHanded={hand === "left"}
                  ui={ui}
                />
              ) : activeCategory.action === "emergency" ? (
                <>
                  <SubViewHeader onBack={handleCategoryBack} title={ui?.catEmergency ?? "Emergency"} emoji="🚨" bg="#FFE3E3" />
                  <PhraseGrid
                    phrases={getQuickTab("emergency")}
                    langCode={typeLangCode}
                    isEmergency
                    onTapSpeak={handlePhraseSpeak}
                  />
                </>
              ) : (
                <SymbolPicker
                  category={activeCategory}
                  boardId={currentBoard.id}
                  onTap={handleTap}
                  onTapContext={handleTapContext}
                  onBack={handleCategoryBack}
                  langCode={typeLangCode}
                  customSymbols={customSymbols}
                  hiddenSymbols={hiddenSymbols}
                  ui={ui}
                />
              )
            ) : (
              <>
                <BoardSelector boards={boards} currentBoard={currentBoard} onSelect={setBoardId} ui={ui} />
                <CategoryGrid onSelect={handleCategorySelect} ui={ui} categoryIds={currentBoard.categories} />
              </>
            )}
              </>
            )}

            {/* ── FAB: tap = toggle board mode, long-press = direct listen ── */}
            <FabButton
              boardMode={boardMode}
              onToggleMode={() => setBoardMode(m => m === "symbols" ? "keyboard" : "symbols")}
              onLongPress={IS_DEMO ? undefined : () => { haptic(); listenMode.quickRecord(); }}
            />

            {/* ConversationPanel is now rendered inline above the board */}
          </div>

          {/* ─────────────────── SYMBOLS ─────────────────── */}
          {tab === "symbols" && (
            <SymbolsPanel
              langCode={typeLangCode}
              onSpeak={handleVocabSpeak}
              vocabMode={vocabMode}
              ui={ui}
            />
          )}

          {tab === "history" && (
            <HistoryPanel
              history={history}
              onReuse={handleHistoryReuse}
              onSpeak={handleHistorySpeak}
              onDelete={deleteUtterance}
              onClearAll={clearHistory}
              favorites={favorites}
              onToggleFavorite={(item) => {
                const exists = favorites.find(f => f.text.toLowerCase() === item.text.toLowerCase());
                if (exists) removeFavorite(exists.id);
                else addFavorite(item.text);
              }}
              leftHanded={hand === "left"}
              ui={ui}
            />
          )}

          {/* ─────────────────── PROFILE ─────────────────── */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* ── Subscription banner (hidden in demo) ── */}
              {!IS_DEMO && (
                <SubscriptionBanner
                  remainingAI={remainingAI}
                  remainingVoice={remainingVoice}
                  aiLimit={aiLimit}
                  voiceLimit={voiceLimit}
                  isPremium={isPremium}
                  onUpgrade={openPaywall}
                />
              )}
              <ProfilePanel
                uiLangCode={uiLangCode}
                onNameChange={setWakeWord}
                gender={gender}
                setGender={setGender}
                ui={ui}
                isPremium={IS_DEMO ? true : isPremium}
                isInTrial={IS_DEMO ? false : isInTrial}
                trialDaysLeft={IS_DEMO ? 0 : trialDaysLeft}
                isAuthenticated={IS_DEMO ? false : isAuthenticated}
                userEmail={IS_DEMO ? undefined : user?.email}
                userProvider={IS_DEMO ? undefined : user?.providerData?.[0]?.providerId}
                onOpenAuth={IS_DEMO ? () => {} : () => setShowAuthModal(true)}
                onSignOut={IS_DEMO ? () => {} : authSignOut}
                onChangePassword={IS_DEMO ? () => {} : authChangePassword}
                onResetPassword={IS_DEMO ? () => {} : authResetPassword}
                onDeleteAccount={IS_DEMO ? () => {} : authDeleteAccount}
                onUpgrade={IS_DEMO ? () => {} : openPaywall}
                isDemo={IS_DEMO}
                setUiLang={setUiLang}
                typeLangCode={typeLangCode}
                ttsLangCode={ttsLangCode}
                listenLangCode={listenLangCode}
                setListenLang={setListenLang}
                setTypeLang={setTypeLang}
                setTtsLang={setTtsLang}
                voiceSpeed={voiceSpeed}
                voicePitch={voicePitch}
                setVoiceSpeed={setVoiceSpeed}
                setVoicePitch={setVoicePitch}
                voiceName={voiceName}
                setVoiceName={setVoiceName}
                voices={voices}
                onTryVoice={() => speak(
                  ui.tryVoiceSentence ?? "Hello! This is how I sound with your current settings.",
                  { lang: ttsLang.ttsLang, rate: voiceSpeed, pitch: voicePitch, voiceName }
                )}
                speaking={speaking}
                hand={hand}
                setHand={setHand}
                wakeKeywords={wakeKeywords}
                setWakeKeywords={setWakeKeywords}
                onExport={exportHistory}
                onClearHistory={clearHistory}
                onResetAI={handleResetAI}
                theme={theme}
                setTheme={setTheme}
                vocabMode={vocabMode}
                setVocabMode={setVocabMode}
                aiAutoCorrect={aiAutoCorrect}
                setAiAutoCorrect={setAiAutoCorrect}
              />
            </div>
          )}
        </div>

      {/* ─────────────────── BOTTOM NAV ─────────────────── */}
      {/* Natural flex child — avoids position:fixed PWA bugs on iOS/Android where
           fixed elements inside overflow:hidden ancestors can be clipped or pushed
           off-screen in standalone mode. The root div already fills --app-height
           as a flex column, so the nav always anchors to the real bottom. */}
      <nav style={{
        display:       "flex",
        background:    "var(--glass-bg)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        backdropFilter: "saturate(180%) blur(20px)",
        borderTop:     "var(--glass-border)",
        flexShrink:    0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex:        20,
      }} aria-label="Main navigation">
        <NavItem id="board"     icon={Grid3X3}  label={ui.board       ?? "Board"}      active={tab === "board"}     onClick={setTab} />
        <NavItem id="symbols"   icon={Shapes}   label={ui.symbols     ?? "Symbols"}   active={tab === "symbols"}   onClick={setTab} />
        <NavItem id="history"   icon={Clock}    label={ui.history     ?? "History"}    active={tab === "history"}   onClick={setTab} />
        <NavItem id="profile"   icon={User}     label={ui.profile     ?? "Profile"}    active={tab === "profile"}  onClick={setTab} />
      </nav>

      {/* Sign Language Guide modal */}
      {showSignGuide && (
        <SignLanguageModal
          open={showSignGuide}
          onClose={() => setShowSignGuide(false)}
          langCode={uiLangCode}
          typeLangCode={typeLangCode}
          onSpeak={(word) => speak(word, { lang: ttsLang.ttsLang, rate: voiceSpeed, pitch: voicePitch, voiceName })}
        />
      )}

      {/* Help modal */}
      {showHelp && (
        <HelpModal
          onClose={() => setShowHelp(false)}
          langCode={uiLangCode}
          onResetOnboarding={resetOnboarding}
        />
      )}

      {/* Feedback modal */}
      {showFeedbackModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send Feedback"
          onClick={e => { if (e.target === e.currentTarget) setShowFeedbackModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{
            width: "100%", maxWidth: 520,
            background: "var(--surface)",
            borderRadius: "20px 20px 0 0",
            padding: "20px 20px calc(20px + var(--safe-bottom, 0px))",
            boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          }}>
            {/* handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sep)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Send Feedback</span>
              <button
                onClick={() => setShowFeedbackModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: "var(--elevated)", border: "0.5px solid var(--sep)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-3)", fontSize: 18, lineHeight: 1,
                }}
                aria-label="Close"
              >×</button>
            </div>
            <FeedbackForm t={ui} debugWords={wordTexts} />
          </div>
        </div>
      )}

      {/* PWA install prompt */}
      <InstallPrompt ui={ui} />

      {/* Auth modal (hidden in demo) */}
      {!IS_DEMO && (
        <AuthModal
          isOpen={showAuthModal}
          lang={uiLangCode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* Subscription paywall (hidden in demo) */}
      {!IS_DEMO && (
        <Paywall
          isOpen={showPaywall}
          onClose={closePaywall}
          onPurchased={() => { closePaywall(); refreshSub(); }}
          offering={offering}
          restore={restore}
        />
      )}

      {/* AI Model modal */}
      <AIModelModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        activeModelKey={aiModelKey}
        llmStatus={llmStatus}
        loadProgress={loadProgress}
        isPaused={isPaused}
        wifiOnly={wifiOnly}
        setWifiOnly={setWifiOnly}
        webGpuSupported={webGpuSupported}
        onDownload={aiInitEngine}
        onPause={aiPause}
        onResume={aiResume}
        onDelete={aiDeleteModel}
        onSwitchModel={handleChangeAiModel}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        ui={ui}
      />
    </div>
  );
}
