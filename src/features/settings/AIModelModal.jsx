/**
 * AIModelModal — bottom-sheet showing on-device LLM status.
 * Shows both models (fast + quality), download status, size, pause/resume,
 * WiFi-only preference, and delete cached weights.
 */

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { X, Cpu, Download, Trash2, Pause, Play, Wifi, Zap, Brain, AlertCircle, SlidersHorizontal, Ban, Cloud, KeyRound, ExternalLink } from "lucide-react";
import { MODEL_INFO, isModelCached, deleteModelCache } from "../prediction/useAIPrediction";
import { GENERATION_CONFIG } from "../../prompts/intentPrompt";

// ── status helpers ─────────────────────────────────────────────────────────────

function statusLabel(key, ui) {
  const labels = {
    idle:          ui?.aiStatusNotLoaded ?? "Not loaded",
    loading:       ui?.aiStatusDownloading ?? "Downloading…",
    ready:         ui?.aiStatusReady ?? "Ready",
    error:         ui?.aiStatusError ?? "Error",
    unsupported:   ui?.aiStatusNoWebGPU ?? "WebGPU not available",
    paused:        ui?.aiStatusPaused ?? "Paused",
    wifi_blocked:  ui?.aiStatusWifiBlocked ?? "Waiting for Wi-Fi",
    needs_key:     ui?.aiStatusNeedsKey ?? "API key required",
  };
  return labels[key] ?? key;
}

const STATUS_COLOR = {
  idle:         "var(--text-4)",
  loading:      "var(--orange, #F76707)",
  ready:        "var(--green, #2F9E44)",
  error:        "var(--red, #E03131)",
  unsupported:  "var(--text-4)",
  paused:       "var(--orange, #F76707)",
  wifi_blocked: "var(--tint)",
  needs_key:    "var(--orange, #F76707)",
};

// ── sub-components ─────────────────────────────────────────────────────────────

