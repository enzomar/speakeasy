/**
 * ProfilePanel — Settings / Profile page.
 * iOS Settings.app style: grouped sections, Lucide icons, system colors.
 */

import { memo, useState, useCallback } from "react";
import {
  Languages, Volume2, Gauge, Music, Mic, Play,
  Brain, Zap, Download, Trash2, RotateCcw, MessageSquare,
  ChevronDown, Check, Hand, Ear, Search, Globe, Headphones,
  Send, CheckCircle2, AlertCircle, Sun, Moon,
} from "lucide-react";
import { LANGUAGES, ACTIVATION_KEYWORDS } from "../data/languages";
import { HELP } from "./HelpModal";
import ConfirmSheet from "./ConfirmSheet";

const FORMSPREE_URL = "https://formspree.io/f/xeoqgpnv";

// ── helpers ───────────────────────────────────────────────────────────────────

const AVATARS = ["🧑","👩","👨","🧒","👧","👦","🧓","👴","👵","🦸","🧙","🐱","🐶","🦊","🌟","🎯"];

function store(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); if (raw !== null) return JSON.parse(raw); }
  catch { /* ignore */ }
  return fallback;
}

// ── Primitive UI pieces ───────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: "var(--text-3)",
        letterSpacing: "0.02em", textTransform: "uppercase",
        paddingLeft: 16, marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        background:   "var(--surface)",
        borderRadius: "var(--radius-md)",
        overflow:     "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ Icon, iconBg, label, sublabel, action, border = true }) {
  return (
    <div style={{
      display:    "flex",
      alignItems: "center",
      gap:        12,
      padding:    "12px 16px",
      borderBottom: border ? "0.5px solid var(--sep)" : "none",
      minHeight:  48,
    }}>
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: iconBg || "var(--tint-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          color: iconBg ? "#fff" : "var(--tint)",
        }}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400, marginTop: 1 }}>
            {sublabel}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 51, height: 31, borderRadius: 16, flexShrink: 0,
        background: value ? "var(--green)" : "rgba(120,120,128,0.16)",
        position: "relative", transition: "background 0.2s ease",
        border: "none", cursor: "pointer",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: value ? 22 : 2,
        width: 27, height: 27, borderRadius: 14,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.06)",
        transition: "left 0.2s ease", display: "block",
      }} />
    </button>
  );
}

function NativeSelect({ value, options, onChange, title }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "6px 10px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "var(--bg)",
          fontSize: 14, fontWeight: 500, color: "var(--tint)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          maxWidth: 180,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current?.label ?? value}
        </span>
        <ChevronDown size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.38)",
            zIndex: 400,
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--surface)",
              borderRadius: "16px 16px 0 0",
              maxHeight: "65vh",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              paddingBottom: "max(0px, env(safe-area-inset-bottom))",
            }}
          >
            {/* header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px 12px",
              borderBottom: "0.5px solid var(--sep)",
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 600, fontSize: 17, color: "var(--text)" }}>
                {title ?? "Select"}
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none", background: "none",
                  fontSize: 15, fontWeight: 600,
                  color: "var(--tint)", cursor: "pointer",
                  padding: "4px 0",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Done
              </button>
            </div>

            {/* options list */}
            <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
              {options.map((o, i) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    style={{
                      width: "100%", textAlign: "left",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px",
                      border: "none",
                      borderBottom: i < options.length - 1 ? "0.5px solid var(--sep)" : "none",
                      background: selected ? "var(--tint-soft)" : "transparent",
                      fontSize: 16,
                      color: selected ? "var(--tint)" : "var(--text)",
                      fontWeight: selected ? 600 : 400,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                      gap: 12,
                    }}
                  >
                    <span style={{ flex: 1 }}>{o.label}</span>
                    {selected && <Check size={18} strokeWidth={2.5} style={{ flexShrink: 0, color: "var(--tint)" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Slider({ value, min, max, step, onChange, format }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--tint)", cursor: "pointer" }}
      />
      <span style={{
        fontSize: 13, fontWeight: 600, color: "var(--tint)",
        minWidth: 38, textAlign: "right",
      }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function ActionButton({ children, onClick, variant = "default" }) {
  const isDestructive = variant === "destructive";
  const isWarning     = variant === "warning";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px", borderRadius: "var(--radius-sm)",
        border: "none",
        background: isDestructive ? "rgba(255,59,48,0.08)"
                  : isWarning    ? "rgba(255,149,0,0.08)"
                  : "var(--tint-soft)",
        color: isDestructive ? "var(--red)"
             : isWarning    ? "var(--orange)"
             : "var(--tint)",
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ── Contact form (Formspree) ────────────────────────────────────────────────

function ContactForm({ t }) {
  const [cname,   setCname]   = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState("idle");

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!cname.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: cname, email, message }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }, [cname, email, message]);

  if (status === "success") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        padding: "24px 0", textAlign: "center",
      }}>
        <CheckCircle2 size={36} style={{ color: "var(--green)" }} strokeWidth={1.5} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>
          {t.contactSuccess}
        </p>
      </div>
    );
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: "var(--radius-md)",
    border: "0.5px solid var(--sep)",
    background: "var(--bg)",
    fontSize: 15, color: "var(--text)",
    outline: "none", fontFamily: "inherit",
  };
  const disabled = status === "sending" || !cname.trim() || !email.trim() || !message.trim();

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="text"  placeholder={t.contactName}    value={cname}   onChange={e => setCname(e.target.value)}   required style={inputStyle} />
      <input type="email" placeholder={t.contactEmail}   value={email}   onChange={e => setEmail(e.target.value)}   required style={inputStyle} />
      <textarea           placeholder={t.contactMessage} value={message} onChange={e => setMessage(e.target.value)} required rows={4}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
      />
      {status === "error" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          background: "rgba(255,59,48,0.08)", color: "var(--red, #FF3B30)",
          fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={15} strokeWidth={2} />
          {t.contactError}
        </div>
      )}
      <button
        type="submit" disabled={disabled}
        style={{
          padding: "13px", borderRadius: "var(--radius-lg)", border: "none",
          background: disabled ? "var(--sep)" : "var(--tint)",
          color: disabled ? "var(--text-4)" : "#fff",
          fontSize: 15, fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s",
        }}
      >
        <Send size={15} strokeWidth={2} />
        {status === "sending" ? t.contactSending : t.contactSend}
      </button>
    </form>
  );
}

