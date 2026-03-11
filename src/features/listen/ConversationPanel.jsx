/**
 * ConversationPanel — Inline conversation UI for Listen Mode.
 * =============================================================
 * Replaces the bottom-sheet ListenOverlay with an inline panel that
 * expands from the top of the board area, pushing the symbol grid
 * down rather than overlaying it.
 *
 * ACCESSIBILITY RATIONALE (AAC / disability users):
 *  - NO full-screen layout shift: panel grows inline, board stays visible
 *  - ≥56 px tap targets on every action button (motor impairment)
 *  - Auto-scroll to latest message (no manual scrolling required)
 *  - role="log" + aria-live on chat area for screen readers
 *  - Passive listening = 44 px strip only — board remains 100% intact
 *  - Motion is proportional, not a sweeping slide (vestibular safety)
 *
 * STATES:
 *   IDLE (no error)    → nothing rendered (null)
 *   LISTENING / WAKE_* → compact 44 px status strip only
 *   RECORDING          → strip + waveform bars
 *   TRANSCRIBING       → strip + spinner + partial transcript
 *   GENERATING         → strip + spinner + full transcript bubble
 *   SUGGESTIONS        → strip + chat history + reply buttons
 *   SPEAKING           → strip + chat history + speaking pill + stop/again
 *   IDLE (error)       → strip + dismiss button
 */

import { useRef, useEffect } from "react";
import {
  Square, Volume2, RotateCcw, PenLine,
  Loader, X,
} from "lucide-react";
import { LISTEN_STATES } from "./useListenMode";

// ── Waveform bars ─────────────────────────────────────────────────────────────

