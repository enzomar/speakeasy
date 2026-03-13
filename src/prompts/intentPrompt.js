/**
 * intentPrompt.js — Multilingual AAC LLM Prompt System
 * ======================================================
 * Supports: Italian (it) · English (en) · French (fr) · Spanish (es) · Portuguese (pt)
 * Gender-aware: male / female (set once in user profile)
 *
 * Flow:
 *   1. generateCandidates()    → 5 POS-aware sentences instantly (0ms, shown immediately)
 *   2. fixGrammar()            → rule-based post-processing (articles, gender, agreement)
 *   3. buildPrompt()           → Mode B only: LLM call for contextual replies to transcript
 *
 * All pure data tables live in ./heuristicData.js — this file contains only logic.
 */

import {
  SUPPORTED_LANGUAGES,
  POS_DICT,
  ADJ_FORMS,
  NOUN_GRAMMAR,
  VERB_FORMS,
  CATEGORY_TO_POS,
  TEMPLATES,
  GENDER_RULES,
  GENDER_INSTRUCTIONS,
  QUESTION_PATTERNS,
  REWRITE_EXAMPLES,
  INTENTS,
  EMOTIONS,
} from "./heuristicData.js";

// Re-export data that consumers import from this module
export { SUPPORTED_LANGUAGES, POS_DICT, INTENTS, EMOTIONS };

// ── POS + Keyword Resolution ───────────────────────────────────────────────────

/**
 * Resolve POS from a canonical English label OR a hierarchy categoryId.
 * Tries: 1) POS_DICT by word  2) category mapTo  3) fallback "noun"
 */
export function getPOS(canonicalLabel) {
  const key = canonicalLabel?.toLowerCase();
  if (POS_DICT[key]) return POS_DICT[key];
  if (CATEGORY_TO_POS[key]) return { pos: CATEGORY_TO_POS[key], gs: false };
  return { pos: "noun", gs: false };
}

// ── Keyword Resolver ───────────────────────────────────────────────────────────

/**
 * Resolve translated keyword from a symbol object.
 * @param {object|string} symbol    - Symbol with .labels map, or raw string
 * @param {string}        langCode  - "it" | "en" | "fr" | "es" | "pt"
 */
export function resolveKeyword(symbol, langCode) {
  if (!symbol)                       return "";
  if (typeof symbol === "string")    return symbol;
  return symbol.labels?.[langCode]
    ?? symbol.labels?.en
    ?? symbol.label
    ?? "";
}

/**
 * Resolve the correct adjective form for a canonical label, respecting gender.
 * Falls back to the raw translated keyword if no explicit form is found.
 */
function resolveAdj(canonicalLabel, langCode, gender) {
  const g = gender === "female" ? "f" : "m";
  const forms = ADJ_FORMS[langCode]?.[canonicalLabel?.toLowerCase()];
  return forms?.[g] ?? null;  // null = use raw keyword (no dict entry)
}

/**
 * Resolve the correct article form for a noun.
 * Returns { def, indef, part } or null if no data.
 */
function resolveNounArticle(canonicalLabel, langCode) {
  return NOUN_GRAMMAR[langCode]?.[canonicalLabel?.toLowerCase()] ?? null;
}

/**
 * Look up conjugated verb forms (1st person singular present + gerund).
 * @returns {{ "1s": string, ger: string } | null}
 */
function resolveVerbForms(canonicalLabel, langCode) {
  return VERB_FORMS[langCode]?.[canonicalLabel?.toLowerCase()] ?? null;
}

// ── Heuristic Sentence Generation ──────────────────────────────────────────────

/**
 * Generate up to 25 POS-aware heuristic candidates using the 2-axis
 * Intent × Emotion model. Results are ranked by relevance:
 *   1. Exact match (requested intent + emotion)
 *   2. Same intent · neutral emotion (safe fallback)
 *   3. Same intent · other emotions (variety)
 *   4. Other intents · requested emotion
 *   5. Other intents · neutral (safe fill)
 *   6. Remaining combinations (completeness)
 *
 * @param {object|string} symbol          - Tapped symbol with .labels or raw string
 * @param {object|string} modSymbol       - Modifier symbol or null
 * @param {string}        langCode        - "it"|"en"|"fr"|"es"|"pt"
 * @param {string}        gender          - "male"|"female"
 * @param {string}        canonicalLabel  - English base label for grammar lookup
 * @param {string}        categoryId      - Category mapTo value for POS lookup (e.g. "places")
 * @param {string}        intent          - One of INTENTS (default "statement")
 * @param {string}        emotion         - One of EMOTIONS (default "neutral")
 * @returns {string[]}
 */
