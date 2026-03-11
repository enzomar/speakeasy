/**
 * morphologyEngine.js
 *
 * Converts concept-level tokens into surface-form words for a given language.
 * Supports 10 languages: en, it, fr, es, pt, de, ar, zh, ja, ko.
 *
 * @module morphologyEngine
 */

import TABLES from './morphologyTables.json' assert { type: 'json' };
import LEXICON from './lexicon.json' assert { type: 'json' };

/**
 * @typedef {'en'|'it'|'fr'|'es'|'pt'|'de'|'ar'|'zh'|'ja'|'ko'} LangCode
 * @typedef {'present'|'past'|'future'} Tense
 * @typedef {'WANT'|'CAN'|'MUST'|null} Modal
 */

/**
 * Get the surface form of a verb concept.
 *
 * @param {string} conceptId   - e.g. "GO", "EAT", "DRINK"
 * @param {LangCode} lang
 * @param {Tense}   [tense='present']
 * @param {boolean} [negated=false]
 * @param {Modal}   [modal=null]      - if set, verb is conjugated as infinitive after modal
 * @returns {string} surface form
 */
export function inflectVerb(conceptId, lang, tense = 'present', negated = false, modal = null) {
  const verbEntry = TABLES.verbs[conceptId];
  if (!verbEntry) {
    // Fallback: use lemma or label from lexicon
    const lex = LEXICON.concepts[conceptId];
    if (lex?.lemma?.[lang]) return lex.lemma[lang];
    if (lex?.labels?.[lang]) return lex.labels[lang];
    return conceptId.toLowerCase();
  }

  const forms = verbEntry[lang];
  if (!forms) return conceptId.toLowerCase();

  let verbPhrase;

  if (modal) {
    // Modal + infinitive pattern
    const modalForms = TABLES.modals[modal]?.[lang];
    if (!modalForms) {
      verbPhrase = _getTensedForm(forms, tense);
    } else {
      const modalForm = _getModalTense(modalForms, tense);
      const inf = forms.inf;
      verbPhrase = _buildModalPhrase(modalForm, inf, lang, modal);
    }
  } else {
    verbPhrase = _getTensedForm(forms, tense);
  }

  // Apply negation
  if (negated) {
    verbPhrase = _negate(verbPhrase, lang);
  }

  return verbPhrase;
}

/**
 * Get surface form of a noun/concept.
 *
 * @param {string} conceptId
 * @param {LangCode} lang
 * @returns {string}
 */
export function inflectNoun(conceptId, lang) {
  const lex = LEXICON.concepts[conceptId];
  if (!lex?.labels) return conceptId.toLowerCase();
  const label = lex.labels[lang];
  // Adjectives may have gender-split labels: { m: '...', f: '...' }
  if (label && typeof label === 'object') return label.m ?? label.f ?? conceptId.toLowerCase();
  return label ?? conceptId.toLowerCase();
}

/**
 * Get subject pronoun surface form.
 * Returns empty string for pro-drop languages when subject is I.
 *
 * @param {string} pronounId  - e.g. "I", "YOU", "HE"
 * @param {LangCode} lang
 * @param {boolean} [omitFirstPerson=true]  - whether to drop "I" in pro-drop langs
 * @returns {string}
 */
export function inflectPronoun(pronounId, lang, omitFirstPerson = true) {
  const isProDrop = TABLES.subjectOmissionLanguages.includes(lang);
  if (isProDrop && omitFirstPerson && pronounId === 'I') return '';

  // Fallback 1: pronouns table from morphologyTables.json
  const tableForm = TABLES.pronouns[pronounId]?.[lang];
  if (tableForm) return tableForm;
  // Fallback 2: lexicon labels
  const lexForm = LEXICON.concepts[pronounId]?.labels?.[lang];
  return lexForm ?? pronounId.toLowerCase();
}

/**
 * Get the copula "to be" surface form (for adjective/state predicates).
 *
 * @param {LangCode} lang
 * @param {Tense} [tense='present']
 * @returns {string}
 */