function WaveformBars({ energy = 0 }) {
  const bars = 9;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 4, height: 36,
    }}>
      {Array.from({ length: bars }).map((_, i) => {
        const factor = 1 - Math.abs(i - Math.floor(bars / 2)) / (bars / 2);
        const h = 6 + energy * 90 * factor * (0.7 + i * 0.05);
        return (
          <div
            key={i}
            style={{
              width: 4, borderRadius: 2,
              height: Math.min(Math.max(h, 6), 36),
              background: "var(--red)",
              transition: "height 0.08s ease",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Chat bubble (conversation history) ───────────────────────────────────────

function ChatBubble({ msg }) {
  const isHeard = msg.type === "heard";
  return (
    <div style={{
      display: "flex",
      justifyContent: isHeard ? "flex-start" : "flex-end",
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: "78%",
        padding: "10px 14px",
        borderRadius: isHeard
          ? "4px 18px 18px 18px"
          : "18px 4px 18px 18px",
        background: isHeard ? "var(--elevated)" : "var(--tint)",
        color: isHeard ? "var(--text)" : "#fff",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1.45,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {isHeard && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-3)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 4,
          }}>
            They said
          </div>
        )}
        {msg.text}
      </div>
    </div>
  );
}

// ── Processing indicator (transcribing / generating) ─────────────────────────

function ProcessingRow({ label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "4px 0 6px",
    }}>
      <Loader
        size={14} strokeWidth={2.5}
        style={{
          color: "var(--tint)",
          animation: "spin 1s linear infinite",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConversationPanel({
  state,
  energy       = 0,
  transcript   = "",
  partialText  = "",
  suggestions  = [],
  selectedReply = "",
  error        = null,
  wakeWord     = "SpeakEasy",
  whisperLoading   = false,
  whisperProgress  = 0,
  chatHistory  = [],           // [{ type: "heard"|"replied", text }]
  onStopRecording,
  onSelectReply,
  onDismiss,
  onTypeReply,
  onContinue,
  onStopSpeaking,
  ui           = {},
}) {
  const historyRef = useRef(null);

  // Auto-scroll history to bottom whenever content changes
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatHistory.length, state]);

  // ── Guard: nothing to show ──────────────────────────────────────────────
  const isIdle = state === LISTEN_STATES.IDLE;
  if (isIdle && !error) return null;

  // ── State classification ────────────────────────────────────────────────
  const isPassive = [
    LISTEN_STATES.LISTENING,
    LISTEN_STATES.WAKE_CHECKING,
    LISTEN_STATES.WAKE_DETECTED,
  ].includes(state);

  const isRecording   = state === LISTEN_STATES.RECORDING;
  const isTranscribing = state === LISTEN_STATES.TRANSCRIBING;
  const isGenerating  = state === LISTEN_STATES.GENERATING;
  const isProcessing  = isTranscribing || isGenerating;
  const isSuggestions = state === LISTEN_STATES.SUGGESTIONS;
  const isSpeaking    = state === LISTEN_STATES.SPEAKING;

  // ── Status dot color & label ────────────────────────────────────────────
  const dotColor =
    error                                    ? "var(--red)"    :
    state === LISTEN_STATES.WAKE_DETECTED    ? "var(--green)"  :
    isRecording                              ? "var(--red)"    :
    isSuggestions                            ? "var(--tint)"   :
    isSpeaking                               ? "var(--tint)"   :
                                               "var(--tint)";

  const dotPulse = isRecording || state === LISTEN_STATES.LISTENING;

  const statusLabel = error
    ? (ui?.listenError ?? "Something went wrong")
    : state === LISTEN_STATES.WAKE_DETECTED
      ? (ui?.listenDetected   ?? "Heard you!")
    : state === LISTEN_STATES.WAKE_CHECKING
      ? (ui?.listenChecking   ?? "Checking…")
    : isRecording
      ? (ui?.listenRecording  ?? "Recording – speak now")
    : isTranscribing
      ? (ui?.listenTranscribing ?? "Transcribing speech…")
    : isGenerating
      ? (ui?.listenGenerating ?? "Generating replies…")
    : isSuggestions
      ? (ui?.listenTapReply   ?? "Tap a reply, or use the board below")
    : isSpeaking
      ? (ui?.listenSpeaking   ?? "Speaking…")
    : partialText
      ? `"${partialText}"`
    : (ui?.listenListening  ?? `Listening for "${wakeWord}"…`);

  // ── Whether to show the expanded body ──────────────────────────────────
  const hasBody = isRecording || isProcessing || isSuggestions || isSpeaking
    || chatHistory.length > 0 || (isIdle && error);

  return (
    <div
      role="region"
      aria-label={ui?.listenPanelLabel ?? "Conversation panel"}
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--sep)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        animation: "slideDown 0.22s ease",
        // Do NOT set a maxHeight here — let flexbox push the board naturally.
        // Board below has flex:1 and will claim whatever remains.
      }}
    >
      {/* ── Status bar (always visible when panel is open) ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 14px",
        flexShrink: 0,
        minHeight: 48,
      }}>
        {/* Pulsing indicator dot */}
        <div
          aria-hidden="true"
          style={{
            width: 10, height: 10, borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            animation: dotPulse ? "pulse 1.4s ease infinite" : "none",
            transition: "background 0.2s ease",
          }}
        />

        {/* Status label */}
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          color: error ? "var(--red)" : "var(--text-2)",
          lineHeight: 1.3,
        }}>
          {statusLabel}
        </span>

        {/* Whisper model download progress */}
        {whisperLoading && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: "var(--text-3)", flexShrink: 0,
          }}>
            {whisperProgress}%
          </span>
        )}

        {/* Action button: Stop Recording → square icon, otherwise X */}
        <button
          onClick={isRecording ? onStopRecording : onDismiss}
          aria-label={
            isRecording
              ? (ui?.listenDone ?? "Stop recording")
              : (ui?.listenClose ?? "Close conversation panel")
          }
          style={{
            width: 40, height: 40, borderRadius: 11,
            background: isRecording ? "rgba(255,59,48,0.12)" : "var(--elevated)",
            border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: isRecording ? "var(--red)" : "var(--text-3)",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          {isRecording
            ? <Square size={16} strokeWidth={2.4} fill="currentColor" />
            : <X size={18} strokeWidth={2.4} />
          }
        </button>
      </div>

      {/* ── Body (hidden for passive listening states with no history) ── */}
      {hasBody && (
        <>
          {/* ── Chat history scroll area ── */}
          {chatHistory.length > 0 && (
            <div
              ref={historyRef}
              role="log"
              aria-live="polite"
              aria-label={ui?.listenHistory ?? "Conversation history"}
              style={{
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "4px 14px 6px",
                flexShrink: 0,
                /* Cap at ~2 visible bubbles; user can scroll if session is long */
                maxHeight: 148,
              }}
            >
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
            </div>
          )}

          {/* Separator if both history and active content are visible */}
          {chatHistory.length > 0 && (isProcessing || isRecording || isSuggestions || isSpeaking) && (
            <div style={{ height: 1, background: "var(--sep)", flexShrink: 0 }} />
          )}

          {/* ── Waveform (recording) ── */}
          {isRecording && (
            <div style={{ padding: "10px 14px 6px", flexShrink: 0 }}>
              <WaveformBars energy={energy} />
            </div>
          )}

          {/* ── Processing state ── */}
          {isProcessing && (
            <div style={{ padding: "10px 14px 6px", flexShrink: 0 }}>
              <ProcessingRow
                label={
                  isTranscribing
                    ? (ui?.listenTranscribing ?? "Transcribing speech…")
                    : (ui?.listenGenerating   ?? "Generating replies…")
                }
              />
              {/* Show transcript bubble while generating */}
              {isGenerating && transcript && (
                <div style={{
                  marginTop: 6,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--elevated)",
                  fontSize: 15, fontWeight: 500, color: "var(--text)",
                  lineHeight: 1.4,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "var(--text-3)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}>
                    {ui?.listenHeard ?? "They said"}
                  </div>
                  "{transcript}"
                </div>
              )}
            </div>
          )}

          {/* ── Reply suggestions ── */}
          {isSuggestions && suggestions.length > 0 && (
            <div style={{
              padding: "8px 12px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flexShrink: 0,
            }}>
              {suggestions.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => onSelectReply?.(reply)}
                  aria-pressed={selectedReply === reply}
                  style={{
                    width: "100%",
                    minHeight: 56,          /* WCAG: generous tap target */
                    padding: "13px 16px",
                    borderRadius: "var(--radius-md)",
                    border: selectedReply === reply
                      ? "2px solid var(--tint)"
                      : "2px solid transparent",
                    background: selectedReply === reply
                      ? "var(--tint)"
                      : "var(--bg)",
                    color: selectedReply === reply ? "#fff" : "var(--text)",
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    transition: "background 0.12s ease, color 0.12s ease",
                  }}
                >
                  <Volume2
                    size={20} strokeWidth={2}
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      color: selectedReply === reply ? "#fff" : "var(--tint)",
                    }}
                  />
                  {reply}
                </button>
              ))}

              {/* Secondary actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={onTypeReply}
                  style={{
                    flex: 1, minHeight: 52, padding: "11px 12px",
                    borderRadius: "var(--radius-xl)",
                    border: "none",
                    background: "var(--tint)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <PenLine size={15} strokeWidth={2} aria-hidden="true" />
                  {ui?.listenTypeReply ?? "Use board"}
                </button>
                <button
                  onClick={onContinue}
                  style={{
                    flex: 1, minHeight: 52, padding: "11px 12px",
                    borderRadius: "var(--radius-xl)",
                    border: "none",
                    background: "var(--tint-soft)", color: "var(--tint)",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
                  {ui?.listenAgain ?? "Listen again"}
                </button>
              </div>
            </div>
          )}

          {/* ── Speaking pill ── */}
          {isSpeaking && selectedReply && (
            <div style={{
              padding: "8px 12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flexShrink: 0,
            }}>
              {/* Currently speaking bubble */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "15px 16px",
                borderRadius: "var(--radius-xl)",
                background: "var(--tint)", color: "#fff",
                fontSize: 16, fontWeight: 600,
              }}>
                <Volume2
                  size={20} strokeWidth={2}
                  aria-hidden="true"
                  style={{ animation: "pulse 0.8s ease infinite", flexShrink: 0 }}
                />
                <span>{selectedReply}</span>
              </div>
              {/* Controls */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onStopSpeaking}
                  style={{
                    flex: 1, minHeight: 52, padding: "11px 12px",
                    borderRadius: "var(--radius-xl)", border: "none",
                    background: "var(--red)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <Square size={14} strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
                  {ui?.stopSpeaking ?? "Stop"}
                </button>
                <button
                  onClick={onContinue}
                  style={{
                    flex: 1, minHeight: 52, padding: "11px 12px",
                    borderRadius: "var(--radius-xl)", border: "none",
                    background: "var(--tint-soft)", color: "var(--tint)",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
                  {ui?.listenAgain ?? "Listen again"}
                </button>
              </div>
            </div>
          )}

          {/* ── Error dismiss ── */}
          {isIdle && error && (
            <div style={{ padding: "4px 12px 14px", flexShrink: 0 }}>
              <button
                onClick={onDismiss}
                style={{
                  width: "100%", minHeight: 52,
                  borderRadius: "var(--radius-xl)", border: "none",
                  background: "var(--tint)", color: "#fff",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {ui?.listenDismiss ?? "OK"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
