/**
 * SmartKeyboard v2 — T9-style predictive keyboard for AAC.
 *
 * Designed to minimise taps per sentence:
 *
 * 1. SENTENCE STARTERS  — One-tap common phrase openers ("I want", "I need", …)
 * 2. NEXT-WORD PREDICT  — N-gram predictions shown before any key press
 * 3. T9 DISAMBIGUATION  — Cluster keys narrow a word dictionary; tap to accept
 * 4. WORD COMPLETION    — After 1-2 key taps, shows full matching words
 * 5. FALLBACK SPELLING  — Toggle ABC mode to expand individual letters
 *
 * Typical flow for "I want water":
 *   • Tap "I want" starter      (1 tap)
 *   • Tap "water" from starters (1 tap)
 *   • Tap speak                 (1 tap)  → 3 taps total!
 *
 * Or with T9:
 *   • Tap "I" prediction (1) → tap "want" prediction (1) →
 *     press W·B cluster (1) → tap "water" candidate (1) → speak (1) → 5 taps
 *
 * Props:
 *   langCode       – ISO 639-1 language code
 *   words          – current sentence words array (for context display)
 *   predictions    – next-word predictions from n-gram/AI engine
 *   onAcceptWord   – called with the accepted word string
 *   onBackspace    – delete last word
 *   onSubmit       – speak the sentence
 */

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Delete, CornerDownLeft, Volume2, Type, Check } from "lucide-react";
import { haptic } from "../../app/native";
import { getWordList, getStarters } from "../../data/wordFrequency";

// ── Cluster layouts per language (same groupings, optimised for T9) ──────────

const KEY_LAYOUTS = {
  en: [
    ["T","H"], ["S","R"], ["N","L"], ["D","C"],
    ["E","A"], ["I","O"], ["U","Y"], ["W","B"],
    ["M","P"], ["G","F"], ["K","J"], ["V","X","Z","Q"],
  ],
  es: [
    ["T","R"], ["S","L"], ["N","D"], ["C","B"],
    ["E","A"], ["I","O"], ["U","Y"], ["Ñ","H"],
    ["M","P"], ["G","F"], ["V","J"], ["K","X","Z","Q","W"],
  ],
  fr: [
    ["T","R"], ["S","L"], ["N","D"], ["C","B"],
    ["E","A","É","È","Ê"], ["I","O","Î","Ô"], ["U","Y","Ù","Û"], ["Ç","H"],
    ["M","P"], ["G","F"], ["V","J"], ["K","X","Z","Q","W"],
  ],
  it: [
    ["T","R"], ["S","L"], ["N","D"], ["C","B"],
    ["E","A","È","À"], ["I","O","Ì","Ò"], ["U","Ù","Y"], ["G","H"],
    ["M","P"], ["F","V"], ["Z","J"], ["K","X","Q","W"],
  ],
  pt: [
    ["T","R"], ["S","L"], ["N","D"], ["C","B"],
    ["E","A","Ã","Á","É"], ["I","O","Õ","Ó"], ["U","Ú","Ü","Y"], ["Ç","H"],
    ["M","P"], ["G","F"], ["V","J"], ["K","X","Z","Q","W"],
  ],
};

function getLayout(lang) { return KEY_LAYOUTS[lang] ?? KEY_LAYOUTS.en; }

// ── T9 Engine ─────────────────────────────────────────────────────────────────

/** Build a map: lowercase char → cluster index */
function buildCharMap(layout) {
  const map = {};
  layout.forEach((cluster, idx) => {
    cluster.forEach(ch => { map[ch.toLowerCase()] = idx; });
  });
  return map;
}

/** Compute the T9 cluster-index signature for a word */
function wordSignature(word, charMap) {
  const sig = [];
  for (const ch of word.toLowerCase()) {
    const idx = charMap[ch];
    if (idx !== undefined) sig.push(idx);
  }
  return sig;
}

