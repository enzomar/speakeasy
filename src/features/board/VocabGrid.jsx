/**
 * VocabGrid — Displays a grid of vocabulary items for a selected category.
 *
 * Each cell shows an emoji and the translated word.
 * Tapping a cell speaks the word aloud via TTS.
 *
 * Props:
 *   items      — array of vocab items from VOCAB_DATA
 *   langCode   — current symbol language code
 *   onSpeak    — (word: string) => void  — fires TTS for the tapped word
 *   color      — accent colour for the category (used in cell borders)
 */

import { memo, useCallback } from "react";
import { getVocabLabel } from "./VocabToolbar";

function VocabCell({ item, langCode, color, onSpeak }) {
  const label = getVocabLabel(item, langCode);

  const handleTap = useCallback(() => {
    onSpeak?.(label);
  }, [label, onSpeak]);

  return (
    <button
      onClick={handleTap}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 4px",
        borderRadius: 16,
        background: "var(--surface, #fff)",
        border: `1.5px solid ${color}30`,
        cursor: "pointer",
        transition: "transform 0.1s ease, box-shadow 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minHeight: 72,
      }}
      onPointerDown={e => { e.currentTarget.style.transform = "scale(0.93)"; }}
      onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span
        style={{ fontSize: "clamp(24px, 6vw, 36px)", lineHeight: 1 }}
        aria-hidden="true"
      >
        {item.emoji}
      </span>
      <span style={{
        fontSize: "clamp(11px, 2.5vw, 15px)",
        fontWeight: 700,
        color: color || "var(--text)",
        textAlign: "center",
        lineHeight: 1.15,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        padding: "0 2px",
      }}>
        {label}
      </span>
    </button>
  );
}

export default memo(function VocabGrid({
  items = [],
  langCode = "en",
  onSpeak,
  color = "#495057",
}) {
  return (
    <div
      role="grid"
      aria-label="Vocabulary grid"
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridAutoRows: "min-content",
        gap: 8,
        padding: "10px 12px 16px",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        alignContent: "start",
      }}
    >
      {items.map(item => (
        <VocabCell
          key={item.id}
          item={item}
          langCode={langCode}
          color={color}
          onSpeak={onSpeak}
        />
      ))}
    </div>
  );
});
