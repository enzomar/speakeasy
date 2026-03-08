/**
 * RecentPhrasesBar — compact horizontal scroll strip showing the last spoken
 * phrases as tappable chips. Sits just above the category filter on
 * the board view, giving the user one-tap access to load OR speak phrases.
 *
 * Tap chip → load into message bar (for editing)
 * Tap speaker icon → speak directly (1-tap shortcut, saves load + speak)
 */

import { memo } from "react";
import { RotateCcw, Volume2 } from "lucide-react";

const MAX_DISPLAY = 10;
const MAX_CHARS   = 32;

function truncate(text) {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS - 1) + "…" : text;
}

const RecentPhrasesBar = memo(function RecentPhrasesBar({ history, onSelect, onSpeak }) {
  if (!history?.length) return null;

  const recent = history.slice(0, MAX_DISPLAY);

  return (
    <div
      role="region"
      aria-label="Recent phrases"
      style={{
        flexShrink: 0,
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--sep)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        minHeight: 48,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        padding: "6px 12px",
      }}
    >
      {/* Section icon */}
      <RotateCcw
        size={14}
        strokeWidth={2}
        style={{ color: "var(--text-3)", flexShrink: 0, marginRight: 8 }}
      />

      {/* Phrase chips */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {recent.map((entry) => (
          <div
            key={entry.id}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 0,
              borderRadius: "var(--radius-xl)",
              border: "0.5px solid var(--sep)",
              background: "var(--bg)",
              overflow: "hidden",
            }}
          >
            {/* Load into bar */}
            <button
              onClick={() => onSelect(entry.text)}
              aria-label={`Load: ${entry.text}`}
              style={{
                padding: "7px 10px 7px 14px",
                border: "none",
                background: "none",
                color: "var(--text-2)",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.2,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {truncate(entry.text)}
            </button>
            {/* Direct speak — 1 tap */}
            {onSpeak && (
              <button
                onClick={() => onSpeak(entry.text)}
                aria-label={`Speak: ${entry.text}`}
                style={{
                  padding: "7px 10px 7px 6px",
                  border: "none",
                  borderLeft: "0.5px solid var(--sep)",
                  background: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  WebkitTapHighlightColor: "transparent",
                  color: "var(--green)",
                }}
              >
                <Volume2 size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default RecentPhrasesBar;