/** Check if `sig` starts with `prefix` */
function sigStartsWith(sig, prefix) {
  if (prefix.length > sig.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (sig[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Build a pre-indexed T9 lookup.
 * Returns: (keySequence) → sorted word matches
 */
function buildT9Index(wordList, charMap) {
  const entries = wordList.map((word, freqRank) => ({
    word,
    sig: wordSignature(word, charMap),
    freq: wordList.length - freqRank,
  }));

  return function lookup(keySeq, maxResults = 12) {
    if (!keySeq.length) return [];

    const exact = [];
    const prefix = [];

    for (const entry of entries) {
      if (!sigStartsWith(entry.sig, keySeq)) continue;
      if (entry.sig.length === keySeq.length) {
        exact.push(entry);
      } else {
        prefix.push(entry);
      }
    }

    exact.sort((a, b) => b.freq - a.freq);
    prefix.sort((a, b) => b.freq - a.freq);

    return [...exact, ...prefix]
      .slice(0, maxResults)
      .map(e => e.word);
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default memo(function SmartKeyboard({
  langCode = "en",
  words = [],
  predictions = [],
  onAcceptWord,
  onBackspace,
  onSubmit,
}) {
  const [keySeq, setKeySeq]             = useState([]);
  const [spellingMode, setSpellingMode]  = useState(false);
  const [spellingIdx, setSpellingIdx]    = useState(null);
  const [numMode, setNumMode]            = useState(false);  // numbers + punctuation
  const [numBuffer, setNumBuffer]        = useState("");      // accumulates digits
  const longPressTimerRef                = useRef(null);
  const predictScrollRef                 = useRef(null);

  // Standard phone numpad layout: 3 cols × 4 rows
  // [ 1 2 3 ]  [ 4 5 6 ]  [ 7 8 9 ]  [ . 0 , ]
  const NUM_PAD = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    [".","0",","],
  ];

  const layout   = useMemo(() => getLayout(langCode), [langCode]);
  const charMap  = useMemo(() => buildCharMap(layout), [layout]);
  const wordList = useMemo(() => getWordList(langCode), [langCode]);
  const starters = useMemo(() => getStarters(langCode), [langCode]);
  const t9Lookup = useMemo(() => buildT9Index(wordList, charMap), [wordList, charMap]);

  // T9 candidates
  const t9Candidates = useMemo(() => t9Lookup(keySeq), [t9Lookup, keySeq]);

  const hasKeys = keySeq.length > 0;
  const showStarters = words.length === 0 && !hasKeys && !spellingMode && !numMode;

  // Auto-scroll prediction bar
  useEffect(() => {
    if (predictScrollRef.current) predictScrollRef.current.scrollLeft = 0;
  }, [t9Candidates, predictions]);

  // ── Key press (T9 mode) ──────────────────────────────────────────────────
  const handleKeyTap = useCallback((clusterIdx) => {
    if (spellingMode) {
      setSpellingIdx(prev => prev === clusterIdx ? null : clusterIdx);
      return;
    }
    setKeySeq(prev => [...prev, clusterIdx]);
  }, [spellingMode]);

  // ── Long-press → enter spelling mode ─────────────────────────────────────
  const handleKeyDown = useCallback((clusterIdx) => {
    longPressTimerRef.current = setTimeout(() => {
      setSpellingMode(true);
      setSpellingIdx(clusterIdx);
      setKeySeq([]);
    }, 500);
  }, []);

  const handleKeyUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // ── Accept a word ────────────────────────────────────────────────────────
  const handleAccept = useCallback((word) => {
    onAcceptWord?.(word);
    setKeySeq([]);
    setSpellingMode(false);
    setSpellingIdx(null);
  }, [onAcceptWord]);

  // ── Accept a sentence starter (multi-word) ───────────────────────────────
  const handleStarter = useCallback((starter) => {
    const parts = starter.trim().split(/\s+/).filter(Boolean);
    parts.forEach(w => onAcceptWord?.(w));
    setKeySeq([]);
  }, [onAcceptWord]);

  // ── Spelling mode letter tap ─────────────────────────────────────────────
  const handleSpellChar = useCallback((ch) => {
    onAcceptWord?.(ch.toLowerCase());
    setSpellingIdx(null);
  }, [onAcceptWord]);

  // ── Number pad digit tap — append to buffer ───────────────────────────────
  const handleNumDigit = useCallback((digit) => {
    setNumBuffer(prev => {
      // Prevent double decimal/comma: only allow one . or , total
      if ((digit === "." || digit === ",") && (prev.includes(".") || prev.includes(","))) return prev;
      // Limit to 15 chars to avoid absurd numbers
      if (prev.length >= 15) return prev;
      return prev + digit;
    });
  }, []);

  // ── Confirm number — commit the buffer as a single word ──────────────────
  const handleNumConfirm = useCallback(() => {
    const val = numBuffer.trim();
    if (val) onAcceptWord?.(val);
    setNumBuffer("");
  }, [numBuffer, onAcceptWord]);

  // ── Number backspace — remove last digit, or exit numMode if empty ───────
  const handleNumBackspace = useCallback(() => {
    setNumBuffer(prev => {
      if (prev.length > 0) return prev.slice(0, -1);
      // Buffer already empty → exit num mode
      setNumMode(false);
      return "";
    });
  }, []);

  // ── Backspace ────────────────────────────────────────────────────────────
  const handleBackspace = useCallback(() => {
    if (numMode) {
      handleNumBackspace();
      return;
    }
    if (keySeq.length > 0) {
      setKeySeq(prev => prev.slice(0, -1));
    } else if (spellingMode) {
      setSpellingMode(false);
      setSpellingIdx(null);
    } else {
      onBackspace?.();
    }
  }, [numMode, handleNumBackspace, keySeq, spellingMode, onBackspace]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    // Commit any pending number before speaking
    if (numMode && numBuffer.trim()) {
      onAcceptWord?.(numBuffer.trim());
      setNumBuffer("");
    }
    if (keySeq.length > 0 && t9Candidates.length > 0) {
      handleAccept(t9Candidates[0]);
    }
    onSubmit?.();
    setKeySeq([]);
    setNumMode(false);
    setNumBuffer("");
  }, [numMode, numBuffer, onAcceptWord, keySeq, t9Candidates, handleAccept, onSubmit]);

  // ── Toggle spelling mode ─────────────────────────────────────────────────
  const toggleSpelling = useCallback(() => {
    setSpellingMode(prev => !prev);
    setSpellingIdx(null);
    setKeySeq([]);
  }, []);

  // ── Backspace long-press repeat ──────────────────────────────────────────
  const bsTimerRef = useRef(null);
  const bsIntervalRef = useRef(null);
  const handleBsDown = useCallback(() => {
    bsTimerRef.current = setTimeout(() => {
      bsIntervalRef.current = setInterval(handleBackspace, 100);
    }, 400);
  }, [handleBackspace]);
  const handleBsUp = useCallback(() => {
    if (bsTimerRef.current) clearTimeout(bsTimerRef.current);
    if (bsIntervalRef.current) clearInterval(bsIntervalRef.current);
  }, []);

  // Clean up backspace repeat timers on unmount
  useEffect(() => {
    return () => {
      if (bsTimerRef.current) clearTimeout(bsTimerRef.current);
      if (bsIntervalRef.current) clearInterval(bsIntervalRef.current);
    };
  }, []);

  // Split layout into rows of 4
  const rows = [];
  for (let i = 0; i < layout.length; i += 4) rows.push(layout.slice(i, i + 4));

  // Items in the prediction/candidate strip
  const stripItems = hasKeys
    ? t9Candidates
    : predictions.length > 0
      ? predictions
      : wordList.slice(0, 10);

  // Active starter continuations (e.g. after tapping "I want" → show "water", "food", …)
  const activeStarter = useMemo(() => {
    if (words.length === 0 || hasKeys) return null;
    const sentenceLower = words.join(" ").toLowerCase();
    for (const [head, ...continuations] of starters) {
      if (sentenceLower === head.toLowerCase() ||
          sentenceLower.endsWith(head.toLowerCase())) {
        return continuations;
      }
    }
    return null;
  }, [words, starters, hasKeys]);

  return (
    <div
      role="toolbar"
      aria-label="Smart keyboard"
      style={{
        display: "flex", flexDirection: "column",
        flex: 1, overflow: "hidden",
        background: "var(--bg)",
      }}
    >

      {/* ── Sentence starters (empty sentence) ──────────────────────────── */}
      {showStarters && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          padding: "8px 10px", flexShrink: 0,
          borderBottom: "0.5px solid var(--sep)",
        }}>
          {starters.slice(0, 8).map(([head]) => (
            <button
              key={head}
              className="sk-starter"
              onClick={() => { haptic(); handleStarter(head); }}
              aria-label={`Say "${head}"`}
              style={{
                padding: "8px 16px", borderRadius: 22,
                border: "none",
                minHeight: 40,
                background: "var(--tint)",
                color: "#fff",
                fontSize: 15, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                boxShadow: "0 2px 8px rgba(59,155,143,0.32)",
                transition: "transform 0.08s",
                letterSpacing: "0.01em",
              }}
            >
              {head}
            </button>
          ))}
        </div>
      )}

      {/* ── Starter continuations ────────────────────────────────────── */}
      {activeStarter && !hasKeys && (
        <div style={{
          display: "flex", gap: 6, padding: "6px 10px",
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          borderBottom: "0.5px solid var(--sep)",
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-3)",
            alignSelf: "center", flexShrink: 0, marginRight: 2,
          }}>▸</span>
          {activeStarter.map(cont => (
            <button
              key={cont}
              className="sk-pred"
              onClick={() => { haptic(); handleAccept(cont); }}
              aria-label={`Add "${cont}"`}
              style={{
                padding: "7px 16px", borderRadius: 20,
                border: "2px solid var(--tint)",
                minHeight: 40,
                background: "var(--tint-soft)",
                color: "var(--tint)",
                fontSize: 15, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                transition: "transform 0.08s",
              }}
            >
              {cont}
            </button>
          ))}
        </div>
      )}

      {/* ── Prediction / T9 candidate strip ─────────────────────────── */}
      <div
        ref={predictScrollRef}
        role="listbox"
        aria-label="Word suggestions"
        style={{
          display: "flex", gap: 6, padding: "7px 10px",
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          borderBottom: "0.5px solid var(--sep)",
          minHeight: 52,
          alignItems: "center",
          background: hasKeys ? "var(--tint-soft)" : "var(--bg)",
          transition: "background 0.15s",
        }}
      >
        {hasKeys && (
          <span style={{
            fontSize: 12, fontWeight: 800, color: "var(--tint)",
            alignSelf: "center", fontFamily: "monospace",
            padding: "4px 8px", borderRadius: 8,
            background: "rgba(59,155,143,0.1)",
            flexShrink: 0,
            letterSpacing: "0.08em",
          }}>
            {keySeq.map(ki => layout[ki]?.[0] ?? "?").join("")}▋
          </span>
        )}
        {stripItems.length === 0 && hasKeys && (
          <span
            role="status"
            aria-live="polite"
            style={{
              fontSize: 14, color: "var(--text-3)", alignSelf: "center",
              fontStyle: "italic",
            }}
          >
            No matches — try ABC mode
          </span>
        )}
        {stripItems.map((word, i) => (
          <button
            key={`${word}-${i}`}
            className="sk-pred"
            role="option"
            onClick={() => { haptic(); handleAccept(word); }}
            aria-label={`${hasKeys ? "Select" : "Add"} ${word}`}
            style={{
              padding: "7px 16px", borderRadius: 20,
              border: hasKeys && i === 0
                ? "none"
                : "1.5px solid var(--sep-opaque)",
              minHeight: 40,
              background: hasKeys
                ? (i === 0 ? "var(--tint)" : "rgba(59,155,143,0.15)")
                : "var(--surface)",
              color: hasKeys
                ? (i === 0 ? "#fff" : "var(--tint)")
                : "var(--tint)",
              fontSize: 15, fontWeight: hasKeys && i === 0 ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxShadow: hasKeys && i === 0
                ? "0 2px 10px rgba(59,155,143,0.35)"
                : "none",
              transition: "transform 0.08s",
            }}
          >
            {word}
          </button>
        ))}
      </div>

      {/* ── Keyboard grid ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center",
        gap: 7, padding: "6px 6px 4px",
        background: "var(--bg)",
      }}>
        {numMode ? (
          /* ── Number pad mode — accumulate digits, confirm to commit ── */
          <>
            {/* Number display bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 8px", marginBottom: 2,
              minHeight: 44,
            }}>
              {/* Back to ABC */}
              <KeyBtn
                label="ABC"
                isAccent
                small
                ariaLabel="Back to letters"
                onClick={() => { if (numBuffer.trim()) handleNumConfirm(); setNumMode(false); setNumBuffer(""); }}
              />

              {/* Number display */}
              <div style={{
                flex: 1, textAlign: "center",
                fontSize: numBuffer.length > 8 ? 22 : 28,
                fontWeight: 800, fontVariantNumeric: "tabular-nums",
                color: numBuffer ? "var(--text)" : "var(--text-3)",
                letterSpacing: "0.04em",
                minHeight: 36, lineHeight: "36px",
                background: "var(--surface)",
                borderRadius: 10,
                padding: "4px 12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {numBuffer || "0"}
              </div>

              {/* Confirm (✓) button — sends number to sentence */}
              <KeyBtn
                label={<Check size={20} strokeWidth={2.5} />}
                isAccent={!!numBuffer}
                small
                ariaLabel="Confirm number"
                onClick={handleNumConfirm}
              />
            </div>

            {/* Numpad grid — 4 rows × 3 cols */}
            {NUM_PAD.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {row.map(digit => (
                  <KeyBtn
                    key={digit}
                    label={digit}
                    onClick={() => handleNumDigit(digit)}
                  />
                ))}
                {/* Backspace on the last row */}
                {ri === NUM_PAD.length - 1 && (
                  <KeyBtn
                    label={<Delete size={18} strokeWidth={2} />}
                    small
                    ariaLabel="Delete digit"
                    onClick={handleNumBackspace}
                    onPointerDown={handleBsDown}
                    onPointerUpCapture={handleBsUp}
                  />
                )}
                {/* Empty spacer on other rows to keep alignment */}
                {ri < NUM_PAD.length - 1 && (
                  <div style={{ width: 48, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </>
        ) : (
          /* ── Letter T9 / spelling mode ── */
          rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 6, justifyContent: "center" }}>

              {ri === 0 && (
                <KeyBtn
                  label={spellingMode ? <Type size={17} /> : "123"}
                  isAccent={spellingMode}
                  small
                  ariaLabel={spellingMode ? "Exit spelling mode" : "Number pad"}
                  onClick={spellingMode ? toggleSpelling : () => { setNumMode(true); setNumBuffer(""); }}
                />
              )}

              {row.map((cluster, ci) => {
                const clusterIdx = ri * 4 + ci;
                const isActive = keySeq[keySeq.length - 1] === clusterIdx;
                const isSpellingOpen = spellingMode && spellingIdx === clusterIdx;

                if (isSpellingOpen) {
                  return (
                    <div key={clusterIdx} style={{
                      display: "flex", gap: 3,
                      animation: "skFadeIn 0.12s ease",
                    }}>
                      {cluster.map(ch => (
                        <KeyBtn
                          key={ch}
                          label={ch.toLowerCase()}
                          isAccent
                          ariaLabel={`Letter ${ch}`}
                          onClick={() => handleSpellChar(ch)}
                        />
                      ))}
                    </div>
                  );
                }

                const label = cluster.slice(0, 2)
                  .map(c => c.toLowerCase())
                  .join(cluster.length > 2 ? "·" : "");

                return (
                  <KeyBtn
                    key={clusterIdx}
                    label={label}
                    isHighlighted={isActive}
                    ariaLabel={cluster.join(" ")}
                    onClick={() => handleKeyTap(clusterIdx)}
                    onPointerDown={() => handleKeyDown(clusterIdx)}
                    onPointerUpCapture={handleKeyUp}
                  />
                );
              })}

              {ri === rows.length - 1 && (
                <KeyBtn
                  label={<Delete size={18} strokeWidth={2} />}
                  small
                  ariaLabel="Backspace"
                  onClick={handleBackspace}
                  onPointerDown={handleBsDown}
                  onPointerUpCapture={handleBsUp}
                />
              )}
            </div>
          ))
        )}

        {/* ── Bottom row ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "0 4px" }}>
          <KeyBtn
            label={spellingMode ? "T9" : "ABC"}
            small
            isAccent={spellingMode}
            ariaLabel={spellingMode ? "Switch to T9 mode" : "Switch to spelling mode"}
            onClick={toggleSpelling}
          />

          {/* Space / accept bar */}
          <button
            className="sk-key"
            onClick={() => {
              haptic();
              if (hasKeys && t9Candidates.length > 0) {
                handleAccept(t9Candidates[0]);
              }
            }}
            aria-label={hasKeys && t9Candidates.length > 0
              ? `Accept ${t9Candidates[0]}`
              : "Space"}
            style={{
              flex: 1, maxWidth: 240,
              height: 52, borderRadius: 14,
              border: hasKeys
                ? "2px solid var(--tint)"
                : "1px solid var(--sep-opaque)",
              background: hasKeys
                ? "var(--tint)"
                : "var(--elevated, var(--surface))",
              color: hasKeys ? "#fff" : "var(--text-3)",
              fontSize: hasKeys ? 16 : 14,
              fontWeight: hasKeys ? 800 : 600,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxShadow: hasKeys
                ? "0 3px 10px rgba(59,155,143,0.35)"
                : "0 1px 3px rgba(0,0,0,0.07)",
              transition: "all 0.12s",
              letterSpacing: hasKeys ? "0.01em" : "0.04em",
            }}
          >
            {hasKeys && t9Candidates.length > 0
              ? t9Candidates[0]
              : "space"}
          </button>

          <KeyBtn
            label={words.length > 0
              ? <Volume2 size={20} strokeWidth={2} />
              : <CornerDownLeft size={20} strokeWidth={2} />}
            isAccent
            small
            ariaLabel={words.length > 0 ? "Speak sentence" : "Submit"}
            onClick={handleSubmit}
          />
        </div>
      </div>

      <style>{`
        @keyframes skFadeIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        .sk-key:active {
          transform: scale(0.88) !important;
          filter: brightness(0.82);
          transition: transform 0.05s, filter 0.05s !important;
        }
        .sk-key:focus-visible {
          outline: 3px solid var(--tint);
          outline-offset: 2px;
          z-index: 1;
        }
        .sk-pred:active {
          transform: scale(0.91);
          filter: brightness(0.88);
          transition: transform 0.05s !important;
        }
        .sk-starter:active {
          transform: scale(0.91);
          filter: brightness(0.88);
          transition: transform 0.05s !important;
        }
        .sk-starter:focus-visible {
          outline: 3px solid var(--tint);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
});

// ── Key button ────────────────────────────────────────────────────────────────

function KeyBtn({ label, isAccent, isHighlighted, small, onClick, onPointerDown, onPointerUpCapture, ariaLabel }) {
  const handleClick = (e) => {
    haptic();
    onClick?.(e);
  };
  return (
    <button
      className="sk-key"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUpCapture}
      onPointerLeave={onPointerUpCapture}
      aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
      style={{
        width: small ? 52 : undefined,
        minWidth: small ? 52 : 64,
        flex: small ? "0 0 auto" : 1,
        height: 56,
        borderRadius: 14,
        border: isHighlighted
          ? "2.5px solid var(--tint)"
          : isAccent
            ? "none"
            : "1px solid var(--sep-opaque)",
        background: isAccent
          ? "var(--tint)"
          : isHighlighted
            ? "var(--tint-soft)"
            : "var(--elevated, var(--surface))",
        color: isAccent ? "#fff" : isHighlighted ? "var(--tint)" : "var(--text)",
        fontSize: typeof label === "string" ? 17 : 15,
        fontWeight: isHighlighted ? 800 : 700,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "transform 0.08s, background 0.1s, box-shadow 0.1s",
        boxShadow: isAccent
          ? "0 3px 10px rgba(59,155,143,0.38)"
          : isHighlighted
            ? "0 0 0 3px rgba(59,155,143,0.15)"
            : "0 1px 4px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.05)",
        letterSpacing: typeof label === "string" && label.includes("·") ? "0.05em" : 0,
        textTransform: typeof label === "string" ? "uppercase" : undefined,
      }}
    >
      {label}
    </button>
  );
}
