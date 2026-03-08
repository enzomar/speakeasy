/**
 * App.jsx — SpeakEasy AAC · Native mobile-first layout
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare, Grid3X3, Clock, Settings, User,
  Cpu, Ear, HelpCircle, ArrowLeft
} from "lucide-react";

// Hooks
import { useTTS }          from "./hooks/useTTS";
import { usePrediction }   from "./hooks/usePrediction";
import { useStorage }      from "./hooks/useStorage";
import { useAIPrediction } from "./hooks/useAIPrediction";
import { useLanguage }     from "./hooks/useLanguage";
import { useListenMode }     from "./hooks/useListenMode";
import { useFavorites }      from "./hooks/useFavorites";
import { useCustomSymbols }  from "./hooks/useCustomSymbols";
import { useQuickPhrases }   from "./hooks/useQuickPhrases";

// Components
import MessageBar        from "./components/MessageBar";
import IntentBar         from "./components/IntentBar";
import CategoryGrid      from "./components/CategoryGrid";
import SymbolPicker      from "./components/SymbolPicker";
import PhraseGrid        from "./components/PhraseGrid";
import ProfilePanel      from "./components/ProfilePanel";
import HistoryPanel      from "./components/HistoryPanel";
import SymbolsPage       from "./components/SymbolsPage";
import ListenOverlay     from "./components/ListenModePanel";
import HelpModal         from "./components/HelpModal";

// Data
import { getUI }             from "./data/languages";
import { ragAdd, ragReset }  from "./utils/ragMemory";
import { isNative, isIOS }   from "./utils/platform";

// ── Capacitor native bootstrap ────────────────────────────────────────────────
if (isNative) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (!isIOS) StatusBar.setBackgroundColor({ color: "#FFFFFF" }).catch(() => {});
  });
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide().catch(() => {});
  });
}

/** Fire a light haptic tap on native (no-op on web) */
async function haptic() {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
}

// ── Voice / AI setting helpers ────────────────────────────────────────────────
const VOICE_SPEED_KEY = "speakeasy_voice_speed_v1";
const VOICE_PITCH_KEY = "speakeasy_voice_pitch_v1";
const VOICE_NAME_KEY  = "speakeasy_voice_name_v1";
const HAND_KEY        = "speakeasy_hand_v1";
const WAKE_KEYS_KEY   = "speakeasy_wake_keywords_v1";
const AI_MODEL_KEY    = "speakeasy_ai_model_v1";
const THEME_KEY       = "speakeasy_theme_v1";

function normalizeAiModel(model) {
  return model === "quality" || model === "default" ? "quality" : "fast";
}

