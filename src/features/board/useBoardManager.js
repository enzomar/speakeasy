/**
 * BoardManager — Manages contextual board selection for SpeakEasy AAC.
 *
 * Responsibilities:
 *   • Lists all available boards
 *   • Loads/switches the active board
 *   • Persists the selected board in localStorage
 *   • Returns the ordered category list for the active board
 *
 * The engine is never modified — BoardManager only controls which L1
 * categories appear on the home grid and in what order.
 *
 * Usage:
 *   import { useBoard } from './useBoardManager';
 *
 *   const { currentBoard, boards, setBoard } = useBoard();
 *   // currentBoard.categories → ["feel", "need", "do", ...]
 */

import { useState, useCallback, useMemo } from "react";
import BOARDS from "../../data/boards/index.js";

const STORAGE_KEY = "speakeasy_board";
const DEFAULT_BOARD_ID = "generic";

// ── Fast lookup ───────────────────────────────────────────────────────────────

const BOARD_MAP = new Map(BOARDS.map(b => [b.id, b]));

/**
 * Get a board definition by id, falling back to "generic".
 */
export function getBoard(boardId) {
  return BOARD_MAP.get(boardId) ?? BOARD_MAP.get(DEFAULT_BOARD_ID);
}

/**
 * Get all available boards.
 */
export function getBoards() {
  return BOARDS;
}

// ── React hook ────────────────────────────────────────────────────────────────

/**
 * useBoard — React hook for board selection state.
 *
 * Returns:
 *   boards       — full list of available boards
 *   currentBoard — the currently selected board definition
 *   setBoardId   — (boardId: string) => void — switch board (persisted)
 */
export function useBoard() {
  const [boardId, setBoardIdState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && BOARD_MAP.has(stored)) return stored;
    } catch { /* SSR or blocked storage */ }
    return DEFAULT_BOARD_ID;
  });

  const setBoardId = useCallback((id) => {
    const resolved = BOARD_MAP.has(id) ? id : DEFAULT_BOARD_ID;
    setBoardIdState(resolved);
    try { localStorage.setItem(STORAGE_KEY, resolved); } catch { /* ignore */ }
  }, []);

  const currentBoard = useMemo(() => getBoard(boardId), [boardId]);

  return {
    boards: BOARDS,
    currentBoard,
    setBoardId,
  };
}