// ── AvatarPicker ──────────────────────────────────────────────────────────────

function AvatarPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 60, height: 60, borderRadius: 18,
          background: "var(--bg)",
          border: "none",
          fontSize: 32, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Change avatar"
      >
        {value}
      </button>
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            zIndex: 200, display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: "100%", background: "var(--surface)",
              borderRadius: "14px 14px 0 0",
              padding: "20px 16px",
              paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontWeight: 600, fontSize: 17, color: "var(--text)",
              marginBottom: 16,
            }}>
              Choose Avatar
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => { onChange(a); setOpen(false); }}
                  style={{
                    width: 52, height: 52, fontSize: 28,
                    borderRadius: "var(--radius-md)",
                    border: value === a ? "2px solid var(--tint)" : "none",
                    background: value === a ? "var(--tint-soft)" : "var(--bg)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default memo(function ProfilePanel({
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
  onNameChange,
  theme, setTheme,
  ui,
}) {
  const [avatar, setAvatar] = useState(() => load("speakeasy_avatar_v1", "🧑"));
  const [name,   setName]   = useState(() => load("speakeasy_name_v1",   ""));
  const [confirm, setConfirm] = useState(null); // { action, title, msg, label }
  const [searchQuery, setSearchQuery] = useState("");

  const handleAvatar = useCallback((a) => {
    setAvatar(a); store("speakeasy_avatar_v1", a);
  }, []);
  const handleName = useCallback((e) => {
    const v = e.target.value; setName(v); store("speakeasy_name_v1", v);
    onNameChange?.(v);
  }, [onNameChange]);

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

        {/* ── Identity ── */}
        {show("identity", "name", "avatar", ui?.sectionIdentity ?? "identity") && (
        <Section title={ui?.sectionIdentity ?? "Identity"}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px",
          }}>
            <AvatarPicker value={avatar} onChange={handleAvatar} />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={name}
                onChange={handleName}
                placeholder={ui?.namePlaceholder ?? "Your name (optional)"}
                maxLength={32}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  fontSize: 16, fontWeight: 500,
                  color: "var(--text)",
                  background: "var(--bg)",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontWeight: 400 }}>
                {ui?.nameHint ?? "Shown only on this device"}
              </div>
            </div>
          </div>
        </Section>
        )}

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
            action={<NativeSelect value={ttsLangCode} options={langOptions} onChange={setTtsLang} />}
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
            action={<NativeSelect value={voiceName} options={voiceOptions} onChange={setVoiceName} />}
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

        {/* ── Data ── */}
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

        {/* ── Contact ── */}
        {show("contact", "author", "message", "email", ui?.sectionContact ?? "contact") && (
        <Section title={ui?.sectionContact ?? "Contact the Author"}>
          <div style={{ padding: "16px" }}>
            <ContactForm t={HELP[uiLangCode] ?? HELP.en} />
          </div>
        </Section>
        )}

        {/* ── About ── */}
        {show("about", "version", "speakeasy") && (
        <Section title={ui?.sectionAbout ?? "About"}>
          <Row
            Icon={MessageSquare}
            iconBg="linear-gradient(135deg, var(--tint), #5856D6)"
            label="SpeakEasy"
            sublabel="AAC · On-device AI · v1.0"
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
