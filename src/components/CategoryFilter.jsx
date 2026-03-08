/**
 * CategoryFilter — collapsible category selector (multilingual).
 * Shows the active category as a compact header; expands into a wrap grid on tap.
 * ⚙️ Gear button lets users pick symbol display mode: icon+text / icon only / text only.
 */

import { memo, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { CATEGORIES } from "../data/symbols";
import { getCategoryName } from "../data/languages";

const DISPLAY_MODES = [
  { id: "both", emoji: "🔤", label: "Icon + Text" },
  { id: "icon", emoji: "🖼️", label: "Icon only" },
  { id: "text", emoji: "📝", label: "Text only" },
];

export default memo(function CategoryFilter({
  active, onSelect, langCode = "en", ui,
  displayMode = "both", onDisplayModeChange,
}) {
  const [open,         setOpen]         = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeCat   = CATEGORIES.find(c => c.id === active) || CATEGORIES[0];
  const activeLabel = getCategoryName(activeCat.id, langCode);

  return (
    <div style={{ background: "var(--surface)", borderBottom: "0.5px solid var(--sep)", flexShrink: 0 }}>
      {/* Compact header — always visible */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 8, minHeight: 52 }}>

        {/* Category pill row — tapping toggles the category grid */}
        <button
          onClick={() => { setOpen(v => !v); setSettingsOpen(false); }}
          aria-expanded={open}
          aria-label="Toggle category filter"
          style={{
            flex:        1,
            display:     "flex",
            alignItems:  "center",
            gap:         10,
            border:      "none",
            background:  "transparent",
            cursor:      "pointer",
            WebkitTapHighlightColor: "transparent",
            minWidth:    0,
            padding:     0,
          }}
        >
          <span style={{
            padding:      "8px 16px",
            borderRadius: "var(--radius-xl)",
            background:   activeCat.color,
            color:        "#fff",
            fontSize:     14,
            fontWeight:   700,
            flexShrink:   0,
          }}>
            {activeLabel}
          </span>
          <span style={{
            fontSize: 13, color: "var(--text-3)", fontWeight: 500,
            flex: 1, textAlign: "left",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {ui?.category ?? "Category"}
          </span>
          <ChevronDown
            size={18} strokeWidth={2}
            style={{
              color: "var(--text-3)",
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        </button>

        {/* ⚙️ Gear — toggles display-mode settings panel */}
        <button
          onClick={() => { setSettingsOpen(v => !v); setOpen(false); }}
          aria-label="Symbol display settings"
          aria-pressed={settingsOpen}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34,
            borderRadius: "var(--radius-md)",
            border: "none",
            background: settingsOpen ? "var(--tint-soft)" : "transparent",
            color:      settingsOpen ? "var(--tint)"      : "var(--text-3)",
            cursor: "pointer", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          <Settings size={17} strokeWidth={1.8} />
        </button>
      </div>

      {/* Display-mode settings panel */}
      {settingsOpen && (
        <div style={{
          padding: "6px 14px 14px",
          borderTop: "0.5px solid var(--sep)",
          animation: "fadeUp 0.15s ease both",
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-3)",
            margin: "0 0 8px", letterSpacing: "0.06em",
          }}>
            SYMBOL DISPLAY
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {DISPLAY_MODES.map(m => {
              const isSel = displayMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { onDisplayModeChange?.(m.id); setSettingsOpen(false); }}
                  style={{
                    flex: 1, padding: "10px 4px",
                    borderRadius: "var(--radius-md)",
                    border:      isSel ? "none" : "0.5px solid var(--sep)",
                    background:  isSel ? "var(--tint)" : "var(--bg)",
                    color:       isSel ? "#fff" : "var(--text-2)",
                    fontSize: 11, fontWeight: 700,
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded category grid */}
      {open && (
        <div
          role="tablist"
          aria-label="Symbol categories"
          style={{
            display:   "flex",
            flexWrap:  "wrap",
            gap:       8,
            padding:   "4px 14px 14px",
            animation: "fadeUp 0.15s ease both",
          }}
        >
          {CATEGORIES.map(cat => {
            const isActive = active === cat.id;
            const label    = getCategoryName(cat.id, langCode);
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => { onSelect(cat.id); setOpen(false); }}
                style={{
                  padding:      "9px 18px",
                  borderRadius: "var(--radius-xl)",
                  border:       isActive ? "none" : "0.5px solid var(--sep)",
                  background:   isActive ? cat.color : "var(--bg)",
                  color:        isActive ? "#fff" : "var(--text-2)",
                  fontSize:     14,
                  fontWeight:   700,
                  cursor:       "pointer",
                  whiteSpace:   "nowrap",
                  transition:   "all 0.15s ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
