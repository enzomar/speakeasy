/**
 * CategoryGrid — 3×3 large category tiles for the AAC home screen.
 *
 * Design principles:
 *  • Very large touch targets (each tile fills 1/3 of screen width & height)
 *  • High-contrast emoji + short uppercase label
 *  • Minimal cognitive load — 9 clearly-distinct categories
 *  • Flat, rounded cards with soft category-tinted backgrounds
 *  • Works on phone and tablet via CSS grid scaling
 */

import { memo } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const HOME_CATEGORIES = [
  { id: "feel",      emoji: "❤️",  label: "FEEL",           color: "#E03131", bg: "#FFF5F5", mapTo: "feelings" },
  { id: "need",      emoji: "🍎",  label: "NEED",           color: "#2F9E44", bg: "#EBFBEE", mapTo: "food" },
  { id: "people",    emoji: "👥",  label: "PEOPLE",         color: "#1971C2", bg: "#E7F5FF", mapTo: "people" },
  { id: "do",        emoji: "👉",  label: "DO",             color: "#E8590C", bg: "#FFF4E6", mapTo: "actions" },
  { id: "talk",      emoji: "💬",  label: "TALK",           color: "#0C8599", bg: "#E6FCF5", mapTo: "social" },
  { id: "place",     emoji: "📍",  label: "PLACE",          color: "#7048E8", bg: "#F3F0FF", mapTo: "places" },
  { id: "quick",     emoji: "⭐",  label: "QUICK\nPHRASES", color: "#E67700", bg: "#FFF9DB", action: "quick" },
  { id: "emergency", emoji: "🚨",  label: "EMERGENCY",      color: "#C92A2A", bg: "#FFE3E3", action: "emergency" },
  { id: "favorites", emoji: "💛",  label: "FAVORITES",      color: "#F59F00", bg: "#FFF9DB", action: "favorites" },
];

export default memo(function CategoryGrid({ onSelect }) {
  return (
    <div
      role="grid"
      aria-label="Symbol categories"
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: 10,
        padding: "10px 12px 16px",
        overflow: "hidden",
      }}
    >
      {HOME_CATEGORIES.map(cat => (
        <button
          key={cat.id}
          role="gridcell"
          onClick={() => onSelect(cat)}
          aria-label={cat.label.replace("\n", " ")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: cat.bg,
            border: "none",
            borderRadius: 20,
            cursor: "pointer",
            transition: "transform 0.1s ease, box-shadow 0.15s ease",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            minHeight: 0,
            boxShadow: `0 1px 4px ${cat.color}15`,
          }}
        >
          <span
            style={{ fontSize: "clamp(30px, 7vw, 48px)", lineHeight: 1 }}
            aria-hidden="true"
          >
            {cat.emoji}
          </span>
          <span style={{
            fontSize: "clamp(12px, 2.8vw, 17px)",
            fontWeight: 800,
            color: cat.color,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: "0.04em",
            whiteSpace: "pre-line",
            textTransform: "uppercase",
          }}>
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
});
