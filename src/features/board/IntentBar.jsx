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

import { memo, useRef, useCallback, useState } from "react";
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

export default memo(function IntentBar({ suggestions, onSelect, onSpeak, source, ui, onRefresh }) {
  const emptyHint = ui?.intentHint ?? "Tap a word — AI will suggest full sentences";
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
      padding: "6px 10px 8px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      minHeight: 56,
      flexShrink: 0,
    }}>
      {/* AI indicator — tap to recompute */}
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

      {/* Intent pills */}
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
