/**
 * SettingsPanel — Configuration page.
 * Contains: Languages, Voice, Listen Mode, Accessibility, AI Engine, Data & Privacy.
 */

import { memo, useState, useCallback } from "react";
import {
  Languages, Volume2, Gauge, Music, Mic, Play,
  Brain, Zap, Download, Trash2, RotateCcw,
  Hand, Ear, Search, Globe, Headphones,
  Sun, Moon, MousePointerClick, Wand2,
} from "lucide-react";
import { LANGUAGES, ACTIVATION_KEYWORDS } from "../../i18n/languages";
import ConfirmSheet from "../../shared/ui/ConfirmSheet";
import {
  Section, Row, Toggle, NativeSelect, Slider, ActionButton,
} from "../../shared/ui/settingsUI";

export default memo(function SettingsPanel({
  uiLangCode, setUiLang,
  typeLangCode, ttsLangCode, listenLangCode, setListenLang,
  setTypeLang, setTtsLang,
  voiceSpeed, voicePitch, setVoiceSpeed, setVoicePitch,
  voiceName, setVoiceName, voices,
  onTryVoice, speaking,
  llmStatus, loadProgress, aiModel, onChangeAiModel,
  hand, setHand,
  wakeKeywords, setWakeKeywords,
  onExport, onClearHistory, onResetAI,
  theme, setTheme,
  vocabMode, setVocabMode,
  aiAutoCorrect, setAiAutoCorrect,
  ui,
}) {
  const [confirm, setConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const langOptions = LANGUAGES.map(l => ({ value: l.code, label: `${l.flag} ${l.name}` }));

  // Filter voices for the current TTS language
  const ttsPrefix = (ttsLangCode || "en").slice(0, 2);
  const filteredVoices = (voices || []).filter(
    v => v.lang === ttsLangCode || v.lang.startsWith(ttsPrefix)
  );
  const voiceOptions = [
    { value: "", label: ui?.autoVoice ?? "Auto (best available)" },
    ...filteredVoices.map(v => ({
      value: v.name,
      label: v.name.replace(/\s*\(.*\)$/, ""),
    })),
  ];

  // When the user picks a specific voice, also sync the TTS language to that
  // voice's language tag so both settings stay consistent.
  const handleVoiceChange = useCallback((name) => {
    setVoiceName(name);
    if (!name) return; // "Auto" — leave ttsLang alone
    const picked = (voices || []).find(v => v.name === name);
    if (!picked) return;
    // picked.lang is a BCP-47 tag like "it-IT" — match on 2-char ISO prefix
    const voiceLangPrefix = picked.lang.slice(0, 2).toLowerCase();
    const match = LANGUAGES.find(l => l.code === voiceLangPrefix);
    if (match && match.code !== ttsLangCode) {
      setTtsLang(match.code);
    }
  }, [setVoiceName, setTtsLang, voices, ttsLangCode]);

  // When the TTS language changes from the language picker, clear any pinned
  // voice name so the auto-scoring logic picks the best voice for the new lang.
  const handleTtsLangChange = useCallback((code) => {
    setTtsLang(code);
    if (voiceName) setVoiceName(""); // reset to "Auto"
  }, [setTtsLang, setVoiceName, voiceName]);

  const aiOptions = [
    { value: "fast",    label: "Fast (0.5B, low RAM)" },
    { value: "quality", label: "Quality (1.7B, GPU)" },
  ];

  const llmBadgeColor =
    llmStatus === "ready"   ? "var(--green)" :
    llmStatus === "loading" ? "var(--orange)" : "var(--text-3)";
  const llmBadgeLabel =
    llmStatus === "ready"   ? (ui?.aiReady ?? "Ready") :
    llmStatus === "loading" ? `${ui?.loadingAI ?? "Loading"} ${loadProgress}%` :
    llmStatus === "unsupported" ? "Needs WebGPU" : "Offline mode";

  const q = searchQuery.trim().toLowerCase();
  const show = (...terms) => !q || terms.some(t => String(t ?? "").toLowerCase().includes(q));

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
      {/* ── Search bar ── */}
      <div style={{ padding: "12px 16px 0", position: "sticky", top: 0, zIndex: 10, background: "var(--bg)" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-3)", pointerEvents: "none",
          }} />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={ui?.searchSettings ?? "Search settings…"}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              borderRadius: "var(--radius-md)", border: "none",
              background: "var(--surface)", fontSize: 15,
              color: "var(--text)", outline: "none",
              WebkitAppearance: "none",
            }}
          />
        </div>
      </div>
      <div style={{ padding: "16px 16px 40px" }}>

        {/* ── Languages ── */}
        {show("language", "interface", "speak", "type", "listen", "recognition", "tts", ui?.sectionLanguages ?? "languages") && (
        <Section title={ui?.sectionLanguages ?? "Languages"}>
          <Row
            Icon={Globe}
            iconBg="#5856D6"
            label={ui?.rowLanguage ?? "Language"}
            sublabel={ui?.subLanguage ?? "Interface, symbols and AI suggestions"}
            action={<NativeSelect value={uiLangCode} options={langOptions} onChange={setUiLang} />}
          />
          <Row
            Icon={Volume2}
            iconBg="var(--orange)"
            label={ui?.rowSpeakLang ?? "Speak language"}
            sublabel={ui?.subSpeakLang ?? "Text-to-speech voice"}
            action={<NativeSelect value={ttsLangCode} options={langOptions} onChange={handleTtsLangChange} />}
          />
          <Row
            Icon={Headphones}
            iconBg="#FF2D55"
            label={ui?.rowListenLang ?? "Listening language"}
            sublabel={ui?.subListenLang ?? "Speech recognition in Listen Mode"}
            action={<NativeSelect value={listenLangCode} options={langOptions} onChange={setListenLang} />}
            border={false}
          />
        </Section>
        )}

        {/* ── Voice ── */}
        {show("voice", "speed", "pitch", "rate", "sound", ui?.sectionVoice ?? "voice") && (
        <Section title={ui?.sectionVoice ?? "Voice"}>
          <Row
            Icon={Mic}
            iconBg="var(--tint)"
            label={ui?.sectionVoice ?? "Voice"}
            sublabel={voiceName || (ui?.autoVoice ?? "Auto (best available)")}
            action={<NativeSelect value={voiceName} options={voiceOptions} onChange={handleVoiceChange} />}
          />
          <Row
            Icon={Gauge}
            iconBg="var(--purple)"
            label={ui?.rowSpeed ?? "Speed"}
            action={
              <Slider value={voiceSpeed} min={0.5} max={1.5} step={0.05}
                onChange={setVoiceSpeed} format={v => `${v.toFixed(2)}×`} />
            }
          />
          <Row
            Icon={Music}
            iconBg="#FF2D55"
            label={ui?.rowPitch ?? "Pitch"}
            action={
              <Slider value={voicePitch} min={0.5} max={1.5} step={0.05}
                onChange={setVoicePitch} format={v => `${v.toFixed(2)}×`} />
            }
          />
          <Row
            Icon={Play}
            iconBg="var(--green)"
            label={ui?.rowTryVoice ?? "Try voice"}
            sublabel={ui?.subTryVoice ?? "Listen to current settings"}
            action={
              <button
                onClick={onTryVoice}
                disabled={speaking}
                style={{
                  padding: "8px 18px",
                  borderRadius: "var(--radius-xl)",
                  border: "none",
                  background: speaking ? "var(--sep)" : "var(--tint)",
                  color: speaking ? "var(--text-4)" : "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: speaking ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Play size={14} strokeWidth={2.2} fill="currentColor" />
                {speaking ? (ui?.trying ?? "Playing…") : (ui?.tryVoice ?? "Try")}
              </button>
            }
            border={false}
          />
        </Section>
        )}

        {/* ── Listen Mode ── */}
        {show("listen", "wake", "keyword", "activation", "ear", ui?.sectionListen ?? "listen mode") && (
        <Section title={ui?.sectionListen ?? "Listen Mode"}>
          <Row
            Icon={Ear}
            iconBg="var(--tint)"
            label={ui?.listenKeywords ?? "Activation keyword"}
            sublabel={ui?.listenKeywordsHint ?? "Your name is also added automatically."}
            border={false}
          />
          <div style={{
            display: "flex", gap: 8, padding: "4px 16px 14px",
            flexWrap: "wrap",
          }}>
            {(ACTIVATION_KEYWORDS[typeLangCode] ?? ACTIVATION_KEYWORDS.en).map(kw => {
              const selected = wakeKeywords === kw;
              return (
                <button
                  key={kw}
                  onClick={() => setWakeKeywords?.(kw)}
                  style={{
                    padding:      "8px 16px",
                    borderRadius: "var(--radius-xl)",
                    border:       selected ? "2px solid var(--tint)" : "1.5px solid var(--sep)",
                    background:   selected ? "var(--tint-soft)" : "var(--bg)",
                    color:        selected ? "var(--tint)" : "var(--text-2)",
                    fontSize:     14,
                    fontWeight:   600,
                    cursor:       "pointer",
                    whiteSpace:   "nowrap",
                    transition:   "all 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {kw}
                </button>
              );
            })}
          </div>
        </Section>
        )}

        {/* ── Accessibility ── */}
        {show("accessibility", "hand", "left", "right", "theme", "dark", "light", "appearance", ui?.sectionAccessibility ?? "accessibility") && (
        <Section title={ui?.sectionAccessibility ?? "Accessibility"}>
          <Row
            Icon={theme === "dark" ? Moon : Sun}
            iconBg={theme === "dark" ? "#5856D6" : "#F0A54E"}
            label={ui?.rowTheme ?? "Appearance"}
            sublabel={theme === "dark" ? (ui?.subThemeDark ?? "Dark mode — easier on the eyes") : (ui?.subThemeLight ?? "Light mode — bright and clear")}
            action={
              <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--sep)" }}>
                {["light", "dark"].map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme?.(t)}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      background: theme === t ? "var(--tint)" : "var(--bg)",
                      color: theme === t ? "#fff" : "var(--text-2)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {t === "light" ? (ui?.themeLight ?? "Light") : (ui?.themeDark ?? "Dark")}
                  </button>
                ))}
              </div>
            }
          />
          <Row
            Icon={Hand}
            iconBg="var(--tint)"
            label={ui?.rowHandedness ?? "Handedness"}
            sublabel={hand === "left" ? (ui?.subHandLeft ?? "Optimised for left hand") : (ui?.subHandRight ?? "Optimised for right hand")}
            action={
              <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--sep)" }}>
                {["left", "right"].map(h => (
                  <button
                    key={h}
                    onClick={() => setHand?.(h)}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      background: hand === h ? "var(--tint)" : "var(--bg)",
                      color: hand === h ? "#fff" : "var(--text-2)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {h === "left" ? (ui?.handLeft ?? "Left") : (ui?.handRight ?? "Right")}
                  </button>
                ))}
              </div>
            }
          />
          <Row
            Icon={MousePointerClick}
            iconBg="#E8590C"
            label={ui?.rowVocabMode ?? "Vocab tap action"}
            sublabel={vocabMode === "compose"
              ? (ui?.subVocabCompose ?? "Adds word to message bar")
              : (ui?.subVocabSpeak ?? "Speaks word immediately")}
            action={
              <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--sep)" }}>
                {["speak", "compose"].map(m => (
                  <button
                    key={m}
                    onClick={() => setVocabMode?.(m)}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      background: vocabMode === m ? "var(--tint)" : "var(--bg)",
                      color: vocabMode === m ? "#fff" : "var(--text-2)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {m === "speak" ? (ui?.vocabSpeak ?? "Speak") : (ui?.vocabCompose ?? "Compose")}
                  </button>
                ))}
              </div>
            }
          />
          <Row
            Icon={Wand2}
            iconBg="#7048E8"
            label={ui?.rowAiCorrect ?? "AI auto-correction"}
            sublabel={aiAutoCorrect === "on"
              ? (ui?.subAiCorrectOn ?? "AI may rephrase your sentence")
              : (ui?.subAiCorrectOff ?? "Your exact words are always spoken")}
            action={
              <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--sep)" }}>
                {["off", "on"].map(v => (
                  <button
                    key={v}
                    onClick={() => setAiAutoCorrect?.(v)}
                    style={{
                      padding: "6px 14px",
                      border: "none",
                      background: aiAutoCorrect === v ? "var(--tint)" : "var(--bg)",
                      color: aiAutoCorrect === v ? "#fff" : "var(--text-2)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {v === "off" ? (ui?.aiCorrectOff ?? "Off") : (ui?.aiCorrectOn ?? "On")}
                  </button>
                ))}
              </div>
            }
            border={false}
          />
        </Section>
        )}

        {/* ── AI Engine ── */}
        {show("ai", "model", "brain", "smart", "engine", ui?.sectionAI ?? "ai engine") && (
        <Section title={ui?.sectionAI ?? "AI Engine"}>
          <Row
            Icon={Brain}
            iconBg="var(--purple)"
            label={ui?.rowModel ?? "Model"}
            sublabel={ui?.subModel ?? "Higher quality needs more RAM"}
            action={<NativeSelect value={aiModel} options={aiOptions} onChange={onChangeAiModel} />}
          />
          <Row
            Icon={Zap}
            iconBg="var(--orange)"
            label={ui?.rowStatus ?? "Status"}
            action={
              <span style={{
                padding: "4px 10px", borderRadius: "var(--radius-sm)",
                background: "var(--bg)",
                color: llmBadgeColor, fontSize: 13, fontWeight: 600,
              }}>
                {llmBadgeLabel}
              </span>
            }
            border={false}
          />
        </Section>
        )}

        {/* ── Data & Privacy ── */}
        {show("data", "privacy", "export", "history", "clear", "reset", ui?.sectionData ?? "data privacy") && (
        <Section title={ui?.sectionData ?? "Data & Privacy"}>
          <Row
            Icon={Download}
            iconBg="var(--tint)"
            label={ui?.rowExportHistory ?? "Export history"}
            sublabel={ui?.subExportHistory ?? "Download all utterances as JSON"}
            action={<ActionButton onClick={onExport}>Export</ActionButton>}
          />
          <Row
            Icon={Trash2}
            iconBg="var(--red)"
            label={ui?.rowClearHistory ?? "Clear history"}
            sublabel={ui?.subClearHistory ?? "Delete all saved phrases"}
            action={
              <ActionButton
                variant="destructive"
                onClick={() => setConfirm({
                  action: onClearHistory,
                  title: ui?.confirmClearTitle ?? "Clear all history?",
                  msg: ui?.confirmClearMsg ?? "This will permanently delete all your saved phrases.",
                  label: ui?.confirmYes ?? "Delete",
                })}
              >
                {ui?.clear ?? "Clear"}
              </ActionButton>
            }
          />
          <Row
            Icon={RotateCcw}
            iconBg="var(--orange)"
            label={ui?.rowResetAI ?? "Reset AI memory"}
            sublabel={ui?.subResetAI ?? "Wipes n-gram model + RAG vectors"}
            action={
              <ActionButton
                variant="warning"
                onClick={() => setConfirm({
                  action: onResetAI,
                  title: ui?.confirmResetTitle ?? "Reset AI memory?",
                  msg: ui?.confirmResetMsg ?? "This wipes the n-gram model and RAG vectors.",
                  label: ui?.confirmResetYes ?? "Reset",
                  variant: "warning",
                })}
              >
                {ui?.resetAction ?? "Reset"}
              </ActionButton>
            }
            border={false}
          />
        </Section>
        )}

      </div>

      {/* Confirm sheet for destructive actions */}
      {confirm && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.msg}
          confirmLabel={confirm.label}
          cancelLabel={ui?.confirmCancel ?? "Cancel"}
          variant={confirm.variant}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
});
