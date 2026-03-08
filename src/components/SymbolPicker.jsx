/**
 * SymbolPicker — full-screen symbol grid for a selected AAC category.
 *
 * Shown when the user taps one of the 6 symbol categories on the home grid.
 * Features:
 *  • Large back button to return to the 3×3 category grid
 *  • Category-themed header (emoji, label, color)
 *  • Responsive grid of large symbol buttons
 *  • Respects displayMode (icon+text / icon / text)
 *  • Includes user-added custom symbols, hides hidden ones
 */

import { memo, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { SYMBOLS } from "../data/symbols";
import { getSymbolLabel } from "../data/languages";

export default memo(function SymbolPicker({
  category,
  onTap,
  onBack,
  langCode = "en",
  customSymbols = [],
  hiddenSymbols = [],
  displayMode = "both",
}) {
  const hiddenSet = useMemo(() => new Set(hiddenSymbols), [hiddenSymbols]);

  const symbols = useMemo(() => {
    const builtIn = SYMBOLS.filter(s => s.category === category.mapTo && !hiddenSet.has(s.id));
    const custom  = customSymbols.filter(s => s.category === category.mapTo);
    return [...custom, ...builtIn];
  }, [category.mapTo, customSymbols, hiddenSet]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Category header with back button ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: category.bg,
        borderBottom: "1px solid var(--sep)",
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          aria-label="Back to categories"
          style={{
            width: 48, height: 48,
            borderRadius: 14,
            background: "var(--surface)",
            border: "1.5px solid var(--sep)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: "var(--text)",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <ArrowLeft size={24} strokeWidth={2.2} />
        </button>
        <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">
          {category.emoji}
        </span>
        <span style={{
          fontSize: 22,
          fontWeight: 800,
          color: category.color,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}>
          {category.label.replace("\n", " ")}
        </span>
      </div>

      {/* ── Symbol grid ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px 10px 24px",
        background: "var(--bg)",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: displayMode === "icon"
            ? "repeat(auto-fill, minmax(80px, 1fr))"
            : displayMode === "text"
              ? "repeat(auto-fill, minmax(110px, 1fr))"
              : "repeat(auto-fill, minmax(90px, 1fr))",
          gap: 8,
        }}>
          {symbols.map(s => {
            const label = s._custom ? s.label : getSymbolLabel(s, langCode);
            return (
              <button
                key={s.id}
                onClick={() => onTap(label)}
                aria-label={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "14px 6px",
                  borderRadius: 16,
                  background: "var(--surface)",
                  border: `1.5px solid ${category.color}25`,
                  cursor: "pointer",
                  transition: "transform 0.08s",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  minHeight: 72,
                }}
              >
                {displayMode !== "text" && (
                  <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">
                    {s.emoji}
                  </span>
                )}
                {displayMode !== "icon" && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                    textAlign: "center",
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                  }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
          {symbols.length === 0 && (
            <div style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 40,
              color: "var(--text-3)",
              fontSize: 15,
              fontWeight: 500,
            }}>
              No symbols in this category
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
