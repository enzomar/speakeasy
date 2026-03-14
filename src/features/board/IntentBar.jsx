/**
 * IntentBar — AI intent prediction bar for AAC.
 *
 * Shows full sentence suggestions as large tappable pills.
 * - Short tap/click → speaks the sentence immediately (1-tap communication).
 * - Long press (≥500 ms) → copies the sentence to the input bar for editing.
 *
 * Design:
 *  • Horizontal scrollable row of sentence pills
 *  • First pill is accent-colored (highest confidence)
 *  • Large touch targets, high contrast text
 *  • Sparkle icon indicates AI source
 */

import { memo, useRef, useCallback, useState, useEffect } from "react";
import { Sparkles, Volume2 } from "lucide-react";

const LONG_PRESS_MS = 500;

function IntentPill({ sentence, index, onSpeak, onSelect }) {
  const timerRef   = useRef(null);
  const firedRef   = useRef(false);     // did long-press fire?
  const btnRef     = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const handleDown = useCallback((e) => {
    firedRef.current = false;
    if (btnRef.current) btnRef.current.style.transform = "scale(0.95)";
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      // Visual feedback — pulse to signal long-press success
      if (btnRef.current) {
        btnRef.current.style.transform = "scale(1.04)";
        setTimeout(() => { if (btnRef.current) btnRef.current.style.transform = "scale(1)"; }, 150);
      }
      if (onSelect) onSelect(sentence);
    }, LONG_PRESS_MS);
  }, [sentence, onSelect]);

  const handleUp = useCallback(() => {
    clear();
    if (btnRef.current) btnRef.current.style.transform = "scale(1)";
    // Speak decision moved to handleClick (single gate for both tap & long-press)
  }, [clear]);

  const handleLeave = useCallback(() => {
    clear();
    if (btnRef.current) btnRef.current.style.transform = "scale(1)";
  }, [clear]);

  // Single decision point: short tap → speak, long-press → suppress
  const handleClick = useCallback((e) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;   // reset for next interaction
      return;
    }
    if (onSpeak) onSpeak(sentence);
    else if (onSelect) onSelect(sentence);
  }, [sentence, onSpeak, onSelect]);

  // Prevent context menu on long press (mobile)
  const preventMenu = useCallback((e) => e.preventDefault(), []);

  return (
    <button
      ref={btnRef}
      aria-label={`Say: ${sentence}`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleLeave}
      onPointerCancel={handleLeave}
      onClick={handleClick}
      onContextMenu={preventMenu}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: 20,
        border: "none",
        background: index === 0 ? "var(--tint)" : "var(--tint-soft)",
        color: index === 0 ? "#fff" : "var(--tint)",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        transition: "transform 0.12s",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        lineHeight: 1.3,
        userSelect: "none",
      }}
    >
      {sentence}
      <Volume2
        size={12}
        strokeWidth={2.5}
        style={{ marginLeft: 6, flexShrink: 0, opacity: 0.7 }}
      />
    </button>
  );
}

// ── Inline emotion chips (replaces the separate EmotionStrip) ──────────────

const EMOTION_OPTIONS = [
  { id: "neutral",   emoji: "😐" },
  { id: "positive",  emoji: "😊" },
  { id: "negative",  emoji: "😞" },
  { id: "urgent",    emoji: "⚡" },
  { id: "uncertain", emoji: "🤔" },
];

// ── Emotion picker: single icon button + dropdown modal ────────────────────

function EmotionPicker({ emotion, detectedEmotion, onEmotionChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const current = EMOTION_OPTIONS.find(o => o.id === emotion)
    ?? EMOTION_OPTIONS.find(o => o.id === detectedEmotion)
    ?? EMOTION_OPTIONS[0]; // neutral fallback

  const handleSelect = useCallback((id) => {
    onEmotionChange?.(emotion === id ? null : id);
    setOpen(false);
  }, [emotion, onEmotionChange]);

  return (
    <div style={{ position: "relative", flexShrink: 0, marginLeft: 4 }}>
      {/* Single emoji trigger */}
      <button
        ref={btnRef}
        aria-label={`Mood: ${current.id}. Tap to change.`}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36,
          borderRadius: 10,
          border: open ? "1.5px solid var(--tint)" : "1.5px solid var(--sep)",
          background: open ? "var(--tint-soft)" : "var(--elevated)",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          transition: "all 0.12s",
        }}
      >
        {current.emoji}
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          ref={popRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 100,
            background: "var(--surface)",
            border: "0.5px solid var(--sep)",
            borderRadius: 14,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            minWidth: 44,
          }}
        >
          {EMOTION_OPTIONS.map(({ id, emoji }) => (
            <button
              key={id}
              aria-label={id}
              onClick={() => handleSelect(id)}
              style={{
                width: 40, height: 40,
                borderRadius: 10,
                border: emotion === id ? "1.5px solid var(--tint)" : "1.5px solid transparent",
                background: emotion === id ? "var(--tint-soft)" : "transparent",
                fontSize: 20,
                lineHeight: 1,
                cursor: "pointer",
                padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                transition: "all 0.1s",
                opacity: emotion === id ? 1 : 0.65,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(function IntentBar({
  suggestions, onSelect, onSpeak, source, ui, onRefresh,
  emotion, onEmotionChange, detectedEmotion,
}) {
  const emptyHint = ui?.intentHint ?? "Tap a word — AI completes the sentence";
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    if (!onRefresh) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 700);
  }, [onRefresh]);

  return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      padding: "5px 10px 6px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      flexShrink: 0,
    }}>
      {/* AI sparkle + refresh */}
      <button
        aria-label="Refresh AI suggestions"
        onClick={handleRefresh}
        style={{
          background: "none",
          border: "none",
          padding: 4,
          cursor: onRefresh ? "pointer" : "default",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "opacity 0.15s",
          WebkitTapHighlightColor: "transparent",
          animation: spinning ? "spin 0.7s linear" : "none",
        }}
        onPointerDown={e => onRefresh && (e.currentTarget.style.opacity = "0.5")}
        onPointerUp={e   => (e.currentTarget.style.opacity = "1")}
        onPointerLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <Sparkles
          size={14}
          strokeWidth={2}
          style={{
            color: source === "llm" ? "var(--green)" : "var(--text-4)",
          }}
        />
      </button>

      {/* Intent pills (scrollable) */}
      {suggestions.length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="AI suggestions"
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {suggestions.map((sentence, i) => (
            <IntentPill
              key={sentence + i}
              sentence={sentence}
              index={i}
              onSpeak={onSpeak}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p style={{
          margin: 0, fontSize: 12, color: "var(--text-4)",
          fontStyle: "italic", flex: 1, lineHeight: 1.3,
        }}>
          {emptyHint}
        </p>
      )}

      {/* Single-icon emotion picker (replaces inline chips) */}
      {onEmotionChange && (
        <EmotionPicker
          emotion={emotion}
          detectedEmotion={detectedEmotion}
          onEmotionChange={onEmotionChange}
        />
      )}
    </div>
  );
});
