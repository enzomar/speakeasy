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

import { memo, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";

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

  const handleUp = useCallback((e) => {
    clear();
    if (btnRef.current) btnRef.current.style.transform = "scale(1)";
    // Only fire speak on short tap (long-press already handled)
    if (!firedRef.current) {
      if (onSpeak) onSpeak(sentence);
      else if (onSelect) onSelect(sentence);
    }
  }, [sentence, onSpeak, onSelect, clear]);

  const handleLeave = useCallback(() => {
    clear();
    if (btnRef.current) btnRef.current.style.transform = "scale(1)";
  }, [clear]);

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
      onContextMenu={preventMenu}
      style={{
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
    </button>
  );
}

export default memo(function IntentBar({ suggestions, onSelect, onSpeak, source, ui }) {
  const emptyHint = ui?.intentHint ?? "Tap a word — AI will suggest full sentences";

  return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      padding: "6px 10px 8px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      minHeight: 56,
      flexShrink: 0,
    }}>
      {/* AI indicator */}
      <Sparkles
        size={14}
        strokeWidth={2}
        style={{
          color: source === "llm" ? "var(--green)" : "var(--text-4)",
          flexShrink: 0,
        }}
      />

      {/* Intent pills */}
      {suggestions.length > 0 ? (
        <div style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          flex: 1,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
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
          margin: 0, fontSize: 13, color: "var(--text-4)",
          fontStyle: "italic", flex: 1,
        }}>
          {emptyHint}
        </p>
      )}
    </div>
  );
});
