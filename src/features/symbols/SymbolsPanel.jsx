/**
 * SymbolsPanel — Dedicated page for browsing, searching, and playing vocabulary symbols.
 *
 * Shows all vocabulary categories (objects, colours, numbers, directions,
 * countries, food, animals, body, describe) with:
 *   • A search bar to filter symbols across all categories
 *   • Category filter chips to narrow by category
 *   • 4-column emoji grid with tap-to-speak
 */

import { memo, useState, useCallback, useMemo } from "react";
import { Search, X } from "lucide-react";
import { VOCAB_DATA, VOCAB_TABS, getVocabLabel, getTabLabel } from "../board/VocabToolbar";
import VocabGrid from "../board/VocabGrid";

// All vocabulary category IDs (everything except "grid")
const CATEGORY_IDS = VOCAB_TABS.filter(t => t.id !== "grid");

export default memo(function SymbolsPanel({ langCode = "en", onSpeak, vocabMode, ui }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null); // null = all

  const handleCategoryToggle = useCallback((id) => {
    setActiveCategory(prev => prev === id ? null : id);
  }, []);

  const handleClearSearch = useCallback(() => setQuery(""), []);

  // Build filtered items list
  const { items, color } = useMemo(() => {
    const cats = activeCategory ? [activeCategory] : CATEGORY_IDS.map(c => c.id);
    const q = query.trim().toLowerCase();

    let merged = [];
    for (const catId of cats) {
      const data = VOCAB_DATA[catId] || [];
      merged = merged.concat(data);
    }

    if (q) {
      merged = merged.filter(item => {
        const label = getVocabLabel(item, langCode).toLowerCase();
        const enLabel = (item.en || "").toLowerCase();
        return label.includes(q) || enLabel.includes(q) || item.emoji.includes(q);
      });
    }

    const catColor = activeCategory
      ? VOCAB_TABS.find(t => t.id === activeCategory)?.color ?? "#495057"
      : "#495057";

    return { items: merged, color: catColor };
  }, [activeCategory, query, langCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* ── Search bar ── */}
      <div style={{
        flexShrink: 0,
        padding: "8px 12px 4px",
        background: "var(--bg)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--surface)",
          border: "1.5px solid var(--sep)",
          borderRadius: 14,
          padding: "0 12px",
          minHeight: 42,
        }}>
          <Search size={16} strokeWidth={2} style={{ color: "var(--text-4)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ui?.symbolsSearch ?? "Search symbols…"}
            aria-label={ui?.symbolsSearch ?? "Search symbols"}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text)",
              outline: "none",
              padding: "10px 0",
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={handleClearSearch}
              aria-label="Clear search"
              style={{
                background: "none", border: "none", padding: 4, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-4)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category filter chips ── */}
      <div style={{
        flexShrink: 0,
        padding: "6px 12px 8px",
        background: "var(--bg)",
        borderBottom: "0.5px solid var(--sep)",
      }}>
        <div style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {CATEGORY_IDS.map(cat => {
            const isActive = activeCategory === cat.id;
            const label = getTabLabel(cat.id, langCode);
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                aria-label={label}
                aria-pressed={isActive}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: isActive ? `${cat.color}18` : "var(--surface)",
                  border: isActive ? `1.5px solid ${cat.color}` : "1.5px solid var(--sep)",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  flexShrink: 0,
                  minHeight: 36,
                }}
              >
                <Icon
                  size={14}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? cat.color : "var(--text-3)" }}
                />
                <span style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? cat.color : "var(--text-3)",
                  whiteSpace: "nowrap",
                }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results grid ── */}
      {items.length > 0 ? (
        <VocabGrid
          items={items}
          langCode={langCode}
          onSpeak={onSpeak}
          color={color}
        />
      ) : (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8, padding: 24, color: "var(--text-4)",
        }}>
          <span style={{ fontSize: 40 }}>🔍</span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            {ui?.symbolsNoResults ?? "No symbols found"}
          </p>
        </div>
      )}
    </div>
  );
});
