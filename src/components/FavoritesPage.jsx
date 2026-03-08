/**
 * FavoritesPage — dedicated management page for saved favourites.
 * Accessible as its own nav tab (⭐).
 * Features: add, edit, delete, reorder (↑ ↓).
 */

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Star, Plus, Pencil, Trash2, Check, ChevronUp, ChevronDown } from "lucide-react";
import ConfirmSheet from "./ConfirmSheet";

// ── Edit / Add sheet ──────────────────────────────────────────────────────────

function EditSheet({ item, onSave, onCancel, ui }) {
  const [text,  setText]  = useState(item?.text  ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "");
  const inputRef = useRef(null);
  const isNew = !item?.id;

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed, emoji.trim());
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
          {isNew ? (ui?.favAddTitle ?? "Add favourite") : (ui?.favEditTitle ?? "Edit favourite")}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {/* Emoji */}
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="😊"
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
          {/* Text */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={ui?.favTextPlaceholder ?? "Word, phrase or sentence…"}
            rows={2}
            style={{
              flex: 1, padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--sep)",
              background: "var(--bg)",
              fontSize: 16, fontWeight: 500,
              color: "var(--text)",
              outline: "none", resize: "none",
              fontFamily: "inherit", lineHeight: 1.4,
            }}
          />
        </div>

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
            disabled={!text.trim()}
            style={{
              flex: 2, padding: "14px",
              borderRadius: "var(--radius-lg)", border: "none",
              background: text.trim() ? "var(--tint)" : "var(--sep)",
              color: text.trim() ? "#fff" : "var(--text-4)",
              fontSize: 15, fontWeight: 700,
              cursor: text.trim() ? "pointer" : "default",
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

// ── Row ───────────────────────────────────────────────────────────────────────

function FavRow({ fav, index, total, onEdit, onDelete, onMove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--surface)",
      borderRadius: "var(--radius-md)",
      padding: "12px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Emoji */}
      {fav.emoji ? (
        <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{fav.emoji}</span>
      ) : (
        <Star size={18} strokeWidth={1.8} style={{ color: "var(--orange, #FF9500)", flexShrink: 0 }} />
      )}

      {/* Text */}
      <span style={{
        flex: 1, fontSize: 15, fontWeight: 600, color: "var(--text)",
        lineHeight: 1.3, wordBreak: "break-word",
      }}>
        {fav.text}
      </span>

      {/* Reorder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        <button
          onClick={() => onMove(fav.id, "up")}
          disabled={index === 0}
          aria-label="Move up"
          style={reorderBtn(index === 0)}
        >
          <ChevronUp size={13} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => onMove(fav.id, "down")}
          disabled={index === total - 1}
          aria-label="Move down"
          style={reorderBtn(index === total - 1)}
        >
          <ChevronDown size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(fav)}
        aria-label="Edit"
        style={actionBtn("var(--tint)")}
      >
        <Pencil size={15} strokeWidth={1.8} />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(fav.id)}
        aria-label="Delete"
        style={actionBtn("var(--red, #FF3B30)")}
      >
        <Trash2 size={15} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function reorderBtn(disabled) {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28,
    borderRadius: 6, border: "0.5px solid var(--sep)",
    background: "var(--bg)",
    color: disabled ? "var(--text-4)" : "var(--text-2)",
    cursor: disabled ? "default" : "pointer",
    padding: 0,
  };
}

function actionBtn() {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36,
    borderRadius: "var(--radius-sm)",
    border: "0.5px solid var(--sep)",
    background: "var(--bg)",
    color: "var(--text-2)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "color 0.12s, background 0.12s",
  };
}

// ── FavoritesPage ─────────────────────────────────────────────────────────────

export default memo(function FavoritesPage({
  favorites = [],
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  ui,
}) {
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const openAdd  = useCallback(() => setEditItem({ id: null, text: "", emoji: "" }), []);
  const openEdit = useCallback((fav) => setEditItem({ ...fav }), []);
  const closeEdit = useCallback(() => setEditItem(null), []);

  const handleSave = useCallback((text, emoji) => {
    if (editItem?.id == null) {
      onAdd(text, emoji);
    } else {
      onUpdate(editItem.id, text, emoji);
    }
    closeEdit();
  }, [editItem, onAdd, onUpdate, closeEdit]);

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      background: "var(--bg)",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* ── Page header ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px 16px 10px",
        gap: 10,
      }}>
        <Star
          size={20} strokeWidth={2}
          fill={favorites.length > 0 ? "var(--orange, #FF9500)" : "none"}
          style={{ color: "var(--orange, #FF9500)", flexShrink: 0 }}
        />
        <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
          {ui?.favourites ?? "Favourites"}
        </span>
        {/* Count */}
        {favorites.length > 0 && (
          <span style={{
            background: "var(--orange, #FF9500)", color: "#fff",
            borderRadius: 10, fontSize: 11, fontWeight: 700,
            padding: "2px 8px",
          }}>
            {favorites.length}
          </span>
        )}
        {/* Add button */}
        <button
          onClick={openAdd}
          aria-label="Add favourite"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 5,
            padding: "8px 14px",
            borderRadius: "var(--radius-xl)",
            border: "none",
            background: "var(--tint)",
            color: "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          {ui?.add ?? "Add"}
        </button>
      </div>

      {/* ── List ── */}
      <div style={{ padding: "4px 14px 40px", display: "flex", flexDirection: "column", gap: 8 }}>
        {favorites.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            fontSize: 14, color: "var(--text-4)", fontStyle: "italic",
          }}>
            {ui?.favEmpty ?? "No favourites yet — tap ★ on the board while composing a message to save it."}
          </div>
        )}
        {favorites.map((fav, idx) => (
          <FavRow
            key={fav.id}
            fav={fav}
            index={idx}
            total={favorites.length}
            onEdit={openEdit}
            onDelete={(id) => setConfirm({
              action: () => onDelete(id),
              title: ui?.confirmDeleteFavoriteTitle ?? "Delete favourite?",
              message: ui?.confirmDeleteFavoriteMsg ?? `Remove "${fav.text}" from favourites?`,
              label: ui?.confirmYes ?? "Delete",
            })}
            onMove={onMove}
          />
        ))}
      </div>

      {/* Edit / Add sheet */}
      {editItem !== null && (
        <EditSheet
          item={editItem}
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
