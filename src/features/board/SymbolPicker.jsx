/**
 * SymbolPicker — 3-level hierarchical symbol grid for the AAC board.
 *
 * Level 1 → CategoryGrid (handled by App)
 * Level 2 → L2 symbol grid (this component, initial view)
 * Level 3 → L3 modifier grid (shown after tapping an L2 item)
 *
 * Behaviour:
 *  • Tap L2 item  → adds word to message bar, reveals its L3 modifiers
 *  • Tap L3 item  → adds modifier to message bar, returns to L2
 *  • Back at L3   → returns to L2
 *  • Back at L2   → calls onBack() (returns to CategoryGrid)
 *
 * Falls back to the flat SYMBOLS list for any category without hierarchy data.
 */

import { memo, useMemo, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { SYMBOLS } from "../../data/symbols";
import { getSymbolLabel, getHierarchyLabel } from "../../i18n/translations";
import { getHierarchy } from "../../data/hierarchy";

// ── Shared header ─────────────────────────────────────────────────────────────

function PickerHeader({ onBack, emoji, label, color, bg, sublabel }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: bg,
      borderBottom: "1px solid var(--sep)",
      flexShrink: 0,
    }}>
      <button
        onClick={onBack}
        aria-label="Go back"
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
      <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">{emoji}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{
          fontSize: sublabel ? 16 : 22,
          fontWeight: 800,
          color,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          lineHeight: 1.1,
        }}>
          {label}
        </span>
        {sublabel && (
          <span style={{
            fontSize: 20,
            fontWeight: 800,
            color,
            letterSpacing: "0.01em",
            textTransform: "capitalize",
          }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Shared symbol tile ────────────────────────────────────────────────────────

function SymbolTile({ emoji, label, color, onClick, highlight = false }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "16px 8px",
        borderRadius: 18,
        background: highlight ? `${color}18` : "var(--surface)",
        border: `1.5px solid ${color}${highlight ? "60" : "25"}`,
        cursor: "pointer",
        transition: "transform 0.08s",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minHeight: 88,
      }}
      onPointerDown={e  => (e.currentTarget.style.transform = "scale(0.93)")}
      onPointerUp={e    => (e.currentTarget.style.transform = "scale(1)")}
      onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }} aria-hidden="true">{emoji}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: highlight ? color : "var(--text)",
        textAlign: "center",
        lineHeight: 1.2,
        wordBreak: "break-word",
      }}>
        {label}
      </span>
    </button>
  );
}

// ── Scrollable grid wrapper ───────────────────────────────────────────────────

