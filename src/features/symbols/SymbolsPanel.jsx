/**
 * SymbolsPanel — Dedicated page for browsing, searching, playing,
 * and viewing vocabulary symbols fullscreen.
 *
 * Features:
 *   • Search bar to filter across all symbols
 *   • Category chips to narrow by category
 *   • Tap to speak, long-press (with fill effect) to view fullscreen
 */

import { memo, useState, useCallback, useMemo, useRef } from "react";
import { Search, X, Volume2, Maximize2 } from "lucide-react";
import { VOCAB_DATA, VOCAB_TABS, getVocabLabel, getTabLabel } from "../board/VocabToolbar";
import { getArasaacPictogramUrl } from "../../data/arasaac";
import SymbolGlyph from "../../shared/ui/SymbolGlyph";

// Vocab category tabs (everything except "grid")
const VOCAB_CATEGORY_IDS = VOCAB_TABS.filter(t => t.id !== "grid");

const LONG_PRESS_MS = 600;

// ── Fullscreen overlay ────────────────────────────────────────────────────────

function FullscreenView({ item, langCode, onSpeak, onClose }) {
  // item has { emoji, label/en, imageUrl? } — we normalise
  const label = item._label || "";
  const imageUrl = item._imageUrl || null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20, padding: 24,
        animation: "fadeIn 0.15s ease",
      }}
    >
      {/* Symbol / Pictogram */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 20, maxWidth: "90vw",
        }}
      >
        <SymbolGlyph
          emoji={item.emoji}
          imageUrl={imageUrl}
          size={160}
          style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.4))" }}
        />
        <span style={{
          fontSize: 36, fontWeight: 800, color: "#fff",
          textAlign: "center", lineHeight: 1.2,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          {label}
        </span>

        {/* Speak button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSpeak?.(label); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 32px", borderRadius: 28,
            background: "var(--tint, #3B9B8F)", color: "#fff",
            border: "none", fontSize: 18, fontWeight: 700,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <Volume2 size={22} strokeWidth={2.2} />
          {label}
        </button>
      </div>

      {/* Close hint */}
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8 }}>
        Tap anywhere to close
      </span>
    </div>
  );
}

// ── Symbol cell (handles both board and vocab items) ──────────────────────────

