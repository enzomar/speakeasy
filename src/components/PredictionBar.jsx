/**
 * PredictionBar — horizontal strip of AI-suggested next words.
 * Native iOS-style: tinted capsule pills on a subtle surface.
 */

import { memo } from "react";
import { Sparkles } from "lucide-react";

export default memo(function PredictionBar({ suggestions, onSelect, ui, source }) {
  const emptyHint  = ui?.tapToSuggest  ?? "Tap a symbol or type to get suggestions…";

  return (
    <div style={{
      background:   "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      padding:      "8px 12px 10px",
      display:      "flex",
      alignItems:   "center",
      gap:          8,
      minHeight:    52,
    }}>
      {/* Sparkles icon — minimal indicator, no text label */}
      <Sparkles
        size={14}
        strokeWidth={2}
        style={{ color: source === "llm" ? "var(--green)" : "var(--text-4)", flexShrink: 0 }}
      />

      {/* Pills */}
      {suggestions.length > 0 ? (
        <div style={{
          display: "flex", gap: 8, overflowX: "auto", flex: 1,
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        }}>
          {suggestions.map((word, i) => (
            <button
              key={word + i}
              aria-label={`Suggest: ${word}`}
              onClick={() => onSelect(word)}
              style={{
                padding:      "10px 20px",
                borderRadius: "var(--radius-xl)",
                border:       "none",
                background:   i === 0 ? "var(--tint)" : "var(--tint-soft)",
                color:        i === 0 ? "#fff" : "var(--tint)",
                fontSize:     15,
                fontWeight:   700,
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                flexShrink:   0,
                transition:   "transform 0.08s",
                WebkitTapHighlightColor: "transparent",
              }}
              onPointerDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
              onPointerUp={e   => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              {word}
            </button>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-4)", fontStyle: "italic", flex: 1 }}>
          {emptyHint}
        </p>
      )}
    </div>
  );
});
