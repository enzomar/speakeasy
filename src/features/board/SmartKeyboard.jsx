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
import { Delete, CornerDownLeft, Volume2, Type } from "lucide-react";
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
  const longPressTimerRef                = useRef(null);
  const predictScrollRef                 = useRef(null);

  // Number pad: 12 keys matching the 3×4 grid positions
  const NUM_KEYS = ["1","2","3","4","5","6","7","8","9","0",".",","];

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

  // ── Number key tap ───────────────────────────────────────────────────────
  const handleNumTap = useCallback((num) => {
    onAcceptWord?.(num);
  }, [onAcceptWord]);

  // ── Backspace ────────────────────────────────────────────────────────────
  const handleBackspace = useCallback(() => {
    if (keySeq.length > 0) {
      setKeySeq(prev => prev.slice(0, -1));
    } else if (spellingMode) {
      setSpellingMode(false);
      setSpellingIdx(null);
    } else {
      onBackspace?.();
    }
  }, [keySeq, spellingMode, onBackspace]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (keySeq.length > 0 && t9Candidates.length > 0) {
      handleAccept(t9Candidates[0]);
    }
    onSubmit?.();
    setKeySeq([]);
    setNumMode(false);
  }, [keySeq, t9Candidates, handleAccept, onSubmit]);

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
    <div style={{
      display: "flex", flexDirection: "column",
      flex: 1, overflow: "hidden",
      background: "var(--bg)",
    }}>

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
              onClick={() => handleStarter(head)}
              style={{
                padding: "7px 14px", borderRadius: 18,
                border: "none",
                background: "var(--tint)",
                color: "#fff",
                fontSize: 14, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
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
            alignSelf: "center", flexShrink: 0, marginRight: 4,
          }}>▸</span>
          {activeStarter.map(cont => (
            <button
              key={cont}
              onClick={() => handleAccept(cont)}
              style={{
                padding: "6px 14px", borderRadius: 16,
                border: "2px solid var(--tint)",
                background: "var(--tint-soft)",
                color: "var(--tint)",
                fontSize: 14, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
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
        style={{
          display: "flex", gap: 6, padding: "8px 10px",
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          borderBottom: "0.5px solid var(--sep)",
          minHeight: 42,
        }}
      >
        {hasKeys && (
          <span style={{
            fontSize: 11, fontWeight: 800, color: "var(--text-3)",
            alignSelf: "center", fontFamily: "monospace",
            padding: "4px 8px", borderRadius: 8,
            background: "var(--surface)", flexShrink: 0,
          }}>
            {keySeq.map(ki => layout[ki]?.[0] ?? "?").join("")}
          </span>
        )}
        {stripItems.length === 0 && hasKeys && (
          <span style={{
            fontSize: 13, color: "var(--text-3)", alignSelf: "center",
            fontStyle: "italic",
          }}>
            No matches — try ABC mode
          </span>
        )}
        {stripItems.map((word, i) => (
          <button
            key={`${word}-${i}`}
            onClick={() => handleAccept(word)}
            style={{
              padding: "6px 14px", borderRadius: 16,
              border: "none",
              background: hasKeys
                ? (i === 0 ? "var(--tint)" : "var(--tint-soft)")
                : "var(--surface)",
              color: hasKeys
                ? (i === 0 ? "#fff" : "var(--tint)")
                : "var(--tint)",
              fontSize: 14, fontWeight: hasKeys && i === 0 ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
              boxShadow: hasKeys && i === 0 ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
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
        gap: 5, padding: "6px 5px",
      }}>
        {numMode ? (
          /* ── Number pad mode ── */
          <>
            {[0, 4, 8].map(start => (
              <div key={start} style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                {start === 0 && (
                  <KeyBtn
                    label="ABC"
                    isAccent
                    small
                    onClick={() => setNumMode(false)}
                  />
                )}
                {NUM_KEYS.slice(start, start + 4).map(n => (
                  <KeyBtn key={n} label={n} onClick={() => handleNumTap(n)} />
                ))}
                {start === 8 && (
                  <KeyBtn
                    label={<Delete size={18} strokeWidth={2} />}
                    small
                    onClick={handleBackspace}
                    onPointerDown={handleBsDown}
                    onPointerUpCapture={handleBsUp}
                  />
                )}
              </div>
            ))}
          </>
        ) : (
          /* ── Letter T9 / spelling mode ── */
          rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 4, justifyContent: "center" }}>

              {ri === 0 && (
                <KeyBtn
                  label={spellingMode ? <Type size={17} /> : "123"}
                  isAccent={spellingMode}
                  small
                  onClick={spellingMode ? toggleSpelling : () => setNumMode(true)}
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
                  onClick={handleBackspace}
                  onPointerDown={handleBsDown}
                  onPointerUpCapture={handleBsUp}
                />
              )}
            </div>
          ))
        )}

        {/* ── Bottom row ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "0 4px" }}>
          <KeyBtn
            label={spellingMode ? "T9" : "ABC"}
            small
            isAccent={spellingMode}
            onClick={toggleSpelling}
          />

          <button
            onClick={() => {
              if (hasKeys && t9Candidates.length > 0) {
                handleAccept(t9Candidates[0]);
              }
              // Space after accepting — next predictions will appear
            }}
            style={{
              flex: 1, maxWidth: 240,
              height: 46, borderRadius: 10,
              border: "none",
              background: "var(--surface)",
              color: hasKeys ? "var(--tint)" : "var(--text-3)",
              fontSize: hasKeys ? 15 : 13,
              fontWeight: hasKeys ? 700 : 600,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {hasKeys && t9Candidates.length > 0
              ? t9Candidates[0]
              : "space"}
          </button>

          <KeyBtn
            label={words.length > 0
              ? <Volume2 size={18} strokeWidth={2} />
              : <CornerDownLeft size={18} strokeWidth={2} />}
            isAccent
            small
            onClick={handleSubmit}
          />
        </div>
      </div>

      <style>{`
        @keyframes skFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
});

// ── Key button ────────────────────────────────────────────────────────────────

function KeyBtn({ label, isAccent, isHighlighted, small, onClick, onPointerDown, onPointerUpCapture }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUpCapture}
      onPointerLeave={onPointerUpCapture}
      style={{
        width: small ? 48 : undefined,
        minWidth: small ? 48 : 56,
        flex: small ? "0 0 auto" : 1,
        height: 48,
        borderRadius: 10,
        border: isHighlighted ? "2px solid var(--tint)" : "none",
        background: isAccent
          ? "var(--tint)"
          : isHighlighted
            ? "var(--tint-soft)"
            : "var(--surface)",
        color: isAccent ? "#fff" : "var(--text)",
        fontSize: typeof label === "string" ? 17 : 14,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "transform 0.08s, background 0.1s",
        letterSpacing: typeof label === "string" && label.includes("·") ? "0.04em" : 0,
      }}
    >
      {label}
    </button>
  );
}
