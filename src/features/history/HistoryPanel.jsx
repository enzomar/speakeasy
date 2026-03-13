/**
 * HistoryPanel — list of past spoken utterances.
 * Native iOS-style: grouped cards, Lucide icons for actions.
 * Swipe left to reveal Edit + Delete (iOS-style swipe actions).
 */

import { memo, useState, useRef, useCallback } from "react";
import { Play, Pencil, Trash2, MessageCircle, Heart } from "lucide-react";
import ConfirmSheet from "../../shared/ui/ConfirmSheet";

// ── Swipe threshold & width ───────────────────────────────────────────────────
const SWIPE_ACTION_WIDTH = 120;  // total width of the hidden actions tray
const SWIPE_THRESHOLD    = 40;   // minimum drag to trigger open/close

function HistoryEntry({ item, isRecent, isFavorited, onReuse, onSpeak, onDeleteRequest, onToggleFavorite, leftHanded = false, ui }) {
  const timeLabel = item.updatedAt
    ? new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : (ui?.earlier ?? "Earlier");

  // ── Swipe state ─────────────────────────────────────────────────────────
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef  = useRef(0);
  const startYRef  = useRef(0);
  const openRef    = useRef(false);     // was already open when drag started?
  const lockedRef  = useRef(null);      // "h" | "v" | null — axis lock
  const movedRef   = useRef(false);     // did the pointer actually move?

  const handlePointerDown = useCallback((e) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    openRef.current   = offsetX !== 0;
    lockedRef.current = null;
    movedRef.current  = false;
    setSwiping(true);
  }, [offsetX]);

  const handlePointerMove = useCallback((e) => {
    if (!swiping) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Lock to horizontal or vertical after a small threshold
    if (lockedRef.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      lockedRef.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
    }
    if (lockedRef.current !== "h") return;

    movedRef.current = true;
    const base = openRef.current ? -SWIPE_ACTION_WIDTH : 0;
    const raw  = base + dx;
    // Clamp: allow slight overscroll on left swipe, never past 0
    const clamped = Math.min(0, Math.max(raw, -SWIPE_ACTION_WIDTH - 30));
    setOffsetX(clamped);
  }, [swiping]);

  const handlePointerEnd = useCallback(() => {
    if (!swiping) return;
    setSwiping(false);
    if (lockedRef.current !== "h" || !movedRef.current) {
      // No horizontal swipe — keep current state
      return;
    }
    // Snap open or closed
    if (openRef.current) {
      // Was open: close if dragged right past threshold
      setOffsetX(offsetX > -SWIPE_ACTION_WIDTH + SWIPE_THRESHOLD ? 0 : -SWIPE_ACTION_WIDTH);
    } else {
      // Was closed: open if dragged left past threshold
      setOffsetX(offsetX < -SWIPE_THRESHOLD ? -SWIPE_ACTION_WIDTH : 0);
    }
  }, [swiping, offsetX]);

  const closeSwipe = useCallback(() => setOffsetX(0), []);

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-md)",
      boxShadow: isRecent
        ? "0 0 0 2px rgba(0,122,255,0.2)"
        : "0 1px 3px rgba(0,0,0,0.04)",
      animation: isRecent ? "highlightEntry 0.6s ease" : "none",
    }}>
      {/* ── Swipe-reveal actions (behind the card) ── */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0,
        right: 0,
        width: SWIPE_ACTION_WIDTH,
        display: "flex",
        alignItems: "stretch",
        zIndex: 0,
      }}>
        <button
          onClick={() => { closeSwipe(); onReuse(item.text); }}
          aria-label="Edit"
          style={{
            flex: 1, border: "none",
            background: "var(--tint)",
            color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            cursor: "pointer",
            fontSize: 11, fontWeight: 700,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Pencil size={18} strokeWidth={2} />
          <span>{ui?.edit ?? "Edit"}</span>
        </button>
        <button
          onClick={() => { closeSwipe(); onDeleteRequest(item); }}
          aria-label="Delete"
          style={{
            flex: 1, border: "none",
            background: "#FF3B30",
            color: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            cursor: "pointer",
            fontSize: 11, fontWeight: 700,
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Trash2 size={18} strokeWidth={2} />
          <span>{ui?.delete ?? "Delete"}</span>
        </button>
      </div>

      {/* ── Foreground card (slides left on swipe) ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          display: "flex",
          flexDirection: leftHanded ? "row-reverse" : "row",
          alignItems: "center",
          gap: 10,
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.25s cubic-bezier(.32,1.1,.6,1)",
          touchAction: "pan-y",
          userSelect: "none",
          cursor: "grab",
        }}
      >
        {/* Visible actions: Favorite + Speak */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => onToggleFavorite(item)} style={favBtn(isFavorited)} aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}>
            <Heart size={15} strokeWidth={1.8} fill={isFavorited ? "currentColor" : "none"} />
          </button>
          <button onClick={() => onSpeak(item.text)} style={actionBtn(true)} aria-label="Speak">
            <Play size={15} strokeWidth={2} fill="currentColor" />
          </button>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: "var(--text)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textAlign: leftHanded ? "right" : "left",
          }}>
            {item.text}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, fontWeight: 500,
            textAlign: leftHanded ? "right" : "left",
          }}>
            {timeLabel}
          </div>
        </div>

        {/* Frequency badge */}
        <div style={{
          width: 32, height: 32, borderRadius: "var(--radius-sm)",
          background: "var(--tint-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "var(--tint)", flexShrink: 0,
        }}>
          {item.count}×
        </div>
      </div>
    </div>
  );
}

