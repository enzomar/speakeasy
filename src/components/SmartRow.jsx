/**
 * SmartRow — contextual symbol suggestions from ALL categories.
 *
 * Eliminates the biggest tap-waster: category switching. Instead of navigating
 * People → "I" → Actions → "Want" → Food → "Water", the SmartRow surfaces
 * the most-likely-next symbols inline, regardless of category.
 *
 * Ranking strategy:
 *  1. N-gram context: symbols whose labels appear as bigram/trigram next-words
 *  2. Frequency boost: more-used symbols float higher
 *  3. Core pronoun + verb boost when bar is empty (sentence starters)
 */

import { memo, useMemo } from "react";
import { SYMBOLS, CATEGORY_MAP } from "../data/symbols";
import { getSymbolLabel } from "../data/languages";

const MAX_SMART = 8;

/** Words that typically start AAC sentences — boosted when bar is empty */
const STARTERS = new Set([
  "i", "yes", "no", "please", "help", "want", "need", "hi", "thank you",
  "stop", "more", "go", "sorry",
]);

export default memo(function SmartRow({
  words = [],
  frequencyMap = {},
  langCode = "en",
  predictionEngine,
  customSymbols = [],
  hiddenSymbols = [],
  onTap,
}) {
  const hiddenSet = useMemo(() => new Set(hiddenSymbols), [hiddenSymbols]);

  const smartSymbols = useMemo(() => {
    const allSymbols = [
      ...SYMBOLS.filter(s => !hiddenSet.has(s.id)),
      ...customSymbols,
    ];

    // Build a label → symbol map (lowercase label → symbol)
    const labelMap = new Map();
    for (const sym of allSymbols) {
      const label = (getSymbolLabel(sym, langCode) || sym.label || "").toLowerCase();
      if (label && !labelMap.has(label)) {
        labelMap.set(label, sym);
      }
    }

    const scores = new Map();
    const wordTexts = words.map(w =>
      (typeof w === "string" ? w : w.text).toLowerCase()
    );

    // ── 1. N-gram predicted next-words that match a symbol ──────────────
    if (predictionEngine && wordTexts.length > 0) {
      const ngramPredictions = predictionEngine.predict(wordTexts, 20);
      ngramPredictions.forEach((pred, rank) => {
        // Each prediction word: check if it matches a symbol label
        const singleWord = pred.split(/\s+/)[0]?.toLowerCase();
        if (singleWord && labelMap.has(singleWord)) {
          const sym = labelMap.get(singleWord);
          const score = (scores.get(sym.id) || 0) + (20 - rank) * 3;
          scores.set(sym.id, score);
        }
        // Multi-word match
        if (labelMap.has(pred.toLowerCase())) {
          const sym = labelMap.get(pred.toLowerCase());
          const score = (scores.get(sym.id) || 0) + (20 - rank) * 4;
          scores.set(sym.id, score);
        }
      });
    }

    // ── 2. Sentence starters when bar is empty ──────────────────────────
    if (wordTexts.length === 0) {
      for (const [label, sym] of labelMap) {
        if (STARTERS.has(label)) {
          scores.set(sym.id, (scores.get(sym.id) || 0) + 20);
        }
      }
    }

    // ── 3. Frequency boost (global usage history) ───────────────────────
    for (const [label, sym] of labelMap) {
      const freq = frequencyMap[label] ?? 0;
      if (freq > 0) {
        scores.set(sym.id, (scores.get(sym.id) || 0) + Math.min(freq, 15));
      }
    }

    // ── 4. Exclude symbols already in the current sentence ──────────────
    const usedLabels = new Set(wordTexts);
    const candidates = allSymbols.filter(s => {
      const label = (getSymbolLabel(s, langCode) || s.label || "").toLowerCase();
      return scores.has(s.id) && !usedLabels.has(label);
    });

    return candidates
      .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0))
      .slice(0, MAX_SMART);
  }, [words, frequencyMap, langCode, predictionEngine, customSymbols, hiddenSet]);

  if (smartSymbols.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Suggested symbols"
      style={{
        flexShrink: 0,
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--sep)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        minHeight: 52,
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        padding: "6px 10px",
      }}
    >
      {smartSymbols.map(sym => {
        const label = getSymbolLabel(sym, langCode) || sym.label || "";
        const catColor = CATEGORY_MAP[sym.category]?.color ?? "var(--tint)";
        return (
          <button
            key={sym.id}
            onClick={() => onTap(label)}
            aria-label={`Quick: ${label}`}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              marginRight: 6,
              borderRadius: "var(--radius-xl)",
              border: "0.5px solid var(--sep)",
              background: "var(--bg)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              transition: "transform 0.1s ease, background 0.1s ease",
              fontFamily: "inherit",
            }}
            onPointerDown={e => { e.currentTarget.style.background = catColor + "18"; e.currentTarget.style.transform = "scale(0.95)"; }}
            onPointerUp={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.transform = "scale(1)"; }}
            onPointerLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            {sym.emoji && (
              <span style={{ fontSize: 18, lineHeight: 1 }}>{sym.emoji}</span>
            )}
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: catColor,
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
});
