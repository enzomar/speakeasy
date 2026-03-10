/**
 * MessageBar — composed sentence bar with MIXED symbol-tap + inline typing.
 *
 * Native iOS-style: frosted surface, rounded chip row, tinted action buttons.
 */

import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Volume2, Delete, X, Star, Square } from "lucide-react";

// ── WordChip ─────────────────────────────────────────────────────────────────

function WordChip({ word, index, onRemove, typed = false }) {
  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          4,
        background: typed ? "rgba(52,199,89,0.12)" : "var(--tint-soft)",
        border:       "none",
        borderRadius: "var(--radius-sm)",
        padding:      "6px 12px",
        fontSize:     16,
        fontWeight:   600,
        color:        "var(--text)",
        whiteSpace:   "nowrap",
        animation:    "chipIn 0.14s ease both",
      }}
    >
      {word}
      <button
        aria-label={`Remove "${word}"`}
        onClick={() => onRemove(index)}
        style={{
          border:     "none",
          background: "none",
          cursor:     "pointer",
          color:      "var(--text-3)",
          padding:    "4px",
          lineHeight: 1,
          display:    "flex",
          alignItems: "center",
          minWidth:   44,
          minHeight:  44,
          justifyContent: "center",
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </span>
  );
}

// ── MessageBar ────────────────────────────────────────────────────────────────

