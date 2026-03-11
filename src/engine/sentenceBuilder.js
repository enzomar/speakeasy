/**
 * sentenceBuilder.js
 *
 * Core AAC sentence construction pipeline.
 * Takes an ordered array of concept IDs and builds a naturalized sentence
 * in the requested language.
 *
 * Input:  ["I", "WANT", "DRINK", "WATER"]
 * Output: { text: "Voglio bere acqua", lang: "it", conceptIds: [...], confidence: 0.92 }
 *
 * @module sentenceBuilder
 */

import LEXICON from './lexicon.json' assert { type: 'json' };

// Helper: look up a concept from either concepts or operators section of lexicon
// Operators take precedence so WANT/CAN/MUST are treated as modals, not verbs
function _lookup(id) {
  return LEXICON.operators[id] ?? LEXICON.concepts[id] ?? null;
}
import {
  inflectVerb,
  inflectNoun,
  inflectPronoun,
  getCopula,
} from './morphologyEngine.js';

/**
 * @typedef {'en'|'it'|'fr'|'es'|'pt'|'de'|'ar'|'zh'|'ja'|'ko'} LangCode
 *
 * @typedef {Object} SentenceResult
 * @property {string}   text         - The final rendered sentence
 * @property {LangCode} lang         - Target language
 * @property {string[]} conceptIds   - The input concept IDs
 * @property {number}   confidence   - 0–1 confidence score
 * @property {string}   [warning]    - Optional warning message
 */

// ─── Operator concept IDs ─────────────────────────────────────────────────────
const TENSE_OPERATORS  = new Set(['PAST', 'FUTURE', 'NOW']);
const MODAL_OPERATORS  = new Set(['WANT', 'CAN', 'MUST']);
const NEGATION_OP      = 'NOT';
const SUBJECT_CONCEPTS = new Set(['I', 'YOU', 'HE', 'SHE', 'WE', 'THEY']);

/**
 * Build a sentence from an ordered sequence of concept IDs.
 *
 * @param {string[]}   conceptIds  - Ordered concept IDs, e.g. ["I", "PAST", "EAT", "PIZZA"]
 * @param {LangCode}   lang        - Target language
 * @returns {SentenceResult}
 */
export function buildSentence(conceptIds, lang = 'en') {
  if (!conceptIds || conceptIds.length === 0) {
    return { text: '', lang, conceptIds: [], confidence: 0 };
  }

  // ── 1. Parse stream into a structured representation ──────────────────────
  const parsed = _parseTokenStream(conceptIds, lang);

  // ── 2. Render each role into a word/phrase ─────────────────────────────────
  const parts = _render(parsed, lang);

  // ── 3. Naturalize & join ───────────────────────────────────────────────────
  const text = _naturalize(parts, lang, parsed);

  // ── 4. Capitalize & punctuate ─────────────────────────────────────────────
  const final = _finalize(text);

  const confidence = _scoreConfidence(parsed);

  return { text: final, lang, conceptIds: [...conceptIds], confidence };
}

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} ParsedSentence
 * @property {string|null} subject
 * @property {string|null} verb
 * @property {string[]}    objects
 * @property {string[]}    adjectives
 * @property {string[]}    adverbs
 * @property {string[]}    places
 * @property {'present'|'past'|'future'} tense
 * @property {boolean}     negated
 * @property {'WANT'|'CAN'|'MUST'|null} modal
 * @property {boolean}     isCopula     - true when sentence is S + be + adj
 */