export function generateCandidates(
  symbol, modSymbol, langCode = "it", gender = "male", canonicalLabel,
  categoryId, intent = "statement", emotion = "neutral", modCanonicalLabel = null
) {
  const rawKw = resolveKeyword(symbol, langCode);
  const mod   = modSymbol ? resolveKeyword(modSymbol, langCode) : "";
  const canon = canonicalLabel
    ?? (typeof symbol === "string" ? symbol : symbol?.labels?.en ?? "");
  const modCanon = modCanonicalLabel
    ?? (modSymbol
      ? (typeof modSymbol === "string" ? modSymbol : modSymbol?.labels?.en ?? "")
      : "");

  // ── Specific-item promotion ────────────────────────────────────────────
  // When the modifier is a specific noun (e.g. "bread" under "food"), promote
  // it to the primary keyword so templates say "I want bread", not "I want food bread".
  // Polarity words (yes/no/more/less), numbers, and colors stay as {mod}.
  const MODIFIER_KEEP_POS = new Set(["polarity", "color", "number", "adverb"]);
  const modPosEntry = modCanon ? POS_DICT[modCanon.toLowerCase()] : null;
  const modIsSpecificNoun = mod
    && !MODIFIER_KEEP_POS.has(modPosEntry?.pos)
    && !/^\d+$/.test(modCanon);  // pure digits stay as modifier

  // Word-level POS overrides category POS for specialized template types
  // (e.g. "color" and "number" have their own template sets where {mod} is primary)
  const SPECIALIZED_POS = new Set(["color", "number"]);
  const wordEntry = POS_DICT[canon?.toLowerCase()];
  const { pos } = (wordEntry && SPECIALIZED_POS.has(wordEntry.pos))
    ? wordEntry
    : getPOS(categoryId || canon);
  const langTemplates = TEMPLATES[langCode] ?? TEMPLATES.en;
  const posTemplates  = langTemplates[pos]  ?? langTemplates.noun;

  // Resolve gender-correct adjective form from dictionary
  const adjForm = (pos === "adjective")
    ? resolveAdj(canon, langCode, gender)
    : null;

  // If modifier is a specific noun, use it as the primary keyword
  const effectiveKw    = modIsSpecificNoun ? mod : (adjForm ?? rawKw);
  const effectiveCanon = modIsSpecificNoun ? modCanon : canon;
  const effectiveMod   = modIsSpecificNoun ? "" : mod;  // avoid duplication

  const kw = effectiveKw;

  // Resolve article-prefixed noun phrases from grammar dictionary
  const nounData = (pos === "noun" || pos === "place")
    ? resolveNounArticle(effectiveCanon, langCode) ?? resolveNounArticle(canon, langCode)
    : null;
  const art  = nounData?.indef ?? effectiveKw;
  const part = nounData?.part  ?? effectiveKw;
  const def  = nounData?.def   ?? effectiveKw;
  const loc  = nounData?.loc ?? nounData?.part ?? effectiveKw;

  // Resolve conjugated verb forms from dictionary
  const verbData = (pos === "verb")
    ? resolveVerbForms(canon, langCode)
    : null;
  const v1s = verbData?.["1s"] ?? rawKw;     // 1st person singular present: "mangio"
  const ger = verbData?.ger    ?? rawKw;     // gerund / present participle: "mangiando"

  // ── Rank all 25 template slots by relevance ────────────────────────────
  const ranked = [];
  const add = (i, e) => {
    const t = posTemplates[i]?.[e];
    if (t) ranked.push(t);
  };

  // 1. Primary: exact intent + emotion
  add(intent, emotion);
  // 2. Same intent, neutral fallback (if not already added)
  if (emotion !== "neutral") add(intent, "neutral");
  // 3. Same intent, remaining emotions
  for (const e of EMOTIONS) {
    if (e !== emotion && e !== "neutral") add(intent, e);
  }
  // 4. Other intents, detected emotion
  for (const i of INTENTS) {
    if (i !== intent) add(i, emotion);
  }
  // 5. Other intents, neutral
  if (emotion !== "neutral") {
    for (const i of INTENTS) {
      if (i !== intent) add(i, "neutral");
    }
  }
  // 6. Remaining combos (other intents × other emotions)
  for (const i of INTENTS) {
    if (i !== intent) {
      for (const e of EMOTIONS) {
        if (e !== emotion && e !== "neutral") add(i, e);
      }
    }
  }

  // ── Fill placeholders ──────────────────────────────────────────────────
  return ranked.map(t =>
    t
      .replace("{kw}", kw)
      .replace("{art}", art)
      .replace("{part}", part)
      .replace("{def}", def)
      .replace("{loc}", loc)
      .replace("{v1s}", v1s)
      .replace("{ger}", ger)
      .replace("{mod}", effectiveMod)
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

// ── Rule-Based Grammar Fixer ───────────────────────────────────────────────────
// Post-processes heuristic sentences. Dictionary lookups handle known symbols;
// regex fallback catches remaining gender-sensitive words.

/**
 * Fix gender agreement in a heuristic sentence.
 * Dictionary entries (ADJ_FORMS) are already applied in generateCandidates.
 * This function applies REGEX FALLBACK rules for any remaining words
 * not in our dictionary (e.g. user-typed text, n-gram predictions).
 *
 * Returns the sentence unchanged for English or male/neutral gender.
 *
 * @param {string} sentence  - Heuristic sentence to fix
 * @param {string} langCode  - "it"|"en"|"fr"|"es"|"pt"
 * @param {string} gender    - "male"|"female"|"neutral"
 * @returns {string}
 */
export function fixGender(sentence, langCode, gender) {
  // English has no grammatical gender; neutral & male use masculine defaults
  if (langCode === "en" || gender === "neutral" || gender === "male") return sentence;
  const rules = GENDER_RULES[langCode];
  if (!rules) return sentence;

  let result = sentence;
  for (const [pattern, , femaleRepl] of rules) {
    result = result.replace(pattern, femaleRepl);
  }
  return result;
}


// ── Core+Fringe Prefix Enforcement ───────────────────────────────────────────
// Based on core+fringe AAC vocabulary model (Beukelman & Light, 2020):
// core vocabulary (~50 high-frequency words) combine with fringe vocabulary
// (grid symbols) to build grammatical sentences. When core words are already
// in the message bar, ALL generated candidates must respect that prefix.
//
// Grammar note: the prefix also determines grammatical person for conjugation.
//   "I …"    → 1st-person present (already encoded via {v1s} in templates)
//   "you …"  → 2nd-person (templates handle this via imperative intent)
//   "help …" → imperative
// The prefix filter reinforces those person-agreement constraints at sentence level.

/**
 * Filter and/or prepend a core-word prefix onto heuristic candidates.
 *
 * Algorithm:
 *  1. Keep candidates that already start with the prefix (word-by-word match).
 *     If ≥ 3 candidates are compatible, return only those — they're already correct.
 *  2. Otherwise prepend the prefix to every candidate, handling word overlap
 *     (e.g. prefix="I want", candidate="want food" → "I want food", no duplication).
 *
 * @param {string[]} candidates  - Heuristic sentence strings from generateCandidates()
 * @param {string[]} prefixWords - Core/grid words already in the message bar
 * @returns {string[]}
 */
export function applyPrefix(candidates, prefixWords) {
  if (!prefixWords?.length || !candidates?.length) return candidates;

  const prefixStr = prefixWords.join(" ");
  const prefixLow = prefixStr.toLowerCase();

  // 1. Prefer candidates that already start with the prefix
  const compatible = candidates.filter(c => c.toLowerCase().startsWith(prefixLow));
  if (compatible.length >= 3) return compatible;

  // 2. Prepend prefix to each candidate, merging word-level overlap
  //    e.g. prefix=["I","want"], cand="want food" → overlap=1 → "I want food"
  //    e.g. prefix=["I","want"], cand="go home"   → overlap=0 → "I want go home"
  return candidates.map(c => {
    const prefixParts = prefixWords.map(w => w.toLowerCase());
    const cParts      = c.split(/\s+/).filter(Boolean);

    // Find longest suffix of prefix that matches a prefix-slice of candidate
    let overlap = 0;
    for (let size = Math.min(prefixParts.length, cParts.length); size > 0; size--) {
      const tail = prefixParts.slice(-size).join(" ");
      const head = cParts.slice(0, size).map(w => w.toLowerCase()).join(" ");
      if (tail === head) { overlap = size; break; }
    }

    return [prefixStr, ...cParts.slice(overlap)].join(" ");
  });
}

// ── Gender Instruction for LLM ─────────────────────────────────────────────────

function genderInstruction(langCode, gender) {
  if (langCode === "en") return "";
  return GENDER_INSTRUCTIONS[langCode]?.[gender] ?? "";
}

// ── Question Intent Detection ──────────────────────────────────────────────────


/**
 * Detect whether the transcript is a question.
 * @param {string} transcript — What the interlocutor said
 * @param {string} langCode  — "it"|"en"|"fr"|"es"
 * @returns {{ isQuestion: boolean, questionType: string }}
 */
export function detectQuestionIntent(transcript, langCode = "en") {
  if (!transcript?.trim()) return { isQuestion: false, questionType: "none" };
  const t = transcript.trim();

  // Explicit punctuation
  if (/\?\s*$/.test(t)) return { isQuestion: true, questionType: "explicit" };
  // Spanish inverted question
  if (/^¿/.test(t))     return { isQuestion: true, questionType: "explicit" };

  const pat = QUESTION_PATTERNS[langCode] ?? QUESTION_PATTERNS.en;
  if (pat.test(t)) return { isQuestion: true, questionType: "pattern" };

  return { isQuestion: false, questionType: "none" };
}

// ── LLM Prompt Builders + Parsers ──────────────────────────────────────────────

/**
 * Build a tiny prompt that rewrites a single heuristic sentence.
 *
 * @param {string}   sentence        - The heuristic sentence to rewrite
 * @param {string}   langCode        - "it"|"en"|"fr"|"es"|"pt"
 * @param {string}   gender          - "male"|"female"
 * @param {string[]} [messageHistory] - Last 3 spoken messages for context
 * @returns {{ system: string, user: string }}
 */
export function buildRewritePrompt(sentence, langCode = "it", gender = "male", messageHistory = []) {
  const lang = SUPPORTED_LANGUAGES[langCode]?.llmName ?? "Italian";
  const gNote = genderInstruction(langCode, gender);

  const langExamples = REWRITE_EXAMPLES[langCode] ?? REWRITE_EXAMPLES.en;
  const g = gender === "female" ? "female" : "male";
  const examples = langExamples[g] ?? langExamples.male;
  const exLines = examples.map(e => `IN: ${e.in}\nOUT: ${e.out}`).join("\n");

  const system = [
    `/no_think`,
    `You polish AAC sentences into correct, natural ${lang}.${gNote}`,
    `Fix grammar: verb conjugation, gender agreement, singular/plural, articles, tense.`,
    `SAME MEANING. Do NOT invent new content. Do NOT answer, translate, or explain.`,
    `If the sentence is already correct and natural, return it UNCHANGED.`,
    `Output ONLY the polished sentence, nothing else.`,
    ``,
    exLines,
  ].join("\n");

  // Prefix the user message clearly so the model continues the pattern
  const userParts = [];
  if (messageHistory.length > 0) {
    userParts.push(`Context: ${messageHistory.join(" | ")}`);
  }
  userParts.push(`IN: ${sentence}`);
  userParts.push(`OUT:`);

  return { system, user: userParts.join("\n") };
}

// ── Mode B: Contextual Reply Prompt (transcript-driven) ────────────────────────

/**
 * Build a full prompt for Mode B: the user heard something (transcript)
 * and needs contextual reply suggestions in the target language.
 *
 * @param {object} opts
 * @param {string} opts.symbol         - Current keyword / symbol label
 * @param {string} opts.langCode       - "it"|"en"|"fr"|"es"
 * @param {string} opts.gender         - "male"|"female"
 * @param {string} opts.transcript     - What the other person said
 * @param {string[]} [opts.history]    - Words currently in the message bar
 * @param {string[]} [opts.candidates] - Heuristic candidates for grounding
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt({ symbol = "", langCode = "it", gender = "male", transcript = "", history = [], candidates = [], messageHistory = [], intent, emotion }) {
  const lang  = SUPPORTED_LANGUAGES[langCode]?.llmName ?? "Italian";
  const gNote = genderInstruction(langCode, gender);

  // Detect question intent to guide reply style
  const { isQuestion, questionType } = detectQuestionIntent(transcript, langCode);
  const intentHint = isQuestion
    ? `\nThe other person asked a question — prioritise direct answers.`
    : ``;

  // 2-axis emotion guidance
  const emotionHint = (emotion && emotion !== "neutral")
    ? `\nThe user's tone is ${emotion} — match this emotional register.`
    : ``;

  const system = [
    `/no_think`,
    `You are an AAC (Augmentative and Alternative Communication) assistant.`,
    `The user communicates through symbols and needs help replying to what someone just said.`,
    `Generate 5 short, natural replies in ${lang}.${gNote}${intentHint}${emotionHint}`,
    `Each reply: 2-8 words, simple vocabulary, natural tone.`,
    `Output one reply per line, no numbers, no quotes, no labels.`,
  ].join("\n");

  const parts = [`Someone said: "${transcript}"`];
  if (isQuestion) {
    parts.push(`(This is a ${questionType} question — reply with answers)`);
  }
  if (messageHistory.length > 0) {
    parts.push(`Recent conversation: ${messageHistory.slice(-3).join(" | ")}`);
  }
  if (history.length > 0) {
    parts.push(`User's current words: ${history.join(" ")}`);
  }
  if (symbol) {
    parts.push(`Topic/context: ${symbol}`);
  }
  if (candidates.length > 0) {
    parts.push(`Example replies (improve these): ${candidates.slice(0, 3).join(" | ")}`);
  }
  parts.push(`Reply with 5 short responses the user could say back.`);

  return { system, user: parts.join("\n") };
}

// ── Per-Sentence Rewrite Config ────────────────────────────────────────────────

export const REWRITE_CONFIG = {
  max_tokens:        40,    // single short sentence
  temperature:       0.1,   // very low — rewrite, don't hallucinate
  top_p:             0.85,
  frequency_penalty: 0.3,
  presence_penalty:  0.0,
  stream:            false,
};

// ── Rewrite Output Parser ──────────────────────────────────────────────────────

/**
 * Compute word-overlap ratio between two sentences.
 * Returns 0.0 – 1.0 (fraction of input words found in output).
 */
function wordOverlap(input, output) {
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  const inWords  = new Set(norm(input));
  const outWords = new Set(norm(output));
  if (inWords.size === 0) return 1;
  let hits = 0;
  for (const w of inWords) if (outWords.has(w)) hits++;
  return hits / inWords.size;
}

/**
 * Parse LLM output from a single-sentence rewrite call.
 * Returns the cleaned sentence or null if unparseable.
 */
export function parseRewriteOutput(raw, originalSentence) {
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .trim();

  // Strip any "OUT:" prefix the model might echo back
  text = text.replace(/^OUT:\s*/i, "").trim();

  // Take first non-empty line with ≥3 chars
  const line = text.split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^[\s]*(?:\d+[.):\-\s]+)/i.test(s))[0];
  if (!line) return null;

  let clean = line
    .replace(/^['"""''`«»]+|['"""''`«»]+$/g, "")  // strip quotes
    .replace(/^(?:IN|OUT):\s*/i, "")                // strip stray labels
    .trim();

  if (clean.length < 3 || clean.length > 150) return null;
  if (/[\[\]{}<>\\|@#]/.test(clean)) return null;  // markup artefacts

  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  const result = /[.!?¿¡]$/.test(clean) ? clean : clean + ".";

  // Similarity guard: reject hallucinations that share almost no words with input
  if (originalSentence && wordOverlap(originalSentence, result) < 0.25) {
    console.warn("[parseRewriteOutput] Rejected hallucination:", originalSentence, "→", result);
    return null;
  }

  return result;
}

// ── Dedup + Merge ──────────────────────────────────────────────────────────────

export function dedupeAndMerge(primary, secondary, n = 13) {
  const seen = new Set(primary.map(s => s.toLowerCase()));
  return [...primary, ...secondary.filter(s => !seen.has(s.toLowerCase()))].slice(0, n);
}

// ── Generation Config ──────────────────────────────────────────────────────────
// Backward-compatible export — used by AIModelModal for display.

export const GENERATION_CONFIG = {
  max_tokens:          130,
  temperature:         0.2,
  top_p:               0.85,
  frequency_penalty:   0.3,
  presence_penalty:    0.0,
  repetition_penalty:  1.0,   // kept for AIModelModal slider compat
  stream:              false,
};

/**
 * Return GENERATION_CONFIG merged with any user overrides from localStorage.
 */
export function getGenerationConfig(mode = "A") {
  const overrides = {};
  try {
    const pp = localStorage.getItem("speakeasy_presence_penalty");
    if (pp !== null && pp !== "") overrides.presence_penalty = parseFloat(pp);
    const rp = localStorage.getItem("speakeasy_repetition_penalty");
    if (rp !== null && rp !== "") overrides.repetition_penalty = parseFloat(rp);
  } catch (_) { /* SSR / private browsing */ }
  return {
    ...GENERATION_CONFIG,
    ...overrides,
    temperature: mode === "B" ? 0.45 : 0.2,
    max_tokens:  mode === "B" ? 160  : 130,
  };
}

// ── Full Output Parser (batch mode, kept for compat) ───────────────────────────

export function parseOutput(raw) {
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .trim();

  try {
    const s = text.indexOf("["), e = text.lastIndexOf("]");
    if (s !== -1 && e > s) {
      const arr = JSON.parse(text.slice(s, e + 1));
      if (Array.isArray(arr))
        return arr.filter(x => typeof x === "string" && x.trim().length >= 4)
                  .map(normalise).slice(0, 5);
    }
  } catch { /* not JSON */ }

  const LABEL_RE = /^[\s]*(?:\d+[.):\-\s]+|(?:line|sentence)\s*\d+[.:)?\s]+|(?:positive|affirmation|question|negative|varied|request|variation|réponse|risposta|respuesta)\s*\d*[.:)?\s]+)/i;

  return text
    .split(/\n+/)
    .map(s => s.replace(LABEL_RE, "").trim())
    .map(s => s.replace(/^['"""''`«»]+|['"""''`«»]+$/g, "").trim())
    .filter(s =>
      s.length >= 4 && s.length <= 150 &&
      !/[\[\]{}<>\\|@#]/.test(s) &&
      !/^(note|output|result|here|these|voici|ecco|aquí)/i.test(s) &&
      s.split(/\s+/).length >= 2
    )
    .map(normalise)
    .slice(0, 5);
}

function normalise(s) {
  const c = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?¿¡]$/.test(c) ? c : c + ".";
}

// ── Backward-compat exports ───────────────────────────────────────────────────

export function buildSystemPrompt(langCode = "en", keyword = "") {
  const lang = SUPPORTED_LANGUAGES[langCode]?.llmName ?? "English";
  return `/no_think\nRewrite in natural ${lang}. Keep meaning. 3-6 words. Output only the sentence.`;
}

export function buildUserPrompt(currentWords, langCode = "en", tapContext, categoryId) {
  const keyword  = tapContext?.l2Label || currentWords || "…";
  const modifier = tapContext?.l3Label || null;
  const l2Canon  = tapContext?.l2Canon || keyword;
  const candidates = generateCandidates(keyword, modifier, langCode, "male", l2Canon, categoryId);
  return candidates.slice(0, 5).join("\n");
}