function favBtn(active) {
  return {
    width: 44, height: 44, borderRadius: "var(--radius-sm)",
    border: "none",
    background: active ? "rgba(255,59,48,0.10)" : "var(--bg)",
    color: active ? "#FF3B30" : "var(--text-3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
    WebkitTapHighlightColor: "transparent",
  };
}

function actionBtn(primary = false, danger = false) {
  return {
    width: 44, height: 44, borderRadius: "var(--radius-sm)",
    border: "none",
    background: primary ? "var(--tint)" : danger ? "rgba(255,59,48,0.08)" : "var(--bg)",
    color: primary ? "#fff" : danger ? "var(--red)" : "var(--tint)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "all 0.12s",
    WebkitTapHighlightColor: "transparent",
  };
}

function HistoryPanel({ history, recentId, onReuse, onSpeak, onDelete, onClearAll, favorites = [], onToggleFavorite, leftHanded = false, ui }) {
  const [confirm, setConfirm] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "favorites"
  const emptyTitle    = ui?.noHistory    ?? "No history yet";
  const emptySubtitle = ui?.noHistoryHint ?? "Every message you speak is saved here";
  const memLabel      = ui?.phrasesInMem
    ? ui.phrasesInMem(history.length).toUpperCase()
    : `${history.length} PHRASES IN MEMORY`;

  const favSet = new Set(favorites.map(f => f.text.toLowerCase()));

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "12px 14px 8px",
      }}>
        {/* Filter tabs: All / Favorites */}
        <div style={{ display: "flex", gap: 4, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--sep)" }}>
          {["all", "favorites"].map(f => (
            <button
              key={f}
              onClick={() => setHistoryFilter(f)}
              style={{
                padding: "4px 12px", border: "none",
                background: historyFilter === f ? "var(--tint)" : "var(--bg)",
                color: historyFilter === f ? "#fff" : "var(--text-3)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.03em",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {f === "all" ? (ui?.historyAll ?? "All") : (ui?.historyFavs ?? "★ Favorites")}
            </button>
          ))}
        </div>
        <span style={{
          fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.04em",
        }}>
          {memLabel}
        </span>
        {history.length > 0 && (
          <button
            onClick={() => setConfirm({
              action: onClearAll,
              title: ui?.confirmClearTitle ?? "Clear all history?",
              message: ui?.confirmClearMsg ?? "This will permanently delete all your saved phrases.",
              label: ui?.confirmYes ?? "Delete",
            })}
            style={toolbarBtn(true)}
          >
            <Trash2 size={13} strokeWidth={2} style={{ marginRight: 4 }} />
            {ui?.clear ?? "Clear"}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {(() => {
          const filtered = historyFilter === "favorites"
            ? history.filter(item => favSet.has(item.text.toLowerCase()))
            : history;
          if (filtered.length === 0) {
            const emptyMsg = historyFilter === "favorites"
              ? (ui?.noFavorites ?? "No favorites yet")
              : emptyTitle;
            const emptyHint = historyFilter === "favorites"
              ? (ui?.noFavoritesHint ?? "Tap the heart on the message bar to save a phrase here.")
              : emptySubtitle;
            return (
              <div style={{ textAlign: "center", marginTop: 70, color: "var(--text-3)" }}>
                <MessageCircle size={44} strokeWidth={1.2} style={{ marginBottom: 12, color: "var(--text-4)" }} />
                <div style={{ fontWeight: 600, fontSize: 16 }}>{emptyMsg}</div>
                <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-4)" }}>{emptyHint}</div>
              </div>
            );
          }
          return filtered.map((item, i) => (
            <div
              key={item.id}
              style={{ animation: i < 12 ? `fadeUp 0.18s ease ${(i % 12) * 0.04}s both` : "none" }}
            >
              <HistoryEntry
                item={item}
                isRecent={item.id === recentId}
                isFavorited={favSet.has(item.text.toLowerCase())}
                onReuse={onReuse}
                onSpeak={onSpeak}
                onToggleFavorite={onToggleFavorite}
                onDeleteRequest={(entry) => setConfirm({
                  action: () => onDelete(entry.id),
                  title: ui?.confirmDeleteHistoryTitle ?? "Delete this phrase?",
                  message: typeof ui?.confirmDeleteHistoryMsg === "function" ? ui.confirmDeleteHistoryMsg(entry.text) : `Remove "${entry.text}" from history?`,
                  label: ui?.confirmYes ?? "Delete",
                })}
                leftHanded={leftHanded}
                ui={ui}
              />
            </div>
          ));
        })()}
      </div>

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
}

function toolbarBtn(danger = false) {
  return {
    padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "none",
    background: danger ? "rgba(255,59,48,0.08)" : "var(--tint-soft)",
    color: danger ? "var(--red)" : "var(--tint)",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center",
    WebkitTapHighlightColor: "transparent",
  };
}

export default memo(HistoryPanel);