export function getCopula(lang, tense = 'present') {
  const copula = TABLES.copulas[lang];
  if (!copula) return 'is';
  return _getCouplaTense(copula, tense);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _getTensedForm(forms, tense) {
  switch (tense) {
    case 'past':   return forms.past1s   || forms.pres1s;
    case 'future': return forms.fut1s    || forms.pres1s;
    default:       return forms.pres1s;
  }
}

function _getModalTense(modalForms, tense) {
  switch (tense) {
    case 'past':   return modalForms.past || modalForms.pres;
    case 'future': return modalForms.fut  || modalForms.pres;
    default:       return modalForms.pres;
  }
}

function _getCouplaTense(copula, tense) {
  switch (tense) {
    case 'past':   return copula.past1s || copula.pres1s;
    case 'future': return copula.fut1s  || copula.pres1s;
    default:       return copula.pres1s;
  }
}

/**
 * Build "modal + infinitive" phrase handling per-language quirks.
 */
function _buildModalPhrase(modalForm, infinitive, lang, modal) {
  switch (lang) {
    case 'en':
    case 'de':
      // "want to go", "can go" / "will gehen", "kann gehen"
      return `${modalForm} ${infinitive}`;
    case 'it':
    case 'es':
    case 'pt':
      // "voglio andare", "quiero ir", "quero ir"
      return `${modalForm} ${infinitive}`;
    case 'fr':
      // "veux aller"
      return `${modalForm} ${infinitive}`;
    case 'ar':
      // "أريد الذهاب" — modal + infinitive (masdar)
      return `${modalForm} ${infinitive}`;
    case 'zh':
      // "想 去" — modal + verb
      return `${modalForm}${infinitive}`;
    case 'ja':
      // "行きたい" — verb stem + tai (handled differently; modal form IS the suffix)
      return `${infinitive}${modalForm}`;
    case 'ko':
      // "가고 싶어요" — Korean modal phrase
      return `${modalForm} ${infinitive}`;
    default:
      return `${modalForm} ${infinitive}`;
  }
}

/**
 * Apply negation to a verb phrase.
 * Languages differ significantly in negation structure.
 */
function _negate(verbPhrase, lang) {
  const neg = TABLES.negation[lang];
  if (!neg) return `not ${verbPhrase}`;

  switch (lang) {
    case 'en': {
      // "go" → "don't go" | "went" → "didn't go" (simplified: "do not {verb}")
      // For compound phrases like "will go" → "will not go"
      if (verbPhrase.startsWith('will ')) {
        return verbPhrase.replace('will ', 'will not ');
      }
      return `do not ${verbPhrase}`;
    }
    case 'it':
      return `non ${verbPhrase}`;
    case 'fr': {
      // "mange" → "ne mange pas"
      const words = verbPhrase.split(' ');
      if (words.length >= 2) {
        return `ne ${words[0]} pas ${words.slice(1).join(' ')}`;
      }
      return `ne ${verbPhrase} pas`;
    }
    case 'es':
      return `no ${verbPhrase}`;
    case 'pt':
      return `não ${verbPhrase}`;
    case 'de': {
      // "gehe" → "gehe nicht" | "werde gehen" → "werde nicht gehen"
      if (verbPhrase.startsWith('werde ')) {
        return verbPhrase.replace('werde ', 'werde nicht ');
      }
      return `${verbPhrase} nicht`;
    }
    case 'ar':
      // "آكل" → "لا آكل"
      return `لا ${verbPhrase}`;
    case 'zh':
      // "吃" → "不吃" (present/future) — past uses 没 but simplified to 不
      return `不${verbPhrase}`;
    case 'ja': {
      // "食べます" → "食べません" | replace ます with ません
      if (verbPhrase.endsWith('ます')) {
        return verbPhrase.slice(0, -2) + 'ません';
      }
      if (verbPhrase.endsWith('です')) {
        return verbPhrase.slice(0, -2) + 'ではありません';
      }
      return verbPhrase + 'ない';
    }
    case 'ko':
      // "먹어요" → "안 먹어요"
      return `안 ${verbPhrase}`;
    default:
      return `not ${verbPhrase}`;
  }
}