// ─── Parser ───────────────────────────────────────────────────────────────────
function _parseTokenStream(ids, lang) {
  /** @type {ParsedSentence} */
  const result = {
    subject:    null,
    verb:       null,
    objects:    [],
    adjectives: [],
    adverbs:    [],
    places:     [],
    tense:      'present',
    negated:    false,
    modal:      null,
    isCopula:   false,
  };

  for (const id of ids) {
    const entry = _lookup(id);
    if (!entry) continue;

    const type = entry.type;

    // Operators: anything in the LEXICON.operators map, or operator concept IDs
    const isOperator = !!LEXICON.operators[id] || type === 'operator'
      || type === 'tense' || type === 'polarity' || type === 'modal'
      || type === 'intensity' || type === 'aspect' || type === 'mood';

    if (isOperator) {
      if (id === NEGATION_OP) {
        result.negated = true;
      } else if (id === 'PAST' || entry.value === 'past') {
        result.tense = 'past';
      } else if (id === 'FUTURE' || entry.value === 'future') {
        result.tense = 'future';
      } else if (id === 'NOW' || entry.value === 'present') {
        result.tense = 'present';
      } else if (MODAL_OPERATORS.has(id)) {
        result.modal = id;
      }
      continue;
    }

    if (type === 'pronoun' && SUBJECT_CONCEPTS.has(id) && !result.subject) {
      result.subject = id;
      continue;
    }

    if (type === 'verb' && !result.verb) {
      result.verb = id;
      continue;
    }

    if (type === 'adjective') {
      result.adjectives.push(id);

      // A concept-only sentence like [HAPPY] is treated as copula
      if (!result.verb) result.isCopula = true;
      continue;
    }

    if (type === 'adverb') {
      result.adverbs.push(id);
      continue;
    }

    if (type === 'place' || (type === 'noun' && entry?.role === 'place')) {
      result.places.push(id);
      continue;
    }

    if (type === 'noun') {
      result.objects.push(id);
      continue;
    }
  }

  // Implicit subject: default to "I" when absent
  if (!result.subject) result.subject = 'I';

  return result;
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
/**
 * @param {ParsedSentence} parsed
 * @param {LangCode} lang
 * @returns {string[]} ordered word fragments
 */
function _render(parsed, lang) {
  const parts = [];

  // Determine language family for word order
  const isSOV = (lang === 'ja' || lang === 'ko');   // Subject-Object-Verb
  const isCJK = (lang === 'zh' || lang === 'ja' || lang === 'ko');

  // Subject
  const subjectForm = inflectPronoun(parsed.subject, lang, /* omitFirstPerson */ true);
  if (subjectForm) parts.push(subjectForm);

  if (parsed.isCopula && !parsed.verb) {
    // S + BE + ADJ  (e.g. "I am happy")
    if (lang === 'zh') {
      // Chinese: S + 很 + ADJ (or just S + ADJ)
      const copula = getCopula(lang, parsed.tense);
      if (parsed.tense === 'future') {
        parts.push('会');
      }
      for (const adj of parsed.adjectives) {
        const word = inflectNoun(adj, lang);
        if (parsed.tense === 'present') parts.push('很' + word);
        else if (parsed.tense === 'past') parts.push(word + '了');
        else parts.push(word);
      }
    } else if (lang === 'ja') {
      // Japanese: S + ADJ + です (copula after adjective)
      for (const adj of parsed.adjectives) {
        parts.push(inflectNoun(adj, lang));
      }
      const copula = getCopula(lang, parsed.tense);
      if (copula) parts.push(copula);
    } else if (lang === 'ko') {
      // Korean: S + ADJ (adjective-verb, self-contained predicate)
      for (const adj of parsed.adjectives) {
        parts.push(inflectNoun(adj, lang));
      }
    } else {
      // SVO languages: S + copula + ADJ
      parts.push(getCopula(lang, parsed.tense));
      for (const adj of parsed.adjectives) {
        parts.push(inflectNoun(adj, lang));
      }
    }
  } else if (parsed.verb) {
    if (isSOV) {
      // SOV: S + OBJ + PLACE + V
      for (const obj of parsed.objects) {
        const word = inflectNoun(obj, lang);
        if (lang === 'ja') parts.push(word + 'を');
        else if (lang === 'ko') parts.push(word + '을');
        else parts.push(word);
      }
      for (const place of parsed.places) {
        const placeEntry = _lookup(place);
        const placeWord = placeEntry?.locative?.[lang] ?? inflectNoun(place, lang);
        parts.push(placeWord);
      }
      const verbForm = inflectVerb(
        parsed.verb, lang, parsed.tense, parsed.negated, parsed.modal,
      );
      parts.push(verbForm);
      for (const adv of parsed.adverbs) {
        parts.push(inflectNoun(adv, lang));
      }
    } else {
      // SVO: S + V + OBJ + PLACE (en, it, fr, es, pt, de, ar, zh)
      const verbForm = inflectVerb(
        parsed.verb, lang, parsed.tense, parsed.negated, parsed.modal,
      );
      parts.push(verbForm);
      for (const obj of parsed.objects) {
        parts.push(inflectNoun(obj, lang));
      }
      for (const place of parsed.places) {
        const placeEntry = _lookup(place);
        const placeWord = placeEntry?.locative?.[lang] ?? inflectNoun(place, lang);
        parts.push(placeWord);
      }
      for (const adv of parsed.adverbs) {
        parts.push(inflectNoun(adv, lang));
      }
    }
  } else {
    // Fallback: just output first object concept as noun phrase
    for (const obj of [...parsed.objects, ...parsed.adjectives]) {
      parts.push(inflectNoun(obj, lang));
    }
  }

  return parts.filter(Boolean);
}

// ─── Naturalization ───────────────────────────────────────────────────────────
/**
 * Apply language-specific surface corrections.
 *
 * @param {string[]} parts
 * @param {LangCode} lang
 * @param {ParsedSentence} parsed
 * @returns {string}
 */
function _naturalize(parts, lang, parsed) {
  let joined = parts.join(' ');

  // French: je + vowel → j'
  if (lang === 'fr') {
    joined = joined.replace(/^je ([aeéèêiouàâ])/i, "j'$1");
    joined = joined.replace(/\bne ([aeéèêiouàâ])/gi, "n'$1");
  }

  // Italian: reflexive handling
  if (lang === 'it') {
    joined = joined.replace(/non mi /, 'non mi ');
  }

  // German: verb-second (V2) — in simple declarative main clauses
  // The verb should be in second position. If subject is present,
  // the order is already S-V which satisfies V2.
  // For future tense with "werde", it's already handled in verb forms.

  // Chinese: remove spaces between characters for more natural output
  if (lang === 'zh') {
    // Keep spaces around Latin characters but remove between CJK
    joined = joined.replace(/([\u4e00-\u9fff\u3000-\u303f])\s+([\u4e00-\u9fff\u3000-\u303f])/g, '$1$2');
    // Apply again for consecutive CJK groups
    joined = joined.replace(/([\u4e00-\u9fff\u3000-\u303f])\s+([\u4e00-\u9fff\u3000-\u303f])/g, '$1$2');
  }

  // Japanese: remove spaces for natural output (Japanese doesn't use spaces)
  if (lang === 'ja') {
    joined = joined.replace(/\s+/g, '');
  }

  // Korean: keep spaces (Korean uses spaces between words)
  // No special naturalization needed.

  // Arabic: no special naturalization needed for basic sentences

  return joined;
}

// ─── Finalize ─────────────────────────────────────────────────────────────────
function _finalize(text) {
  if (!text) return '';
  // Capitalise first letter (skip for CJK scripts which don't have case)
  const firstChar = text.charAt(0);
  const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(firstChar);
  const isArabic = /[\u0600-\u06ff]/.test(firstChar);
  const cap = (isCJK || isArabic) ? text : (firstChar.toUpperCase() + text.slice(1));
  // Add period if not already punctuated
  if (/[.!?。！？]$/.test(cap)) return cap;
  // Use language-appropriate period
  return cap + '.';
}

// ─── Confidence score ─────────────────────────────────────────────────────────
function _scoreConfidence(parsed) {
  let score = 1.0;
  if (!parsed.verb && !parsed.isCopula) score -= 0.3;
  if (!parsed.subject) score -= 0.1;
  if (parsed.objects.length === 0 && !parsed.isCopula) score -= 0.1;
  return Math.max(0, Math.min(1, score));
}

// ─── Prepositions helper ──────────────────────────────────────────────────────
const PREPOSITIONS = {
  at: { en:'at', it:'a',  fr:'à',    es:'en', pt:'em',  de:'bei',  ar:'في',   zh:'在', ja:'で', ko:'에서' },
  to: { en:'to', it:'a',  fr:'à',    es:'a',  pt:'a',   de:'zu',   ar:'إلى',  zh:'去', ja:'に', ko:'에'   },
  in: { en:'in', it:'in', fr:'dans', es:'en', pt:'em',  de:'in',   ar:'في',   zh:'在', ja:'で', ko:'에서' },
};

function _getPreposition(prep, lang) {
  return PREPOSITIONS[prep]?.[lang] ?? prep;
}