function loadNum(key, fallback) {
  try { const v = parseFloat(localStorage.getItem(key)); return isNaN(v) ? fallback : v; }
  catch { return fallback; }
}
function saveItem(key, val) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

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
        gap: 2,
        padding: "8px 0 6px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--tint)" : "var(--text-3)",
        transition: "color 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>
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

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ── UI state ─────────────────────────────────────────────────────────────
  const [words,          setWords]          = useState([]);
  const [tab,            setTab]            = useState("board");   // "board"|"history"|"settings"|"profile"
  const [activeCategory, setActiveCategory] = useState(null);       // null = category grid, object = symbol picker
  const [showHelp, setShowHelp] = useState(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) ?? "light"; } catch { return "light"; }
  });
  const setTheme = useCallback((t) => {
    saveItem(THEME_KEY, t);
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  // Apply on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Voice settings ───────────────────────────────────────────────────────
  const [voiceSpeed, setVoiceSpeedState] = useState(() => loadNum(VOICE_SPEED_KEY, 1.0));
  const [voicePitch, setVoicePitchState] = useState(() => loadNum(VOICE_PITCH_KEY, 1.0));
  const setVoiceSpeed = useCallback((v) => { saveItem(VOICE_SPEED_KEY, v); setVoiceSpeedState(v); }, []);
  const setVoicePitch = useCallback((v) => { saveItem(VOICE_PITCH_KEY, v); setVoicePitchState(v); }, []);

  // ── AI model ─────────────────────────────────────────────────────────────
  const [aiModel, setAiModelState] = useState(
    () => normalizeAiModel(localStorage.getItem(AI_MODEL_KEY) ?? "fast")
  );
  const handleChangeAiModel = useCallback((model) => {
    const nextModel = normalizeAiModel(model);
    saveItem(AI_MODEL_KEY, nextModel);
    setAiModelState(nextModel);
  }, []);

  // ── Voice name ───────────────────────────────────────────────────────────
  const [voiceName, setVoiceNameState] = useState(() => localStorage.getItem(VOICE_NAME_KEY) ?? "");
  const setVoiceName = useCallback((v) => { saveItem(VOICE_NAME_KEY, v); setVoiceNameState(v); }, []);

  // ── Handedness ────────────────────────────────────────────────────────────
  const [hand, setHandState] = useState(() => localStorage.getItem(HAND_KEY) ?? "right");
  const setHand = useCallback((v) => { saveItem(HAND_KEY, v); setHandState(v); }, []);

  // ── Wake keywords ──────────────────────────────────────────────────────
  const [wakeKeywords, setWakeKeywordsState] = useState(() => {
    try { return localStorage.getItem(WAKE_KEYS_KEY) ?? "Luma"; }
    catch { return "Luma"; }
  });
  const setWakeKeywords = useCallback((v) => { saveItem(WAKE_KEYS_KEY, v); setWakeKeywordsState(v); }, []);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { speaking, speak, cancel, voices }                         = useTTS();
  const { learn, ready: ngramReady, resetModel }                   = usePrediction();
  const { saveUtterance, history, deleteUtterance, clearHistory, exportHistory } = useStorage();
  const { suggestions: aiSuggestions, source: aiSource, llmStatus, loadProgress, predict: aiPredict } = useAIPrediction(aiModel);
  const { addFavorite } = useFavorites();
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
    const parts = [wakeKeywords.trim().toLowerCase()].filter(Boolean);
    if (wakeWord) parts.unshift(wakeWord.toLowerCase());
    return [...new Set(parts)];
  }, [wakeKeywords, wakeWord]);

  // ── Listen Mode ──────────────────────────────────────────────────────────
  const listenMode = useListenMode({
    wakeKeywords: wakeKeywordsList,
    lang:      listenLangCode,
    ttsLang:   ttsLang.ttsLang,
    speak,
    speaking,
    whisperModel: "tiny",
  });

  const ui = getUI(uiLangCode);

  // ── Normalise words (string | {text, __typed}) ───────────────────────────
  const wordTexts = useMemo(() => words.map(w => (typeof w === "string" ? w : w.text)), [words]);

  // ── Prediction on word changes ───────────────────────────────────────────
  useEffect(() => {
    if (!ngramReady) return;
    aiPredict(wordTexts, typeLangCode);
  }, [wordTexts, ngramReady, aiPredict, typeLangCode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTap = useCallback((label) => { haptic(); setWords(prev => [...prev, label]); }, []);

  const handleSuggestionSelect = useCallback((word) => {
    setWords(prev => appendSuggestionToWords(prev, word));
  }, []);

  const handleCommitTyped = useCallback((text) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length) setWords(prev => [...prev, ...parts.map(p => ({ text: p, __typed: true }))]);
  }, []);

  const handleTyping = useCallback((draft) => {
    if (!ngramReady) return;
    const currentTexts = words.map(w => (typeof w === "string" ? w : w.text));
    const all = [...currentTexts, draft].filter(Boolean);
    aiPredict(all, typeLangCode);
  }, [words, ngramReady, aiPredict, typeLangCode]);

  const handleSpeak = useCallback((sentenceOverride) => {
    const sentence = sentenceOverride ?? wordTexts.join(" ");
    if (!sentence.trim() || speaking) return;
    haptic();
    speak(sentence, {
      lang: ttsLang.ttsLang,
      rate: voiceSpeed,
      pitch: voicePitch,
      voiceName,
      onStart: () => {
        saveUtterance(sentence);
        learn(sentence);
        ragAdd(sentence);
        setWords([]);
      },
    });
  }, [wordTexts, speaking, speak, saveUtterance, learn, ttsLang, voiceSpeed, voicePitch, voiceName]);

  const handleRemoveWord = useCallback((idx) => setWords(prev => prev.filter((_, i) => i !== idx)), []);
  const handleDeleteLast = useCallback(() => setWords(prev => prev.slice(0, -1)), []);
  const handleClear      = useCallback(() => setWords([]), []);
  const handleStopSpeaking = useCallback(() => cancel(), [cancel]);

  const handleIntentSpeak  = useCallback((text) => handleSpeak(text), [handleSpeak]);
  const handleResetAI      = useCallback(() => { ragReset(); resetModel(); }, [resetModel]);

  // ── Category navigation ──────────────────────────────────────────────────
  const handleCategorySelect = useCallback((cat) => {
    haptic();
    if (cat.action === "favorites") { setTab("history"); return; }
    setActiveCategory(cat);
  }, []);
  const handleCategoryBack   = useCallback(() => setActiveCategory(null), []);

  /** 1-tap speak for phrase grids (Quick Phrases / Emergency) */
  const handlePhraseSpeak = useCallback((text) => handleSpeak(text), [handleSpeak]);

  /** History reuse: load words into message bar */
  const handleHistoryReuse = useCallback((text) => {
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length) setWords(parts);
  }, []);

  /** History speak: speak immediately */
  const handleHistorySpeak = useCallback((text) => handleSpeak(text), [handleSpeak]);

  // ── AI status dot ─────────────────────────────────────────────────────────
  const aiDotColor =
    llmStatus === "ready"   ? "var(--green)" :
    llmStatus === "loading" ? "var(--orange)" : "var(--text-4)";
  const aiDotLabel =
    llmStatus === "ready"       ? "AI ready" :
    llmStatus === "loading"     ? `AI ${loadProgress}%` :
    llmStatus === "unsupported" ? "n-gram" : "n-gram";

  // ── Listen glow mode ───────────────────────────────────────────
  // "dot" = orbiting dot (passive listening / idle)
  // "full" = full border glow (active transcript states)
  const listenGlowMode = (() => {
    if (!listenMode.active) return null;
    const s = listenMode.state;
    if (s === "wake_detected" || s === "recording" || s === "transcribing" ||
        s === "generating" || s === "suggestions" || s === "speaking") {
      return "full";
    }
    return "dot";
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:     "100vh",
      height:        "100svh",
      display:       "flex",
      flexDirection: "column",
      background:    "var(--bg)",
      width:         "100%",
      overflow:      "hidden",
      position:      "relative",
    }}>

      {/* ── Alexa-style listen glow ── */}
      {listenGlowMode && (
        <div
          className={`listen-glow listen-glow--${listenGlowMode}`}
          aria-hidden="true"
        />
      )}

        {/* ─────────────────── HEADER (always visible) ─────────────────── */}
        <header style={{
          background:     "var(--glass-bg)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          backdropFilter: "saturate(180%) blur(20px)",
          borderBottom:   "var(--glass-border)",
          padding:        "var(--safe-top, 0) 16px 8px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          flexShrink:     0,
          zIndex:         20,
          minHeight:      52,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, var(--tint), #5856D6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "#fff",
            }}>
              <MessageSquare size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)",
                letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                SpeakEasy
              </div>
            </div>
          </div>

          {/* Right: AI status pill + Listen toggle + Settings icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              background: "var(--elevated)", border: "0.5px solid var(--sep)",
            }}>
              <Cpu size={13} strokeWidth={2} style={{ color: aiDotColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: aiDotColor }}>
                {aiDotLabel}
              </span>
            </div>

            {/* Listen Mode toggle — activates like Alexa */}
            <button
              onClick={() => {
                haptic();
                if (listenMode.active) listenMode.deactivate();
                else void listenMode.activate();
              }}
              aria-label={listenMode.active ? (ui.listenStop ?? "Stop Listening") : (ui.listenStart ?? "Start Listening")}
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: listenMode.active ? "var(--tint)" : "var(--elevated)",
                border: `0.5px solid ${listenMode.active ? "var(--tint)" : "var(--sep)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.18s ease",
                color: listenMode.active ? "#fff" : "var(--text-3)",
                position: "relative",
                animation: listenMode.state === "listening" ? "pulse 2s ease infinite" : "none",
              }}
            >
              <Ear size={18} strokeWidth={1.8} />
            </button>

            {/* Help button */}
            <button
              onClick={() => setShowHelp(true)}
              aria-label="Help"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: "var(--elevated)",
                border: "0.5px solid var(--sep)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.18s ease",
                color: "var(--text-3)",
              }}
            >
              <HelpCircle size={18} strokeWidth={1.8} />
            </button>

          </div>
        </header>

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
            dir={typeLang.dir}
            ui={ui}
          />
          <IntentBar
            suggestions={aiSuggestions}
            onSelect={handleSuggestionSelect}
            onSpeak={handleIntentSpeak}
            source={aiSource}
            ui={ui}
          />
        </>}

        {/* ─────────────────── MAIN CONTENT ─────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Board — category grid (home) or symbol picker (drilled-in) */}
          <div style={{
            display: tab === "board" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}>
            {activeCategory ? (
              activeCategory.action === "quick" ? (
                <>
                  <SubViewHeader onBack={handleCategoryBack} title="Quick Phrases" emoji="⭐" bg="#FFF9DB" />
                  <PhraseGrid
                    phrases={getQuickTab("replies")}
                    langCode={typeLangCode}
                    onTapSpeak={handlePhraseSpeak}
                  />
                </>
              ) : activeCategory.action === "emergency" ? (
                <>
                  <SubViewHeader onBack={handleCategoryBack} title="Emergency" emoji="🚨" bg="#FFE3E3" />
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
                  onTap={handleTap}
                  onBack={handleCategoryBack}
                  langCode={typeLangCode}
                  customSymbols={customSymbols}
                  hiddenSymbols={hiddenSymbols}
                />
              )
            ) : (
              <CategoryGrid onSelect={handleCategorySelect} />
            )}

            {/* Listen Mode overlay (lives on the board) */}
            <ListenOverlay
              state={listenMode.state}
              energy={listenMode.energy}
              transcript={listenMode.transcript}
              suggestions={listenMode.suggestions}
              selectedReply={listenMode.selectedReply}
              error={listenMode.error}
              wakeWord={wakeWord || wakeKeywordsList[0] || "Hey"}
              whisperLoading={listenMode.whisperLoading}
              whisperProgress={listenMode.whisperProgress}
              onStopRecording={listenMode.stopRecording}
              onSelectReply={listenMode.selectReply}
              onDismiss={listenMode.dismiss}
              onContinue={listenMode.continueListening}
              onStopSpeaking={handleStopSpeaking}
              ui={ui}
            />
          </div>

          {tab === "history" && (
            <HistoryPanel
              history={history}
              onReuse={handleHistoryReuse}
              onSpeak={handleHistorySpeak}
              onDelete={deleteUtterance}
              onClearAll={clearHistory}
              leftHanded={hand === "left"}
              ui={ui}
            />
          )}

          {/* ─────────────────── SETTINGS (symbols) ─────────────────── */}
          {tab === "settings" && (
            <SymbolsPage
              custom={customSymbols}
              hidden={hiddenSymbols}
              onAddSymbol={addSymbol}
              onRemoveSymbol={removeSymbol}
              onHideSymbol={hideSymbol}
              onUnhideSymbol={unhideSymbol}
              langCode={typeLangCode}
              ui={ui}
            />
          )}

          {/* ─────────────────── PROFILE ─────────────────── */}
          {tab === "profile" && (
            <ProfilePanel
              uiLangCode={uiLangCode}
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
              llmStatus={llmStatus}
              loadProgress={loadProgress}
              aiModel={aiModel}
              onChangeAiModel={handleChangeAiModel}
              onExport={exportHistory}
              onClearHistory={clearHistory}
              onResetAI={handleResetAI}
              onNameChange={setWakeWord}
              theme={theme}
              setTheme={setTheme}
              ui={ui}
            />
          )}
        </div>

      {/* ─────────────────── BOTTOM NAV ─────────────────── */}
      <nav style={{
        display:       "flex",
        background:    "var(--glass-bg)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        backdropFilter: "saturate(180%) blur(20px)",
        borderTop:     "var(--glass-border)",
        flexShrink:    0,
        position:      "relative",
        paddingBottom: "var(--safe-bottom, 0)",
        zIndex:        20,
      }} aria-label="Main navigation">
        <NavItem id="board"     icon={Grid3X3}  label={ui.board       ?? "Board"}      active={tab === "board"}     onClick={setTab} />
        <NavItem id="history"   icon={Clock}    label={ui.history     ?? "History"}    active={tab === "history"}   onClick={setTab} />
        <NavItem id="settings"  icon={Settings} label={ui.symbols    ?? "Symbols"}    active={tab === "settings"} onClick={setTab} />
        <NavItem id="profile"   icon={User}     label={ui.profile     ?? "Profile"}    active={tab === "profile"}  onClick={setTab} />
      </nav>

      {/* Help modal */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} langCode={uiLangCode} />
      )}
    </div>
  );
}