function SymbolCell({ item, color, onSpeak, onFullscreen }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const [pressState, setPressState] = useState(null); // null | "pressing" | "releasing"
  const startRef = useRef(0);  // timestamp when press began

  const handleDown = useCallback(() => {
    firedRef.current = false;
    startRef.current = performance.now();
    setPressState("pressing");
    // Defer the timer so it starts in sync with the CSS fill animation
    requestAnimationFrame(() => {
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        setPressState(null);
        onFullscreen?.(item);
      }, LONG_PRESS_MS);
    });
  }, [item, onFullscreen]);

  const handleUp = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (firedRef.current) { setPressState(null); return; }
    // Reverse‐fill: animate back proportional to how far the fill got
    const elapsed = performance.now() - startRef.current;
    const pct = Math.min(elapsed / LONG_PRESS_MS, 1);
    if (pct < 0.05) { setPressState(null); return; }           // barely started — just remove
    const reverseDur = Math.round(pct * LONG_PRESS_MS * 0.5);  // shrink back at 2× speed
    setPressState({ mode: "releasing", pct, duration: reverseDur });
    setTimeout(() => setPressState(null), reverseDur + 10);
  }, []);

  const handleClick = useCallback((e) => {
    if (firedRef.current) { e.preventDefault(); firedRef.current = false; return; }
    onSpeak?.(item._label);
  }, [item, onSpeak]);

  const handleExpand = useCallback((e) => {
    e.stopPropagation();
    onFullscreen?.(item);
  }, [item, onFullscreen]);

  const preventMenu = useCallback((e) => e.preventDefault(), []);

  const isNumeric = /^\d+$/.test(item.emoji);

  return (
    <button
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      onClick={handleClick}
      onContextMenu={preventMenu}
      aria-label={item._label}
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
        transition: "transform 0.1s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        position: "relative",
        minHeight: 72,
        userSelect: "none",
        overflow: "hidden",
      }}
      onPointerDown2={e => { e.currentTarget.style.transform = "scale(0.93)"; }}
    >
      {/* Long-press fill indicator */}
      {pressState && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: color || "var(--tint, #3B9B8F)",
            opacity: 0.15,
            borderRadius: "inherit",
            transformOrigin: "left center",
            pointerEvents: "none",
            ...(pressState === "pressing"
              ? { animation: `clearFill ${LONG_PRESS_MS}ms linear forwards` }
              : {
                  transform: `scaleX(${pressState.pct})`,
                  animation: `clearFillReverse ${pressState.duration}ms linear forwards`,
                }),
          }}
        />
      )}
      <SymbolGlyph
        emoji={item.emoji}
        imageUrl={item._imageUrl}
        size={isNumeric ? undefined : "clamp(24px, 6vw, 36px)"}
        style={isNumeric
          ? { fontSize: "clamp(28px, 7vw, 40px)", fontWeight: 900, color: color || "#1971C2" }
          : {}
        }
      />
      <span style={{
        fontSize: isNumeric ? "clamp(9px, 2vw, 12px)" : "clamp(11px, 2.5vw, 15px)",
        fontWeight: 700,
        color: color || "var(--text)",
        textAlign: "center",
        lineHeight: 1.15,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        padding: "0 2px",
        opacity: isNumeric ? 0.65 : 1,
      }}>
        {item._label}
      </span>

      {/* Speak indicator */}
      <Volume2 size={11} strokeWidth={2} style={{
        position: "absolute", top: 6, right: 6,
        color: "var(--text-4)", pointerEvents: "none",
      }} />

      {/* Expand / fullscreen button */}
      <button
        onClick={handleExpand}
        aria-label="View fullscreen"
        style={{
          position: "absolute", bottom: 4, right: 4,
          width: 22, height: 22, borderRadius: 6,
          background: "transparent", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0,
          color: "var(--text-4)", opacity: 0.5,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <Maximize2 size={10} strokeWidth={2.5} />
      </button>
    </button>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default memo(function SymbolsPanel({ langCode = "en", onSpeak, vocabMode, ui }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null); // null = all
  const [fullscreenItem, setFullscreenItem] = useState(null);

  const handleCategoryToggle = useCallback((id) => {
    setActiveCategory(prev => prev === id ? null : id);
  }, []);

  const handleClearSearch = useCallback(() => setQuery(""), []);
  const handleCloseFullscreen = useCallback(() => setFullscreenItem(null), []);

  // Normalise all items into a unified shape with _label and _imageUrl
  const allItems = useMemo(() => {
    const result = [];

    // Vocabulary symbols
    for (const catId of VOCAB_CATEGORY_IDS.map(c => c.id)) {
      const data = VOCAB_DATA[catId] || [];
      for (const item of data) {
        result.push({
          id: item.id,
          emoji: item.emoji,
          _label: getVocabLabel(item, langCode),
          _imageUrl: getArasaacPictogramUrl(item),
          _source: "vocab",
          _category: catId,
        });
      }
    }

    return result;
  }, [langCode]);

  // Filter by category and search query
  const { items, color } = useMemo(() => {
    const q = query.trim().toLowerCase();

    let filtered = allItems;

    if (activeCategory) {
      filtered = filtered.filter(it => it._category === activeCategory);
    }

    if (q) {
      filtered = filtered.filter(it =>
        it._label.toLowerCase().includes(q) || it.emoji.includes(q)
      );
    }

    let catColor = "#495057";
    if (activeCategory) {
      const vocabTab = VOCAB_TABS.find(t => t.id === activeCategory);
      catColor = vocabTab?.color ?? "#495057";
    }

    return { items: filtered, color: catColor };
  }, [allItems, activeCategory, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* ── Fullscreen overlay ── */}
      {fullscreenItem && (
        <FullscreenView
          item={fullscreenItem}
          langCode={langCode}
          onSpeak={onSpeak}
          onClose={handleCloseFullscreen}
        />
      )}

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
          {VOCAB_CATEGORY_IDS.map(cat => {
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
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 20,
                  background: isActive ? `${cat.color}18` : "var(--surface)",
                  border: isActive ? `1.5px solid ${cat.color}` : "1.5px solid var(--sep)",
                  cursor: "pointer", transition: "all 0.12s ease",
                  WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
                  flexShrink: 0, minHeight: 36,
                }}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? cat.color : "var(--text-3)" }} />
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 600,
                  color: isActive ? cat.color : "var(--text-3)", whiteSpace: "nowrap",
                }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results grid ── */}
      {items.length > 0 ? (
        <div
          role="grid"
          aria-label="Symbols grid"
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridAutoRows: "min-content",
            gap: 8,
            padding: "10px 12px 88px",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
            alignContent: "start",
          }}
        >
          {items.map(item => (
            <SymbolCell
              key={item.id}
              item={item}
              color={color}
              onSpeak={onSpeak}
              onFullscreen={setFullscreenItem}
            />
          ))}
        </div>
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
