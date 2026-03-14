/**
 * BoardSelector — Horizontal scrolling chip bar for switching contextual boards.
 *
 * Shows all boards as tappable chips in a single scrollable row.
 * The active board is visually highlighted.
 *
 * Props:
 *   boards       — array of board definitions
 *   currentBoard — the currently active board
 *   onSelect     — (boardId: string) => void
 *   ui           — UI string translations
 */

import { memo, useRef, useEffect } from "react";

export default memo(function BoardSelector({ boards, currentBoard, onSelect, ui }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll to keep the active chip visible
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const chip = activeRef.current;
      const left = chip.offsetLeft - container.offsetLeft - 12;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [currentBoard.id]);

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Select board"
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 12px",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        flexShrink: 0,
        background: "var(--bg)",
      }}
    >
      {boards.map(board => {
        const isActive = board.id === currentBoard.id;
        return (
          <button
            key={board.id}
            ref={isActive ? activeRef : undefined}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect?.(board.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 20,
              background: isActive ? "var(--tint-soft)" : "var(--surface)",
              border: isActive ? "1.5px solid var(--tint)" : "1.5px solid var(--sep)",
              cursor: "pointer",
              transition: "all 0.12s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              flexShrink: 0,
              minHeight: 36,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{board.emoji}</span>
            <span style={{
              fontSize: 12,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? "var(--tint)" : "var(--text-3)",
              whiteSpace: "nowrap",
            }}>
              {ui?.[`board_${board.id}`] ?? board.label}
            </span>
          </button>
        );
      })}
    </div>
  );
});
