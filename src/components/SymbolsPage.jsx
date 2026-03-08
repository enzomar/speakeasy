/**
 * SymbolsPage — manage symbols: add custom symbols, hide/unhide built-in ones.
 * Accessible as its own nav tab.
 */

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, X, Eye, EyeOff, Search as SearchIcon } from "lucide-react";
import { SYMBOLS, CATEGORIES } from "../data/symbols";
import { getSymbolLabel, getCategoryName } from "../data/languages";
import ConfirmSheet from "./ConfirmSheet";

// ── Add / Edit sheet ──────────────────────────────────────────────────────────

function SymbolSheet({ item, categories, onSave, onCancel, ui }) {
  const [label,    setLabel]    = useState(item?.label ?? "");
  const [emoji,    setEmoji]    = useState(item?.emoji ?? "");
  const [category, setCategory] = useState(item?.category ?? "social");
  const inputRef = useRef(null);
  const isNew = !item?.id;

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave(trimmed, emoji.trim(), category);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "fadeIn 0.15s ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 540,
          background: "var(--surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          padding: "12px 20px 40px",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
          animation: "slideUp 0.22s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sep)", margin: "0 auto 20px" }} />

        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 20 }}>
          {isNew ? (ui?.addSymbolTitle ?? "Add symbol") : (ui?.editSymbolTitle ?? "Edit symbol")}
        </div>

        {/* Emoji + label row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="⭐"
            maxLength={4}
            style={{
              width: 60, flexShrink: 0,
              padding: "12px 8px",
              borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--sep)",
              background: "var(--bg)",
              fontSize: 24, textAlign: "center",
              outline: "none", color: "var(--text)",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={handleKey}
            placeholder={ui?.symbolLabelPlaceholder ?? "Symbol label…"}
            style={{
              flex: 1, padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--sep)",
              background: "var(--bg)",
              fontSize: 16, fontWeight: 500,
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Category picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 8 }}>
            {ui?.category ?? "Category"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {categories.filter(c => c.id !== "all").map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: category === c.id ? `2px solid ${c.color}` : "1px solid var(--sep)",
                  background: category === c.id ? c.bg : "var(--bg)",
                  color: category === c.id ? c.color : "var(--text-3)",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "14px",
              borderRadius: "var(--radius-lg)", border: "0.5px solid var(--sep)",
              background: "var(--bg)", color: "var(--text-2)",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
          >{ui?.cancel ?? "Cancel"}</button>
          <button
            onClick={handleSave}
            disabled={!label.trim()}
            style={{
              flex: 2, padding: "14px",
              borderRadius: "var(--radius-lg)", border: "none",
              background: label.trim() ? "var(--tint)" : "var(--sep)",
              color: label.trim() ? "#fff" : "var(--text-4)",
              fontSize: 15, fontWeight: 700,
              cursor: label.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            {ui?.save ?? "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Symbol row ────────────────────────────────────────────────────────────────

function SymbolRow({ symbol, isCustom, isHidden, displayLabel, catColor, onHide, onUnhide, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: isHidden ? "var(--bg)" : "var(--surface)",
      borderRadius: "var(--radius-md)",
      padding: "10px 14px",
      opacity: isHidden ? 0.5 : 1,
      transition: "opacity 0.15s",
    }}>
      {/* Emoji */}
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, width: 30, textAlign: "center" }}>
        {symbol.emoji}
      </span>

      {/* Label */}
      <span style={{
        flex: 1, fontSize: 15, fontWeight: 600, color: "var(--text)",
        lineHeight: 1.3,
      }}>
        {displayLabel}
      </span>

      {/* Category dot */}
      <span style={{
        fontSize: 11, fontWeight: 600, color: catColor,
        padding: "2px 8px", borderRadius: 10,
        background: isHidden ? "transparent" : `${catColor}18`,
        flexShrink: 0,
      }}>
        {symbol.category}
      </span>

      {/* Hide/unhide for built-in */}
      {!isCustom && (
        <button
          onClick={() => isHidden ? onUnhide(symbol.id) : onHide(symbol.id)}
          aria-label={isHidden ? "Show symbol" : "Hide symbol"}
          style={actionBtnStyle()}
        >
          {isHidden ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
        </button>
      )}

      {/* Delete for custom */}
      {isCustom && (
        <button
          onClick={() => onDelete(symbol.id)}
          aria-label="Delete symbol"
          style={actionBtnStyle("var(--red, #FF3B30)")}
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

function actionBtnStyle(color) {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36,
    borderRadius: "var(--radius-sm)",
    border: "0.5px solid var(--sep)",
    background: "var(--bg)",
    color: color || "var(--text-2)",
    cursor: "pointer",
    flexShrink: 0,
  };
}

// ── SymbolsPage ───────────────────────────────────────────────────────────────

export default memo(function SymbolsPage({
  custom = [],
  hidden = [],
  onAddSymbol,
  onRemoveSymbol,
  onHideSymbol,
  onUnhideSymbol,
  langCode = "en",
  ui,
}) {
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [confirm, setConfirm] = useState(null);

  const openAdd = useCallback(() => setEditItem({ id: null, label: "", emoji: "", category: "social" }), []);
  const closeEdit = useCallback(() => setEditItem(null), []);

  const handleSave = useCallback((label, emoji, category) => {
    onAddSymbol(label, emoji, category);
    closeEdit();
  }, [onAddSymbol, closeEdit]);

  // Merge built-in + custom symbols
  const allSymbols = useMemo(() => {
    const builtIn = SYMBOLS.map(s => ({ ...s, _custom: false }));
    const cust = custom.map(s => ({ ...s, _custom: true }));
    return [...cust, ...builtIn];
  }, [custom]);

  // Filter
  const filtered = useMemo(() => {
    let list = allSymbols;
    if (filterCat !== "all") {
      list = list.filter(s => s.category === filterCat);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        s.label.toLowerCase().includes(q) ||
        s.emoji.includes(q) ||
        getSymbolLabel(s, langCode).toLowerCase().includes(q)
      );
    }
    return list;
  }, [allSymbols, filterCat, search, langCode]);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const categories = CATEGORIES;

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: "var(--bg)",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5,
        background: "var(--bg)",
        padding: "12px 16px 0",
      }}>
        {/* Title + Add */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
        }}>
          <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            {ui?.symbols ?? "Symbols"}
          </span>
          <span style={{
            background: "var(--tint)", color: "#fff",
            borderRadius: 10, fontSize: 11, fontWeight: 700,
            padding: "2px 8px",
          }}>
            {filtered.length}
          </span>
          <button
            onClick={openAdd}
            aria-label="Add symbol"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 5, padding: "8px 14px",
              borderRadius: "var(--radius-xl)", border: "none",
              background: "var(--tint)", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            {ui?.add ?? "Add"}
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          border: "0.5px solid var(--sep)",
          padding: "8px 12px",
          marginBottom: 10,
        }}>
          <SearchIcon size={16} strokeWidth={1.8} style={{ color: "var(--text-4)", flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ui?.searchSymbols ?? "Search symbols…"}
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", fontSize: 15, fontWeight: 500,
              color: "var(--text)", fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", display: "flex", padding: 0 }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto",
          paddingBottom: 12, scrollbarWidth: "none",
        }}>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 20,
                border: filterCat === c.id ? `2px solid ${c.color}` : "1px solid var(--sep)",
                background: filterCat === c.id ? c.bg : "var(--surface)",
                color: filterCat === c.id ? c.color : "var(--text-3)",
                fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {getCategoryName(c.id, langCode)}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ padding: "0 14px 40px", display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            fontSize: 14, color: "var(--text-4)", fontStyle: "italic",
          }}>
            {ui?.noSymbolsMatch ?? "No symbols match your search."}
          </div>
        )}
        {filtered.map(s => {
          const cat = categories.find(c => c.id === s.category);
          return (
            <SymbolRow
              key={s.id}
              symbol={s}
              isCustom={s._custom}
              isHidden={hiddenSet.has(s.id)}
              displayLabel={s._custom ? s.label : getSymbolLabel(s, langCode)}
              catColor={cat?.color ?? "var(--tint)"}
              onHide={onHideSymbol}
              onUnhide={onUnhideSymbol}
              onDelete={(id) => setConfirm({
                action: () => onRemoveSymbol(id),
                title: ui?.confirmDeleteSymbolTitle ?? "Delete custom symbol?",
                message: ui?.confirmDeleteSymbolMsg ?? `Remove "${s.label}" from your symbols?`,
                label: ui?.confirmYes ?? "Delete",
              })}
            />
          );
        })}
      </div>

      {/* Add sheet */}
      {editItem !== null && (
        <SymbolSheet
          item={editItem}
          categories={categories}
          onSave={handleSave}
          onCancel={closeEdit}
          ui={ui}
        />
      )}

      {confirm && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          cancelLabel={ui?.confirmCancel ?? "Cancel"}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
});