function MessageBar({
  words,
  speaking,
  dir = "ltr",
  ui,
  onSpeak,
  onCommitTyped,
  onRemoveWord,
  onDeleteLast,
  onClear,
  onTyping,
  onStopSpeaking,
  onSaveFavorite,
}) {
  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);
  const [draft, setDraft] = useState("");

  // Normalise words — support both string and {text, __typed} objects
  const wordTexts = words.map(w => (typeof w === "string" ? w : w.text));
  const wordMeta  = words.map(w => (typeof w === "object" && w.__typed) ? true : false);

  const speakLabel  = ui?.speak    ?? "Speak";
  const stopLabel   = ui?.stopSpeaking ?? "Stop";
  const placeholder = ui?.placeholder ?? "Tap symbols or type here…";

  // ── Auto-scroll chips row to end ─────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [wordTexts.length, draft]);

  // ── Focus input when a symbol chip is added (keeps keyboard ready) ────────
  useEffect(() => {
    if (window.innerWidth > 768) inputRef.current?.focus();
  }, [wordTexts.length]);

  // ── Commit whatever is in the draft as chips ──────────────────────────────
  const commitDraft = useCallback((raw = draft) => {
    const trimmed = raw.trim();
    if (trimmed) onCommitTyped(trimmed);
    setDraft("");
    onTyping?.("");
  }, [draft, onCommitTyped, onTyping]);

  // ── Input event handlers ──────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    if (val.endsWith(" ") && val.trim()) {
      commitDraft(val);
      return;
    }
    setDraft(val);
    onTyping?.(val.trim());
  }, [commitDraft, onTyping]);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) { commitDraft(); }
      else { onSpeak(); }
    }
    if (e.key === "Backspace" && draft === "") { onDeleteLast(); }
  }, [draft, commitDraft, onSpeak, onDeleteLast]);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  const hasSomething = wordTexts.length > 0 || draft.trim();

  // Build the full sentence (including uncommitted draft) for speak
  const buildFullSentence = useCallback(() => {
    return [...wordTexts, draft.trim()].filter(Boolean).join(" ");
  }, [wordTexts, draft]);

  return (
    <div style={{
      background:   "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      padding:      "10px 14px 10px",
    }}>
      {/* ── Chip row + inline input ── */}
      <div
        ref={scrollRef}
        className="chips-row"
        aria-live="polite"
        aria-label="Current message"
        dir={dir}
        onClick={focusInput}
        style={{
          display:    "flex",
          flexWrap:   "nowrap",
          gap:        6,
          overflowX:  "auto",
          minHeight:  42,
          alignItems: "center",
          padding:    "4px 10px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          marginBottom: 10,
          cursor:     "text",
          background: "var(--bg)",
          borderRadius: "var(--radius-md)",
          border:     "0.5px solid var(--sep)",
        }}
      >
        {wordTexts.map((w, i) => (
          <WordChip
            key={`${w}-${i}`}
            word={w}
            index={i}
            onRemove={onRemoveWord}
            typed={wordMeta[i]}
          />
        ))}

        <input
          ref={inputRef}
          className="ghost-input"
          type="text"
          inputMode="text"
          dir={dir}
          value={draft}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {}}
          placeholder={wordTexts.length === 0 ? placeholder : ""}
          aria-label="Type words"
          style={{
            flex:       "1 1 120px",
            minWidth:   80,
            border:     "none",
            outline:    "none",
            background: "transparent",
            fontSize:   16,
            fontWeight: 500,
            color:      "var(--text)",
            padding:    "4px 4px",
            direction:  dir,
          }}
        />
      </div>

      {/* ── Action buttons ── */}
      {/* Layout: [Delete] [Clear] [★ Fav] ──── [SPEAK]                   */}
      <div style={{ display: "flex", gap: 8 }}>

        {/* Delete last */}
        <button
          aria-label="Delete last word"
          disabled={!hasSomething}
          onClick={() => {
            if (draft) { setDraft(d => d.slice(0, -1)); }
            else { onDeleteLast(); }
          }}
          style={iconBtn(!hasSomething)}
        >
          <Delete size={18} strokeWidth={1.8} />
        </button>

        {/* Clear all */}
        <button
          aria-label="Clear message"
          disabled={!hasSomething}
          onClick={() => { setDraft(""); onClear(); }}
          style={iconBtn(!hasSomething)}
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Save to favourites */}
        {onSaveFavorite && (
          <button
            aria-label="Save to favourites"
            disabled={!hasSomething}
            onClick={() => {
              const full = [...wordTexts, draft.trim()]
                .filter(Boolean).join(" ");
              if (full) onSaveFavorite(full);
            }}
            style={iconBtn(!hasSomething)}
          >
            <Star size={18} strokeWidth={1.8}
              fill={hasSomething ? "var(--orange, #FF9500)" : "none"}
              style={{ color: hasSomething ? "var(--orange, #FF9500)" : undefined }}
            />
          </button>
        )}

        {/* SPEAK — primary action, always on the dominant-hand side */}
        <button
          aria-label={speaking ? stopLabel : speakLabel}
          disabled={!hasSomething && !speaking}
          onClick={() => {
            if (speaking) {
              onStopSpeaking?.();
              return;
            }
            const sentence = buildFullSentence();
            setDraft("");
            onSpeak(sentence);
          }}
          style={{
            flex:           1,
            padding:        "18px 0",
            borderRadius:   "var(--radius-lg)",
            border:         "none",
            background:     speaking
              ? "var(--red)"
              : !hasSomething
                ? "var(--sep)"
                : "var(--green)",
            color:          speaking
              ? "#fff"
              : !hasSomething
                ? "var(--text-4)"
                : "#fff",
            fontSize:       20,
            fontWeight:     800,
            letterSpacing:  "-0.01em",
            cursor:         (!hasSomething && !speaking) ? "default" : "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            9,
            transition:     "all 0.15s",
            boxShadow:      (!hasSomething && !speaking)
              ? "none"
              : speaking
                ? "0 4px 14px rgba(255,59,48,0.25)"
                : "0 4px 14px rgba(52,199,89,0.35)",
          }}
        >
          {speaking ? (
            <><Square size={18} strokeWidth={2.8} fill="currentColor" /> {stopLabel}</>
          ) : (
            <><Volume2 size={22} strokeWidth={2.2} /> {speakLabel}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function iconBtn(disabled) {
  return {
    padding:      "18px 18px",
    borderRadius: "var(--radius-lg)",
    border:       "0.5px solid var(--sep)",
    background:   "var(--surface)",
    color:        disabled ? "var(--text-4)" : "var(--text-2)",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    cursor:       disabled ? "default" : "pointer",
    transition:   "all 0.15s",
  };
}
export default memo(MessageBar);