function TileGrid({ children }) {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "12px 10px 28px",
      background: "var(--bg)",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── L3 type classifier ────────────────────────────────────────────────────────
// Determine the semantic role of an L3 modifier from its id prefix.
// This is passed to the LLM so it understands *how* to use the modifier.

function classifyL3(id) {
  if (!id) return "detail";
  if (id.startsWith("t_"))   return "time";
  if (id.startsWith("p_"))   return "person";
  if (id.startsWith("pl_"))  return "place";
  if (id.startsWith("x_"))   return "intensity";  // polarity: not, very, a little, more…
  if (id.startsWith("o_"))   return "object";
  if (id.startsWith("b_"))   return "body";
  if (id.startsWith("n3_"))  return "specific-item"; // food/drink/clothing sub-items
  if (id.startsWith("lc3_")) return "sub-place";     // room, playground, etc.
  return "detail";
}

// ── Main component ────────────────────────────────────────────────────────────

export default memo(function SymbolPicker({
  category,
  onTap,
  onTapContext,
  onBack,
  langCode = "en",
  customSymbols = [],
  hiddenSymbols = [],
  displayMode = "both",
  ui,
}) {
  const hierarchy = useMemo(() => getHierarchy(category.id), [category.id]);
  const [activeL2, setActiveL2] = useState(null); // currently selected L2 item

  // ── Flat-symbol data (computed unconditionally to satisfy Rules of Hooks) ──
  const hiddenSet = useMemo(() => new Set(hiddenSymbols), [hiddenSymbols]);
  const symbols   = useMemo(() => {
    if (hierarchy) return [];  // not used in hierarchy mode
    const builtIn = SYMBOLS.filter(s => s.category === category.mapTo && !hiddenSet.has(s.id));
    const custom  = customSymbols.filter(s => s.category === category.mapTo);
    return [...custom, ...builtIn];
  }, [category.mapTo, customSymbols, hiddenSet, hierarchy]);

  // ── Hierarchy mode (L2 → L3) ───────────────────────────────────────────────

  const handleL2Tap = useCallback((item) => {
    const label = getHierarchyLabel(item, langCode);
    onTap(label);             // add translated L2 word to message bar
    // Report hierarchy context: L1 + L2, no L3 yet
    onTapContext?.({
      l1Label: getHierarchyLabel(category, langCode),
      l2Label: label,
      l2Canon: item.label,
      l3Label: null,
      l3Canon: null,
      l3Type:  null,
    });
    if (item.l3?.length) {
      setActiveL2(item);      // reveal L3 grid
    }
    // If no L3 items, nothing more to show — stay at L2 for next tap
  }, [onTap, onTapContext, category, langCode]);

  const handleL3Tap = useCallback((modifier) => {
    const label = getHierarchyLabel(modifier, langCode);
    onTap(label);             // add translated modifier to message bar
    // Report full hierarchy context: L1 + L2 + L3 + type
    onTapContext?.({
      l1Label: getHierarchyLabel(category, langCode),
      l2Label: activeL2 ? getHierarchyLabel(activeL2, langCode) : null,
      l2Canon: activeL2?.label || null,
      l3Label: label,
      l3Canon: modifier.label,
      l3Type:  classifyL3(modifier.id),
    });
    setActiveL2(null);        // return to L2
  }, [onTap, onTapContext, category, activeL2, langCode]);

  const handleL3Back = useCallback(() => setActiveL2(null), []);

  if (hierarchy) {
    // ── L3 view ──
    if (activeL2) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PickerHeader
            onBack={handleL3Back}
            emoji={activeL2.emoji}
            label={getHierarchyLabel(category, langCode)}
            sublabel={getHierarchyLabel(activeL2, langCode)}
            color={category.color}
            bg={category.bg}
          />
          <TileGrid>
            {activeL2.l3.map(mod => (
              <SymbolTile
                key={mod.id}
                emoji={mod.emoji}
                label={getHierarchyLabel(mod, langCode)}
                color={category.color}
                onClick={() => handleL3Tap(mod)}
              />
            ))}
          </TileGrid>
        </div>
      );
    }

    // ── L2 view ──
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PickerHeader
          onBack={onBack}
          emoji={category.emoji}
          label={getHierarchyLabel(category, langCode)}
          color={category.color}
          bg={category.bg}
        />
        <TileGrid>
          {hierarchy.items.map(item => (
            <SymbolTile
              key={item.id}
              emoji={item.emoji}
              label={getHierarchyLabel(item, langCode)}
              color={category.color}
              onClick={() => handleL2Tap(item)}
              highlight={item.l3?.length > 0}
            />
          ))}
        </TileGrid>
      </div>
    );
  }

  // ── Fallback: flat SYMBOLS list (no hierarchy defined for this category) ───

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PickerHeader
        onBack={onBack}
        emoji={category.emoji}
        label={getHierarchyLabel(category, langCode)}
        color={category.color}
        bg={category.bg}
      />
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "10px 10px 24px",
        background: "var(--bg)",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: displayMode === "icon"
            ? "repeat(auto-fill, minmax(80px, 1fr))"
            : "repeat(auto-fill, minmax(90px, 1fr))",
          gap: 8,
        }}>
          {symbols.map(s => {
            const label = s._custom ? s.label : getSymbolLabel(s, langCode);
            return (
              <SymbolTile
                key={s.id}
                emoji={s.emoji}
                label={label}
                color={category.color}
                onClick={() => onTap(label)}
              />
            );
          })}
          {symbols.length === 0 && (
            <div style={{
              gridColumn: "1 / -1", textAlign: "center",
              padding: 40, color: "var(--text-3)", fontSize: 15, fontWeight: 500,
            }}>
              No symbols in this category
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
