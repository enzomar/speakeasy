/**
 * CoreWordGrid — always-visible grid of high-frequency core words.
 *
 * Design goals (AAC best practice):
 *  • 1-tap word selection → triggers AI intent prediction instantly
 *  • Very large touch targets (min 64×64 px effective)
 *  • High-contrast emoji + label on soft tinted backgrounds
 *  • Scrollable grid that fills available space
 *  • Grouped by communication function (people, verbs, nouns, feelings, social)
 *  • Flat, rounded cards — minimal cognitive load
 */

import { memo, useMemo } from "react";
import { SYMBOLS } from "../data/symbols";
import { getSymbolLabel } from "../data/languages";

/**
 * Curated core vocabulary — the ~40 most useful words for daily AAC.
 * Ordered by communication priority: social → people → verbs → nouns → feelings.
 * These IDs map to entries in SYMBOLS.
 */
const CORE_IDS = [
  // Social essentials (quick responses)
  "yes", "no", "please", "thankyou", "help", "stop", "more", "done",
  // People
  "i", "you", "we", "mom", "dad",
  // Core verbs / actions
  "want", "need", "go", "eat", "drink", "like", "come", "give", "look",
  // Key nouns
  "water", "food", "bathroom", "home", "medicine", "phone",
  // Feelings
  "happy", "sad", "hurt", "tired", "sick",
  // Descriptors
  "good", "bad", "now", "later",
];

export default memo(function CoreWordGrid({
  onTap,
  langCode = "en",
  customSymbols = [],
  hiddenSymbols = [],
}) {
  const hiddenSet = useMemo(() => new Set(hiddenSymbols), [hiddenSymbols]);

  const coreSymbols = useMemo(() => {
    const symbolMap = new Map(SYMBOLS.map(s => [s.id, s]));
    // Add custom symbols to the map
    customSymbols.forEach(s => { if (s.id) symbolMap.set(s.id, s); });

    return CORE_IDS
      .map(id => symbolMap.get(id))
      .filter(s => s && !hiddenSet.has(s.id));
  }, [customSymbols, hiddenSet]);

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "8px 8px 20px",
      WebkitOverflowScrolling: "touch",
      background: "var(--bg)",
    }}>
      <div
        role="grid"
        aria-label="Core words"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 6,
        }}
      >
        {coreSymbols.map(s => {
          const label = s._custom ? s.label : getSymbolLabel(s, langCode);
          return (
            <button
              key={s.id}
              role="gridcell"
              onClick={() => onTap(label)}
              aria-label={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "10px 4px",
                borderRadius: 14,
                background: "var(--surface)",
                border: "1.5px solid var(--sep)",
                cursor: "pointer",
                minHeight: 68,
                transition: "transform 0.08s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              onPointerDown={e => (e.currentTarget.style.transform = "scale(0.93)")}
              onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span
                style={{ fontSize: 28, lineHeight: 1 }}
                aria-hidden="true"
              >
                {s.emoji}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text)",
                textAlign: "center",
                lineHeight: 1.1,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
