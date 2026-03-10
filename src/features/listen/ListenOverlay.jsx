/**
 * ListenOverlay — Compact overlay for Listen Mode embedded on the Board page.
 * ============================================================================
 * Renders as layers on top of the board:
 *
 *   IDLE              → nothing visible (header toggle controls on/off)
 *   LISTENING         → floating status pill at top: "Listening for {name}…"
 *   WAKE_CHECKING     → same pill: "Checking…"
 *   WAKE_DETECTED     → pill turns green: "Heard you!"
 *   RECORDING         → bottom sheet with waveform + stop button
 *   TRANSCRIBING      → bottom sheet with spinner
 *   GENERATING        → bottom sheet with transcript + spinner
 *   SUGGESTIONS       → bottom sheet with transcript + reply buttons
 *   SPEAKING          → bottom sheet with highlighted reply
 */

import {
  Square, Volume2, RotateCcw,
  Loader, AlertCircle, PenLine,
} from "lucide-react";
import { LISTEN_STATES } from "./useListenMode";

// ── Waveform bars (recording visual) ──────────────────────────────────────────

function WaveformBars({ energy = 0 }) {
  const bars = 7;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 4, height: 28,
    }}>
      {Array.from({ length: bars }).map((_, i) => {
        const factor = 1 - Math.abs(i - Math.floor(bars / 2)) / (bars / 2);
        const wobble = 0.72 + i * 0.06;
        const h = 6 + energy * 80 * factor * wobble;
        return (
          <div
            key={i}
            style={{
              width: 4, borderRadius: 2,
              height: Math.min(h, 28),
              background: "var(--red)",
              transition: "height 0.1s ease",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Floating status pill (passive listening states) ───────────────────────────

function ListenPill({ state, wakeWord, whisperLoading, whisperProgress, energy, partialText, ui }) {
  const isDetected = state === LISTEN_STATES.WAKE_DETECTED;
  const isChecking = state === LISTEN_STATES.WAKE_CHECKING;

  const label = isDetected ? (ui?.listenDetected ?? "Heard you!")
    : isChecking ? (ui?.listenChecking ?? "Checking…")
    : partialText ? `"${partialText}"`
    : (ui?.listenListening ?? `Listening for "${wakeWord}"…`);

  const bg = isDetected ? "rgba(52,199,89,0.92)"
    : "rgba(0,122,255,0.92)";

  const pulseScale = 1 + Math.min(energy * 4, 0.15);

  return (
    <div style={{
      position: "absolute",
      top: 8, left: "50%",
      transform: `translateX(-50%) scale(${pulseScale})`,
      zIndex: 30,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      transition: "transform 0.15s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px",
        borderRadius: 20,
        background: bg,
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        whiteSpace: "nowrap",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#fff",
          animation: isDetected ? "none" : "pulse 1.5s ease infinite",
          opacity: 0.9,
        }} />
        {label}
      </div>
      {/* Whisper download progress */}
      {whisperLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 12px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
        }}>
          <Loader size={12} strokeWidth={2.5}
            style={{ animation: "spin 1s linear infinite" }} />
          {ui?.listenLoadingModel ?? "Loading model"} {whisperProgress}%
        </div>
      )}
    </div>
  );
}

// ── Bottom sheet (active states) ──────────────────────────────────────────────

function BottomSheet({ children }) {
  return (
    <>
      {/* Scrim */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 40,
        background: "rgba(0,0,0,0.25)",
        animation: "fadeIn 0.2s ease",
      }} />
      {/* Sheet */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: "var(--bg)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "12px 20px 24px",
        maxHeight: "70%",
        overflowY: "auto",
        animation: "slideUp 0.25s ease",
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "var(--sep)", margin: "0 auto 12px",
        }} />
        {children}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ListenOverlay({
  state,
  energy,
  transcript,
  partialText,
  suggestions,
  selectedReply,
  error,
  wakeWord,
  whisperLoading,
  whisperProgress,
  onStopRecording,
  onSelectReply,
  onDismiss,
  onTypeReply,
  onContinue,
  onStopSpeaking,
  ui,
}) {
  if (state === LISTEN_STATES.IDLE && !error) return null;

  const isPassive = [
    LISTEN_STATES.LISTENING,
    LISTEN_STATES.WAKE_CHECKING,
    LISTEN_STATES.WAKE_DETECTED,
  ].includes(state);

  const isProcessing = [
    LISTEN_STATES.TRANSCRIBING,
    LISTEN_STATES.GENERATING,
  ].includes(state);

  if (isPassive) {
    return (
      <ListenPill
        state={state}
        wakeWord={wakeWord}
        whisperLoading={whisperLoading}
        whisperProgress={whisperProgress}
        energy={energy}
        partialText={partialText}
        ui={ui}
      />
    );
  }

  // ── Active states → bottom sheet overlay ──
  return (
    <BottomSheet>
      {/* Error */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          background: "rgba(255,59,48,0.08)", color: "var(--red)",
          fontSize: 13, fontWeight: 500, marginBottom: 12,
        }}>
          <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {state === LISTEN_STATES.IDLE && error && (
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "var(--radius-xl)",
            border: "none",
            background: "var(--tint)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {ui?.listenDismiss ?? "OK"}
        </button>
      )}

      {/* ── Recording state ── */}
      {state === LISTEN_STATES.RECORDING && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 12, padding: "8px 0",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: "var(--red)",
              animation: "pulse 1s ease infinite",
            }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {ui?.listenRecording ?? "Recording… speak now"}
            </span>
          </div>
          <WaveformBars energy={energy} />
          <button
            onClick={onStopRecording}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "var(--radius-xl)",
              border: "none",
              background: "var(--red)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 4,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Square size={14} strokeWidth={2.5} fill="currentColor" />
            {ui?.listenDone ?? "Done Recording"}
          </button>
        </div>
      )}

      {/* ── Processing states (transcribing / generating) ── */}
      {isProcessing && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 12, padding: "16px 0",
        }}>
          <Loader size={24} strokeWidth={2.2}
            style={{ color: "var(--tint)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            {state === LISTEN_STATES.TRANSCRIBING
              ? (ui?.listenTranscribing ?? "Transcribing speech…")
              : (ui?.listenGenerating ?? "Generating replies…")
            }
          </span>
          {/* Show transcript if available during generation */}
          {transcript && state === LISTEN_STATES.GENERATING && (
            <div style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              marginTop: 4,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
              }}>
                {ui?.listenHeard ?? "They said"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>
                "{transcript}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Suggestions ── */}
      {state === LISTEN_STATES.SUGGESTIONS && suggestions?.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Transcript card */}
          {transcript && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--text-3)",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
              }}>
                {ui?.listenHeard ?? "They said"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>
                "{transcript}"
              </div>
            </div>
          )}

          <div style={{
            fontSize: 11, fontWeight: 600, color: "var(--text-3)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            textAlign: "center", marginTop: 2,
          }}>
            {ui?.listenTapReply ?? "Tap to reply"}
          </div>

          {suggestions.map((reply, i) => (
            <button
              key={i}
              onClick={() => onSelectReply?.(reply)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: selectedReply === reply ? "var(--tint)" : "var(--surface)",
                color: selectedReply === reply ? "#fff" : "var(--text)",
                fontSize: 16,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 10,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Volume2
                size={18} strokeWidth={2}
                style={{ flexShrink: 0, color: selectedReply === reply ? "#fff" : "var(--tint)" }}
              />
              {reply}
            </button>
          ))}

          {/* Type Reply / Continue / Dismiss */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onTypeReply}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--tint)", color: "#fff",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              <PenLine size={14} strokeWidth={2} />
              {ui?.listenTypeReply ?? "Type reply"}
            </button>
            <button
              onClick={onContinue}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--tint-soft)", color: "var(--tint)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              <RotateCcw size={14} strokeWidth={2} />
              {ui?.listenAgain ?? "Listen Again"}
            </button>
            <button
              onClick={onDismiss}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--elevated)", color: "var(--text-2)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              {ui?.listenDismiss ?? "Done"}
            </button>
          </div>
        </div>
      )}

      {/* ── Speaking ── */}
      {state === LISTEN_STATES.SPEAKING && selectedReply && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 12, padding: "12px 0",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderRadius: "var(--radius-xl)",
            background: "var(--tint)", color: "#fff",
            fontSize: 15, fontWeight: 600,
          }}>
            <Volume2 size={18} strokeWidth={2.2}
              style={{ animation: "pulse 0.8s ease infinite" }} />
            {selectedReply}
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
            <button
              onClick={onStopSpeaking}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--red)", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              <Square size={14} strokeWidth={2.4} fill="currentColor" />
              {ui?.stopSpeaking ?? "Stop speaking"}
            </button>
            <button
              onClick={onContinue}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--tint-soft)", color: "var(--tint)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              <RotateCcw size={14} strokeWidth={2} />
              {ui?.listenAgain ?? "Listen Again"}
            </button>
            <button
              onClick={onDismiss}
              style={{
                flex: 1, padding: "12px 14px",
                borderRadius: "var(--radius-xl)",
                border: "none",
                background: "var(--elevated)", color: "var(--text-2)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, WebkitTapHighlightColor: "transparent",
              }}
            >
              {ui?.listenDismiss ?? "Done"}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
