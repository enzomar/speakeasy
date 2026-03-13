/**
 * settingsUI — Shared primitive UI components for Settings & Profile pages.
 * iOS Settings.app style: grouped sections, Lucide icons, system colors.
 */

import { useState, useCallback } from "react";
import {
  ChevronDown, Check, Send, CheckCircle2, AlertCircle,
} from "lucide-react";

const FORMSPREE_URL = "https://formspree.io/f/xeoqgpnv";

// ── helpers ───────────────────────────────────────────────────────────────────

export const AVATARS = [
  // People
  "🧑","👩","👨","🧒","👧","👦","🧓","👴","👵",
  // Skin-tone variants
  "🧑🏻","🧑🏼","🧑🏽","🧑🏾","🧑🏿",
  "👩🏻","👩🏼","👩🏽","👩🏾","👩🏿",
  "👨🏻","👨🏼","👨🏽","👨🏾","👨🏿",
  // Roles & fantasy
  "🦸","🦸‍♀️","🦹","🧙","🧚","🧜","🧛","🤴","👸","🥷","🧑‍🚀","🧑‍🎤","🧑‍🎨","🧑‍💻","🧑‍🔬",
  // Accessibility
  "🧑‍🦯","🧑‍🦼","🧑‍🦽",
  // Animals
  "🐱","🐶","🦊","🐰","🐻","🐼","🐨","🦁","🐸","🦉","🐙","🦋","🐢","🐬",
  // Nature & objects
  "🌟","🎯","🌈","🔥","💎","🎵","🚀","🌻","🍀","⚡","🎨","🌙",
];

export function store(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}
export function load(key, fallback) {
  try { const raw = localStorage.getItem(key); if (raw !== null) return JSON.parse(raw); }
  catch { /* ignore */ }
  return fallback;
}

// ── Primitive UI pieces ───────────────────────────────────────────────────────

export function Section({ title, children }) {
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

export function Row({ Icon, iconBg, label, sublabel, action, onClick, border = true }) {
  const interactive = !!onClick;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "12px 16px",
        borderBottom: border ? "0.5px solid var(--sep)" : "none",
        minHeight:  48,
        cursor:     interactive ? "pointer" : undefined,
        WebkitTapHighlightColor: interactive ? "rgba(0,0,0,0.05)" : undefined,
      }}
    >
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
      {interactive && !action && (
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
          <path d="M1 1l5 5-5 5" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

export function Toggle({ value, onChange }) {
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

export function NativeSelect({ value, options, onChange, title }) {
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

export function Slider({ value, min, max, step, onChange, format }) {
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

export function ActionButton({ children, onClick, variant = "default" }) {
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

export function ContactForm({ t }) {
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

export function AvatarPicker({ value, onChange }) {
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxHeight: 280, overflowY: "auto" }}>
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
