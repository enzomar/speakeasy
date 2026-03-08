/**
 * SymbolBoard — scrollable grid of AAC symbol tiles.
 * Filters by active category. Frequent symbols float to top.
 */

import { memo, useMemo } from "react";
import SymbolButton from "./SymbolButton";
import { SYMBOLS, CATEGORY_MAP } from "../data/symbols";
import { getSymbolLabel, getCategoryName } from "../data/languages";

export default memo(function SymbolBoard({ activeCategory, onTap, frequencyMap = {}, langCode = "en", displayMode = "both", customSymbols = [], hiddenSymbols = [] }) {
  const hiddenSet = useMemo(() => new Set(hiddenSymbols), [hiddenSymbols]);

  const filtered = useMemo(() => {
    // Merge built-in (minus hidden) + custom symbols
    const builtIn = SYMBOLS.filter(s => !hiddenSet.has(s.id));
    const all = [...builtIn, ...customSymbols];
    const getUsageKey = (symbol) => {
      const label = getSymbolLabel(symbol, langCode) || symbol.label || "";
      return label.toLowerCase();
    };

    const base =
      activeCategory === "all"
        ? [...all]
        : all.filter(s => s.category === activeCategory);

    return base.sort((a, b) => {
      const fa = frequencyMap[getUsageKey(a)] ?? frequencyMap[(a.label || "").toLowerCase()] ?? 0;
      const fb = frequencyMap[getUsageKey(b)] ?? frequencyMap[(b.label || "").toLowerCase()] ?? 0;
      return fb - fa;
    });
  }, [activeCategory, frequencyMap, customSymbols, hiddenSet, langCode]);

  const catLabel = getCategoryName(activeCategory, langCode);

  return (
    <div
      role="grid"
      aria-label="AAC symbol board"
      style={{
        flex:      1,
        overflowY: "auto",
        padding:   "12px 14px",
        background: "var(--bg)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Section label */}
      <div style={{
        fontSize:      12,
        fontWeight:    700,
        color:         "var(--text-3)",
        letterSpacing: "0.05em",
        marginBottom:  12,
      }}>
        {catLabel.toUpperCase()} · {filtered.length}
      </div>

      {/* Responsive tile grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: displayMode === "icon"
          ? "repeat(auto-fill, minmax(80px,  1fr))"
          : displayMode === "text"
            ? "repeat(auto-fill, minmax(120px, 1fr))"
            : "repeat(auto-fill, minmax(100px, 1fr))",
        gap:         10,
        justifyItems: displayMode === "text" ? "stretch" : "center",
      }}>
        {filtered.map(symbol => (
          <SymbolButton
            key={symbol.id}
            symbol={symbol}
            displayLabel={getSymbolLabel(symbol, langCode)}
            color={CATEGORY_MAP[symbol.category]?.color ?? "var(--tint)"}
            bg={CATEGORY_MAP[symbol.category]?.bg    ?? "var(--tint-soft)"}
            onTap={onTap}
            langCode={langCode}
            displayMode={displayMode}
          />
        ))}
      </div>
    </div>
  );
});
