/**
 * FavoritesBar — always-visible horizontal strip of saved favourites.
 * Sits between CategoryFilter and SymbolBoard.
 * Shows top favourites inline (no expand needed). Tap to insert,
 * tap speaker icon to speak directly (1-tap).
 * Editing/adding is done on the dedicated Favourites page.
 */

import { memo, useState } from "react";
import { Star, ChevronDown, Volume2 } from "lucide-react";

/** How many favourites to always show inline (no expand needed) */
const INLINE_COUNT = 5;

// ── Favourite card (tap to insert, speaker icon to speak) ─────────────────────

function FavCard({ fav, onTap, onSpeak }) {
  const isPhrase = fav.text.trim().includes(" ");
  return (
    <div style={{
      flexShrink: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 4,
      padding: "6px 10px",
      minWidth: 70, maxWidth: 130,
      borderRadius: "var(--radius-lg)",
      border: "0.5px solid var(--sep)",
      background: "var(--surface)",
      WebkitTapHighlightColor: "transparent",
      transition: "transform 0.12s ease, box-shadow 0.12s ease",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      <button
        onClick={() => onTap(fav.text)}
        aria-label={`Insert: ${fav.text}`}
        style={{
          border: "none", background: "none", cursor: "pointer",
          padding: 0, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 2, width: "100%",
          WebkitTapHighlightColor: "transparent",
        }}
        onPointerDown={e => { e.currentTarget.parentElement.style.transform = "scale(0.93)"; }}
        onPointerUp={e => { e.currentTarget.parentElement.style.transform = "scale(1)"; }}
        onPointerLeave={e => { e.currentTarget.parentElement.style.transform = "scale(1)"; }}
      >
        {fav.emoji && (
          <span style={{ fontSize: 18, lineHeight: 1 }}>{fav.emoji}</span>
        )}
        <span style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          textAlign: "center", lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
        }}>
          {fav.text}
        </span>
      </button>
      {/* Direct speak — only for multi-word phrases (saves 1+ taps) */}
      {isPhrase && onSpeak && (
        <button
          onClick={(e) => { e.stopPropagation(); onSpeak(fav.text); }}
          aria-label={`Speak: ${fav.text}`}
          style={{
            border: "none", background: "var(--green)",
            borderRadius: 10, padding: "3px 6px",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", marginTop: 2,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Volume2 size={11} strokeWidth={2.2} style={{ color: "#fff" }} />
        </button>
      )}
    </div>
  );
}

// ── FavoritesBar ──────────────────────────────────────────────────────────────

export default memo(function FavoritesBar({
  favorites = [],
  onTap,
  onSpeak,
}) {
  const [expanded, setExpanded] = useState(false);

  if (favorites.length === 0) return null;

  const inlineFavs = favorites.slice(0, INLINE_COUNT);
  const extraFavs  = favorites.slice(INLINE_COUNT);                 
  const hasMore    = extraFavs.length > 0;

  return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      flexShrink: 0,
    }}>
      {/* ── Always-visible inline favourites ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "6px 14px",
        gap: 8,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        <Star
          size={14}
          strokeWidth={2.2}
          fill="var(--orange, #FF9500)"
          style={{ color: "var(--orange, #FF9500)", flexShrink: 0 }}
        />
        {inlineFavs.map(fav => (
          <FavCard key={fav.id} fav={fav} onTap={onTap} onSpeak={onSpeak} />
        ))}
        {/* Expand/collapse toggle — only if more than INLINE_COUNT */}
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label="Show more favourites"
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
              padding: "6px 10px", borderRadius: "var(--radius-lg)",
              border: "0.5px solid var(--sep)", background: "var(--elevated)",
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: "var(--text-3)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            +{extraFavs.length}
            <ChevronDown
              size={14} strokeWidth={2}
              style={{
                transition: "transform 0.2s ease",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>
        )}
      </div>

      {/* ── Expanded overflow strip ── */}
      {expanded && hasMore && (
        <div style={{
          padding: "2px 14px 10px",
          animation: "fadeUp 0.15s ease both",
        }}>
          <div style={{
            display: "flex", gap: 10,
            overflowX: "auto", overflowY: "visible",
            paddingBottom: 4, paddingTop: 4,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}>
            {extraFavs.map(fav => (
              <FavCard key={fav.id} fav={fav} onTap={onTap} onSpeak={onSpeak} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
