/**
 * CoreWordBar — Always-visible core vocabulary strip.
 *
 * Inspired by TD Snap Core First: a small set of high-frequency words
 * that make up ~80% of daily communication, placed in a fixed 2-row grid
 * so motor memory can develop.
 *
 * Design principles:
 *  • Always visible on the board (even when drilled into a category)
 *  • Fixed 2-row layout — words NEVER move (motor planning consistency)
 *  • Large touch targets (min 48×44 px)
 *  • High contrast, minimal visual noise
 *  • One tap adds the word to the message bar → AI predicts the rest
 *  • Sentence starters (multi-word) reduce taps by 50%
 *
 * Typical rapid sentence flows:
 *  • "I want" (1 tap starter) → AI suggests "I want water" → tap (2nd) → done
 *  • "help" (1 tap) → AI suggests "I need help please" → tap → done
 *  • "I" (1) → "go" (2) → AI "I want to go home" → tap (3) → done
 */

import { memo, useCallback } from "react";
import { getArasaacPictogramUrl, getArasaacPictogramDescription } from "../../data/arasaac";
import SymbolGlyph from "../../shared/ui/SymbolGlyph";

// ── Core vocabulary ──────────────────────────────────────────────────────────
// Based on AAC core word research (Banajee, Dicarlo & Stricklin, 2003):
// ~50 words account for 80%+ of daily communication.
// We pick the top 16 + 4 sentence starters for the 2-row bar.

/**
 * Row 1: Subject pronouns + highest-frequency verbs
 * Row 2: Modifiers, social words + essential references
 *
 * Optimised from a non-verbal-user perspective (AAC frequency research):
 *  - "that" replaces "feel" → pointing/reference is higher single-word freq;
 *    "feel" is reachable via FEEL category and "I feel" sentence starter
 *  - "my" replaces "it" → possession ("my turn", "my food", "my bag")
 *    is far more common than the vague pronoun "it"
 */
export const CORE_WORDS = [
  // ── Row 1: Subjects & Verbs ─────────────────────────
  { id: "cw_I",         emoji: "👤", label: "I",         row: 1 },
  { id: "cw_you",       emoji: "👆", label: "you",       row: 1 },
  { id: "cw_want",      emoji: "🙋", label: "want",      row: 1 },
  { id: "cw_need",      emoji: "💡", label: "need",      row: 1 },
  { id: "cw_go",        emoji: "🚶", label: "go",        row: 1 },
  { id: "cw_like",      emoji: "👍", label: "like",      row: 1 },
  { id: "cw_help",      emoji: "🆘", label: "help",      row: 1 },
  { id: "cw_that",      emoji: "👉", label: "that",      row: 1 },   // ★ replaces "feel" — deictic pointing

  // ── Row 2: Modifiers & Social ────────────────────────
  { id: "cw_not",       emoji: "🚫", label: "not",       row: 2 },
  { id: "cw_more",      emoji: "➕", label: "more",      row: 2 },
  { id: "cw_stop",      emoji: "✋", label: "stop",      row: 2 },
  { id: "cw_yes",       emoji: "✅", label: "yes",       row: 2 },
  { id: "cw_no",        emoji: "❌", label: "no",        row: 2 },
  { id: "cw_please",    emoji: "🙏", label: "please",    row: 2 },
  { id: "cw_my",        emoji: "🫳", label: "my",        row: 2 },   // ★ replaces "it" — possession
  { id: "cw_done",      emoji: "🏁", label: "done",      row: 2 },
];



// ── Translations ──────────────────────────────────────────────────────────────

const CW_TRANSLATIONS = {
  es: {
    cw_I: "yo", cw_you: "tú", cw_want: "quiero", cw_need: "necesito",
    cw_go: "ir", cw_like: "me gusta", cw_help: "ayuda", cw_that: "eso",
    cw_not: "no", cw_more: "más", cw_stop: "para", cw_yes: "sí",
    cw_no: "no", cw_please: "por favor", cw_my: "mi", cw_done: "listo",
  },
  fr: {
    cw_I: "je", cw_you: "tu", cw_want: "veux", cw_need: "besoin",
    cw_go: "aller", cw_like: "aime", cw_help: "aide", cw_that: "ça",
    cw_not: "pas", cw_more: "plus", cw_stop: "arrête", cw_yes: "oui",
    cw_no: "non", cw_please: "s'il te plaît", cw_my: "mon", cw_done: "fini",
  },
  it: {
    cw_I: "io", cw_you: "tu", cw_want: "voglio", cw_need: "ho bisogno",
    cw_go: "andare", cw_like: "mi piace", cw_help: "aiuto", cw_that: "quello",
    cw_not: "non", cw_more: "ancora", cw_stop: "ferma", cw_yes: "sì",
    cw_no: "no", cw_please: "per favore", cw_my: "mio", cw_done: "finito",
  },
  pt: {
    cw_I: "eu", cw_you: "tu", cw_want: "quero", cw_need: "preciso",
    cw_go: "ir", cw_like: "gosto", cw_help: "ajuda", cw_that: "isso",
    cw_not: "não", cw_more: "mais", cw_stop: "para", cw_yes: "sim",
    cw_no: "não", cw_please: "por favor", cw_my: "meu", cw_done: "pronto",
  },
};



/** Get translated label for a core word */
export function getCoreWordLabel(item, langCode) {
  if (langCode === "en" || !item?.id) return item?.label ?? "";
  return CW_TRANSLATIONS[langCode]?.[item.id] ?? item.label;
}



// ── Component ─────────────────────────────────────────────────────────────────

function CoreWordButton({ item, langCode, color, onTap }) {
  const label = getCoreWordLabel(item, langCode);
  return (
    <button
      onClick={() => onTap(label, item)}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "6px 2px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--sep)",
        cursor: "pointer",
        transition: "transform 0.08s",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minHeight: 48,
        minWidth: 56,
        flexShrink: 0,
      }}
      onPointerDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
      onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      <SymbolGlyph
        emoji={item.emoji}
        imageUrl={getArasaacPictogramUrl(item)}
        title={getArasaacPictogramDescription(item) || label}
        size={20}
        style={{ lineHeight: 1 }}
      />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: color || "var(--text)",
        textAlign: "center",
        lineHeight: 1.1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}>
        {label}
      </span>
    </button>
  );
}



/**
 * CoreWordBar — Persistent core vocabulary strip.
 *
 * Props:
 *   langCode     — current language code
 *   onTapWord    — (translatedLabel, item) → adds word to message bar
 */
export default memo(function CoreWordBar({
  langCode = "en",
  onTapWord,
}) {
  const handleWord = useCallback((label, item) => {
    onTapWord?.(label, item);
  }, [onTapWord]);

  const row1 = CORE_WORDS.filter(w => w.row === 1);
  const row2 = CORE_WORDS.filter(w => w.row === 2);

  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--bg)",
        borderBottom: "0.5px solid var(--sep)",
        padding: "4px 8px 6px",
      }}
      aria-label="Core vocabulary"
    >
      {/* ── Core words: single scrolling row ── */}
      <div style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        padding: "2px 0",
      }}>
        {CORE_WORDS.map(w => (
          <CoreWordButton key={w.id} item={w} langCode={langCode} onTap={handleWord} />
        ))}
      </div>
    </div>
  );
});