function ProgressBar({ value }) {
  return (
    <div style={{
      height: 6, borderRadius: 3,
      background: "var(--sep)",
      overflow: "hidden",
      margin: "8px 0 4px",
    }}>
      <div style={{
        height: "100%",
        width:  `${Math.max(3, value)}%`,
        background: "linear-gradient(90deg, var(--tint), #5856D6)",
        borderRadius: 3,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

function Badge({ label, color = "var(--tint-soft)", textColor = "var(--tint)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 10,
      background: color, color: textColor,
      fontSize: 11, fontWeight: 700,
      letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

// ── GeminiCard — cloud API option ────────────────────────────────────────────

function GeminiCard({ info, isActive, llmStatus, geminiApiKey, setGeminiApiKey, onSelect, ui }) {
  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft]     = useState(geminiApiKey ?? "");

  // Sync draft if key changes externally
  useEffect(() => { setDraft(geminiApiKey ?? ""); }, [geminiApiKey]);

  const hasKey   = (geminiApiKey ?? "").trim().length > 0;
  const statusLbl = isActive
    ? (statusLabel(llmStatus, ui))
    : (hasKey ? (ui?.aiCustomKey ?? "Custom key") : (ui?.aiBuiltInKey ?? "Built-in key"));
  const statusColor = isActive
    ? (STATUS_COLOR[llmStatus] ?? "var(--text-4)")
    : "var(--green, #2F9E44)"; // always green — built-in or custom key always present

  function saveKey() {
    setGeminiApiKey(draft.trim());
  }

  const maskedKey = hasKey
    ? `${geminiApiKey.slice(0, 6)}…${geminiApiKey.slice(-4)}`
    : "";

  return (
    <div style={{
      background:   "var(--bg)",
      borderRadius: "var(--radius-md)",
      padding:      "14px 16px",
      border:       isActive ? "1.5px solid var(--tint)" : "0.5px solid var(--sep)",
      position:     "relative",
    }}>
      {/* Active badge */}
      {isActive && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge label={ui?.aiActive ?? "Active"} />
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: isActive ? "var(--tint)" : "var(--sep)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: isActive ? "#fff" : "var(--text-3)",
        }}>
          <Cloud size={16} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            {info.label}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {info.description}
          </div>
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{ui?.aiCloud ?? "Cloud"}</span>
        <span style={{ color: "var(--sep)" }}>·</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>{statusLbl}</span>
      </div>

      {/* API key field (shown when active or editing) */}
      {(isActive || showKey) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "var(--text-2)",
            marginBottom: 6, display: "flex", alignItems: "center", gap: 5,
          }}>
            <KeyRound size={12} strokeWidth={2.5} style={{ color: "var(--tint)" }} />
            {ui?.aiGeminiApiKey ?? "Gemini API Key"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="password"
              value={draft}
              placeholder="AIza…"
              onChange={e => setDraft(e.target.value)}
              onBlur={saveKey}
              aria-label={ui?.aiGeminiApiKey ?? "Gemini API key"}
              style={{
                flex: 1, padding: "9px 11px",
                borderRadius: 8, border: "1px solid var(--sep)",
                background: "var(--elevated)", color: "var(--text)",
                fontSize: 13, fontFamily: "monospace",
                outline: "none", minWidth: 0,
              }}
            />
            <button
              onClick={saveKey}
              style={{
                padding: "9px 14px", borderRadius: 8, border: "none",
                background: "var(--tint)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {ui?.aiSave ?? "Save"}
            </button>
          </div>
          {hasKey && (
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
              {ui?.aiSavedLabel ?? "Saved:"} <code style={{ fontFamily: "monospace" }}>{maskedKey}</code>
              {" · "}
              <button
                onClick={() => { setDraft(""); setGeminiApiKey(""); }}
                style={{
                  background: "none", border: "none",
                  color: "var(--red)", fontSize: 11,
                  cursor: "pointer", padding: 0, fontWeight: 600,
                }}
              >
                {ui?.aiRemove ?? "Remove"}
              </button>
            </div>
          )}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              marginTop: 8, fontSize: 11, color: "var(--tint)",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            <ExternalLink size={11} strokeWidth={2.5} />
            {ui?.aiGetApiKey ?? "Get a free API key from Google AI Studio"}
          </a>
          {!hasKey && (
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
              {ui?.aiBuiltInHint ?? "A built-in key is already active. Enter your own key above to override it."}
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      {isActive && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 6,
          padding: "8px 10px", borderRadius: 8,
          background: "rgba(255,149,0,0.08)", marginBottom: 10,
        }}>
          <AlertCircle size={13} style={{ color: "var(--orange, #F76707)", marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
            {ui?.aiPrivacyNote ?? "Transcripts are sent to Google's servers for reply generation. Your key is stored locally and never shared."}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!isActive && (
          <ActionBtn
            label={ui?.aiUseGemini ?? "Use Gemini Flash"}
            icon={<Zap size={13} strokeWidth={2.2} />}
            primary
            onClick={onSelect}
          />
        )}
        {!isActive && !showKey && (
          <ActionBtn
            label={hasKey ? (ui?.aiEditKey ?? "Edit key") : (ui?.aiAddKey ?? "Add API key")}
            icon={<KeyRound size={13} strokeWidth={2.2} />}
            onClick={() => setShowKey(s => !s)}
          />
        )}
      </div>
    </div>
  );
}

// ── ModelCard ──────────────────────────────────────────────────────────────────

function ModelCard({
  info,           // MODEL_INFO entry
  isActive,       // this is the currently selected model
  llmStatus,      // only valid when isActive
  loadProgress,
  isPaused,
  wifiOnly,
  webGpuSupported,
  onDownload,     // () => void
  onPause,
  onResume,
  onDelete,
  onSelect,       // switch to this model
  ui,
}) {
  const isNone = info.key === "none";
  const [cached, setCached] = useState(isNone ? false : null); // null=checking, true/false

  // Check cache status on mount and after deletions
  const recheckCache = useCallback(async () => {
    if (isNone) return;
    setCached(null);
    const result = await isModelCached(info.id);
    setCached(result);
  }, [info.id, isNone]);

  useEffect(() => { recheckCache(); }, [recheckCache]);

  // Recheck when active model becomes ready or is deleted
  useEffect(() => {
    if (isNone) return;
    if (isActive && (llmStatus === "ready" || llmStatus === "idle")) recheckCache();
  }, [isActive, llmStatus, recheckCache, isNone]);

  const effectiveStatus = isNone ? "idle" : isActive ? llmStatus : (cached ? "idle" : "idle");
  const statusLbl       = isNone ? (isActive ? (ui?.aiActive ?? "Active") : "") : isActive ? statusLabel(llmStatus, ui) : (cached ? (ui?.aiCached ?? "Cached") : (ui?.aiNotDownloaded ?? "Not downloaded"));
  const statusColor     = isNone ? "var(--green)" : isActive ? (STATUS_COLOR[llmStatus] ?? "var(--text-4)") : (cached ? "var(--green)" : "var(--text-4)");

  const isLoading = !isNone && isActive && llmStatus === "loading";
  const isReady   = !isNone && isActive && llmStatus === "ready";
  const isPausedNow = !isNone && isActive && (llmStatus === "paused" || isPaused);
  const isBlocked = !isNone && isActive && llmStatus === "wifi_blocked";
  const canDelete = !isNone && ((isActive && llmStatus === "ready") || (cached === true));

  async function handleDelete() {
    if (!window.confirm(typeof ui?.aiConfirmDelete === "function" ? ui.aiConfirmDelete(info.label) : `Delete cached weights for ${info.label}? You'll need to re-download to use AI.`)) return;
    if (isActive) {
      await onDelete(info.id);
    } else {
      await deleteModelCache(info.id);
    }
    recheckCache();
  }

  return (
    <div style={{
      background:   "var(--bg)",
      borderRadius: "var(--radius-md)",
      padding:      "14px 16px",
      border:       isActive ? "1.5px solid var(--tint)" : "0.5px solid var(--sep)",
      position:     "relative",
    }}>
      {/* Active badge */}
      {isActive && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge label={ui?.aiActive ?? "Active"} />
        </div>
      )}

      {/* Model name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: isNone ? "var(--sep)" : isActive ? "var(--tint)" : "var(--sep)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: isNone ? "var(--text-3)" : isActive ? "#fff" : "var(--text-3)",
        }}>
          {isNone ? <Ban size={16} strokeWidth={1.8} /> : isActive ? <Brain size={16} strokeWidth={1.8} /> : <Cpu size={16} strokeWidth={1.8} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            {info.label}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {info.description}
          </div>
        </div>
      </div>

      {/* Size + status row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
          {info.size}
        </span>
        <span style={{ color: "var(--sep)" }}>·</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>
          {statusLbl}
        </span>
      </div>

      {/* Progress bar (loading or paused) */}
      {isActive && (isLoading || isPausedNow) && (
        <div>
          <ProgressBar value={loadProgress} />
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>
            {typeof ui?.aiDownloaded === "function" ? ui.aiDownloaded(loadProgress) : `${loadProgress}% downloaded`}
          </div>
        </div>
      )}

      {/* WiFi blocked hint */}
      {isBlocked && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px", borderRadius: 8,
          background: "var(--tint-soft)", marginBottom: 10,
        }}>
          <Wifi size={14} strokeWidth={2} style={{ color: "var(--tint)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--tint)", fontWeight: 500 }}>
            {ui?.aiWifiHint ?? "Wi-Fi only mode is on. Connect to Wi-Fi or tap Download anyway."}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

        {/* Switch to this model */}
        {!isActive && (
          <ActionBtn
            label={ui?.aiUseModel ?? "Use this model"}
            icon={<Zap size={13} strokeWidth={2.2} />}
            primary
            onClick={onSelect}
          />
        )}

        {/* Download / Resume */}
        {isActive && (llmStatus === "idle" || isPausedNow || isBlocked) && (
          <ActionBtn
            label={isPausedNow || llmStatus === "paused" ? (ui?.aiResume ?? "Resume") : isBlocked ? (ui?.aiDownloadAnyway ?? "Download anyway") : (ui?.aiDownload ?? "Download")}
            icon={<Download size={13} strokeWidth={2.2} />}
            primary={!isReady}
            onClick={isPausedNow ? onResume : onDownload}
            disabled={!webGpuSupported}
          />
        )}

        {/* Pause */}
        {isLoading && (
          <ActionBtn
            label={ui?.aiPause ?? "Pause"}
            icon={<Pause size={13} strokeWidth={2.2} />}
            onClick={onPause}
          />
        )}

        {/* Delete */}
        {canDelete && (
          <ActionBtn
            label={ui?.aiDelete ?? "Delete"}
            icon={<Trash2 size={13} strokeWidth={2.2} />}
            danger
            onClick={handleDelete}
          />
        )}
      </div>

      {/* No WebGPU hint */}
      {isActive && llmStatus === "unsupported" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 8 }}>
          <AlertCircle size={13} style={{ color: "var(--text-4)", marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text-4)", lineHeight: 1.4 }}>
            {ui?.aiNoWebGPUHint ?? "This browser/device does not support WebGPU. The n-gram engine is used as fallback."}
          </span>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, icon, primary, danger, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "8px 14px",
        borderRadius: 10, border: "none",
        background: disabled ? "var(--sep)" :
                    danger   ? "rgba(224,49,49,0.10)" :
                    primary  ? "var(--tint)" : "var(--elevated)",
        color: disabled ? "var(--text-4)" :
               danger   ? "#E03131" :
               primary  ? "#fff" : "var(--text-2)",
        fontSize: 13, fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── PenaltyInput – small labelled number field ────────────────────────────────

function PenaltyInput({ label, hint, storageKey, defaultValue }) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null && stored !== "" ? stored : String(defaultValue);
    } catch { return String(defaultValue); }
  });

  function commit(v) {
    const num = parseFloat(v);
    if (Number.isNaN(num)) return;
    setValue(String(num));
    try { localStorage.setItem(storageKey, String(num)); } catch {}
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{hint}</div>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        max="3"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={e => commit(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "8px 10px", borderRadius: 8,
          border: "1px solid var(--sep)",
          background: "var(--elevated)",
          color: "var(--text)", fontSize: 15, fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          outline: "none",
          WebkitAppearance: "none", MozAppearance: "textfield",
        }}
      />
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default memo(function AIModelModal({
  open,
  onClose,
  activeModelKey,
  llmStatus,
  loadProgress,
  isPaused,
  wifiOnly,
  setWifiOnly,
  webGpuSupported,
  onDownload,
  onPause,
  onResume,
  onDelete,
  onSwitchModel,
  geminiApiKey,
  setGeminiApiKey,
  ui,
}) {
  const sheetRef = useRef(null);

  /* Escape to dismiss + focus trap */
  useEffect(() => {
    if (!open) return;
    const el = sheetRef.current;
    if (el) el.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && el) {
        const focusable = el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (focusable.length === 0) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const models = Object.values(MODEL_INFO).filter(m => !m.cloud); // local models only

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.40)",
        zIndex: 500,
        display: "flex", alignItems: "flex-end",
      }}
    >
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ui?.aiSettingsLabel ?? "AI Model Settings"}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          background:   "var(--surface)",
          borderRadius: "20px 20px 0 0",
          maxHeight:    "92vh",
          display:      "flex",
          flexDirection: "column",
          overflow:     "hidden",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          animation:    "slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "16px 16px 12px",
          borderBottom:   "0.5px solid var(--sep)",
          flexShrink:     0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--tint), #5856D6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
            }}>
              <Cpu size={16} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                {ui?.aiModalTitle ?? "On-device AI"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                {ui?.aiModalSubtitle ?? "Runs entirely on your device — no cloud"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={ui?.listenClose ?? "Close"}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--elevated)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-3)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex:     1,
          overflowY: "auto",
          padding:  "16px",
          display:  "flex",
          flexDirection: "column",
          gap:      12,
          WebkitOverflowScrolling: "touch",
        }}>
          {/* Gemini cloud model card */}
          <GeminiCard
            info={MODEL_INFO.gemini}
            isActive={activeModelKey === "gemini"}
            llmStatus={llmStatus}
            geminiApiKey={geminiApiKey}
            setGeminiApiKey={setGeminiApiKey}
            onSelect={() => onSwitchModel("gemini")}
            ui={ui}
          />

          {/* Local model cards */}
          {models.map(info => (
            <ModelCard
              key={info.key}
              info={info}
              isActive={info.key === activeModelKey}
              llmStatus={llmStatus}
              loadProgress={loadProgress}
              isPaused={isPaused}
              wifiOnly={wifiOnly}
              webGpuSupported={webGpuSupported}
              onDownload={() => { onDownload(); }}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              onSelect={() => { onSwitchModel(info.key); }}
              ui={ui}
            />
          ))}

          {/* WiFi-only section */}
          <div style={{
            background:   "var(--bg)",
            borderRadius: "var(--radius-md)",
            border:       "0.5px solid var(--sep)",
            overflow:     "hidden",
          }}>
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        12,
              padding:    "12px 16px",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--tint-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: "var(--tint)",
              }}>
                <Wifi size={16} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                  {ui?.aiWifiOnly ?? "Download on Wi-Fi only"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
                  {ui?.aiWifiDesc ?? "Prevents large downloads on cellular data"}
                </div>
              </div>
              {/* Toggle */}
              <button
                role="switch"
                aria-checked={wifiOnly}
                onClick={() => setWifiOnly(!wifiOnly)}
                style={{
                  width: 51, height: 31, borderRadius: 16, flexShrink: 0,
                  background: wifiOnly ? "var(--tint)" : "rgba(120,120,128,0.16)",
                  position: "relative", transition: "background 0.2s ease",
                  border: "none", cursor: "pointer",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: wifiOnly ? 22 : 2,
                  width: 27, height: 27, borderRadius: 14,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  transition: "left 0.2s ease", display: "block",
                }} />
              </button>
            </div>
          </div>

          {/* ── Generation penalties ───────────────────────────────────── */}
          <div style={{
            background:   "var(--bg)",
            borderRadius: "var(--radius-md)",
            border:       "0.5px solid var(--sep)",
            padding:      "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--tint-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: "var(--tint)",
              }}>
                <SlidersHorizontal size={16} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                  {ui?.aiPenalties ?? "Generation penalties"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                  {ui?.aiPenaltiesDesc ?? "Higher values reduce repetitive output"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <PenaltyInput
                label={ui?.aiPresence ?? "Presence"}
                hint={ui?.aiPresenceHint ?? "0 – 3 · curbs overthinking"}
                storageKey="speakeasy_presence_penalty"
                defaultValue={GENERATION_CONFIG.presence_penalty}
              />
              <PenaltyInput
                label={ui?.aiRepetition ?? "Repetition"}
                hint={ui?.aiRepetitionHint ?? "0.5 – 2 · HF-style repeat"}
                storageKey="speakeasy_repetition_penalty"
                defaultValue={GENERATION_CONFIG.repetition_penalty}
              />
            </div>
          </div>

          {/* Footnote */}
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-4)", textAlign: "center", lineHeight: 1.5 }}>
            {ui?.aiFootnote ?? "Models are stored in your browser's cache. Clearing browser data will remove them."}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});
