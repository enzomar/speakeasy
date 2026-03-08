/**
 * SymbolButton — a single tappable tile on the AAC board.
 * Native-feeling card with emoji (AAC content) and label.
 * displayMode: "both" | "icon" | "text"
 */

import { memo, useState } from "react";

export default memo(function SymbolButton({
  symbol, color, bg, onTap,
  size = "normal",
  displayLabel,
  displayMode = "both",
}) {
  const [pressed, setPressed] = useState(false);

  const label    = displayLabel ?? symbol.label;
  const small    = size === "small";
  const iconOnly = displayMode === "icon";
  const textOnly = displayMode === "text";

  const shared = {
    border:   "none",
    background: pressed ? color + "28" : bg ?? "var(--surface)",
    cursor:   "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    transform: pressed ? "scale(0.93)" : "scale(1)",
    transition: "transform 0.09s ease, background 0.09s ease",
    boxShadow: pressed
      ? "0 1px 2px rgba(0,0,0,0.06)"
      : "0 2px 6px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
  };

  const pointers = {
    onPointerDown:   () => setPressed(true),
    onPointerUp:     () => setPressed(false),
    onPointerLeave:  () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  };

  /* ── Text-only: horizontal pill ── */
  if (textOnly) {
    return (
      <button
        aria-label={label}
        onClick={() => onTap(label)}
        {...pointers}
        style={{
          ...shared,
          width:        "100%",
          padding:      "11px 12px",
          borderRadius: "var(--radius-md)",
          fontSize:     14,
          fontWeight:   700,
          color:        "var(--text)",
          textAlign:    "center",
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </button>
    );
  }

  /* ── Icon-only or Icon+Text square tile ── */
  const dim     = iconOnly ? (small ? 68 : 80) : (small ? 80 : 100);
  const emojiSz = iconOnly ? (small ? 32 : 40) : (small ? 30 : 42);
  const labelSz = small ? 11 : 13;

  return (
    <button
      aria-label={label}
      onClick={() => onTap(label)}
      {...pointers}
      style={{
        ...shared,
        width:          dim,
        height:         dim,
        borderRadius:   "var(--radius-lg)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            3,
        padding:        0,
        flexShrink:     0,
      }}
    >
      {/* Emoji */}
      <span
        role="img"
        aria-hidden="true"
        style={{
          fontSize:   emojiSz,
          lineHeight: 1,
          fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
        }}
      >
        {symbol.emoji}
      </span>

      {/* Label — hidden in icon-only mode */}
      {!iconOnly && (
        <span style={{
          fontSize:   labelSz,
          fontWeight: 700,
          color:      "var(--text)",
          textAlign:  "center",
          lineHeight: 1.2,
          padding:    "0 5px",
          wordBreak:  "break-word",
        }}>
          {label}
        </span>
      )}
    </button>
  );
});
