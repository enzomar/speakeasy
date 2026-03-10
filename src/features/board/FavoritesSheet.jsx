/**
 * FavoritesSheet — "fake L2" view listing favourite phrases.
 *
 * Looks like a sub-category page (gold theme, back arrow header)
 * and offers play / edit / remove actions on each favourite.
 */

import { memo } from "react";
import { ArrowLeft, Play, Pencil, Heart, HeartOff } from "lucide-react";

// ── colour constants (matches CategoryGrid favourites tile) ───────────────────
const COLOR   = "#F59F00";
const BG      = "#FFF9DB";

// ── Header (matches SubViewHeader / PickerHeader style) ───────────────────────

function FavHeader({ onBack, title }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: BG,
      borderBottom: "1px solid var(--sep)", flexShrink: 0,
    }}>
      <button
        onClick={onBack}
        aria-label="Back to home"
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: "var(--surface)", border: "1.5px solid var(--sep)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text)",
          WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
        }}
      >
        <ArrowLeft size={24} strokeWidth={2.2} />
      </button>
      <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">💛</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</span>
    </div>
  );
}

// ── Single favourite entry ────────────────────────────────────────────────────

function FavEntry({ item, onSpeak, onEdit, onRemove, leftHanded }) {
  return (
    <div style={{
      background:    "var(--surface)",
      borderRadius:  "var(--radius-md, 14px)",
      padding:       "12px 14px",
      display:       "flex",
      flexDirection: leftHanded ? "row-reverse" : "row",
      alignItems:    "center",
      gap:           10,
      boxShadow:     "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)}   style={actionBtn()}      aria-label="Edit">
          <Pencil size={15} strokeWidth={1.8} />
        </button>
        <button onClick={() => onSpeak(item.text)} style={actionBtn(true)} aria-label="Speak">
          <Play size={15} strokeWidth={2} fill="currentColor" />
        </button>
        <button onClick={() => onRemove(item.id)} style={actionBtn(false, true)} aria-label="Remove from favorites">
          <HeartOff size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.emoji && (
          <span style={{ fontSize: 20, marginRight: 6, verticalAlign: "middle" }} aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <span style={{
          fontSize: 15, fontWeight: 600, color: "var(--text)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textAlign: leftHanded ? "right" : "left",
        }}>
          {item.text}
        </span>
      </div>
    </div>
  );
}

function actionBtn(primary = false, danger = false) {
  return {
    width: 44, height: 44, borderRadius: "var(--radius-sm, 10px)",
    border: "none",
    background: primary ? "var(--tint)" : danger ? "rgba(255,59,48,0.08)" : "var(--bg)",
    color:      primary ? "#fff"        : danger ? "var(--red, #ff3b30)"  : "var(--tint)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "all 0.12s",
    WebkitTapHighlightColor: "transparent",
  };
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyFavorites({ ui }) {
  return (
    <div style={{ textAlign: "center", marginTop: 70, color: "var(--text-3)" }}>
      <Heart size={44} strokeWidth={1.2} style={{ marginBottom: 12, color: COLOR }} />
      <div style={{ fontWeight: 600, fontSize: 16 }}>
        {ui?.noFavorites ?? "No favorites yet"}
      </div>
      <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-4)" }}>
        {ui?.noFavoritesHint ?? "Tap the heart on the message bar to save a phrase here."}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function FavoritesSheet({ favorites, onBack, onSpeak, onEdit, onRemove, leftHanded = false, ui }) {
  const title = ui?.catFavorites?.replace("\n", " ") ?? "Favorites";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <FavHeader onBack={onBack} title={title} />

      <div style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg)",
        WebkitOverflowScrolling: "touch",
      }}>
        {/* Count badge */}
        {favorites.length > 0 && (
          <div style={{
            padding: "12px 14px 4px",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
            color: "var(--text-3)", textTransform: "uppercase",
          }}>
            {favorites.length} {favorites.length === 1
              ? (ui?.favoriteSingular ?? "phrase saved")
              : (ui?.favoritePlural   ?? "phrases saved")}
          </div>
        )}

        {/* List */}
        <div style={{ padding: "4px 14px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
          {favorites.length === 0
            ? <EmptyFavorites ui={ui} />
            : favorites.map((item, i) => (
                <div
                  key={item.id}
                  style={{ animation: i < 20 ? `fadeUp 0.18s ease ${(i % 20) * 0.03}s both` : "none" }}
                >
                  <FavEntry
                    item={item}
                    onSpeak={onSpeak}
                    onEdit={onEdit}
                    onRemove={onRemove}
                    leftHanded={leftHanded}
                  />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

export default memo(FavoritesSheet);
