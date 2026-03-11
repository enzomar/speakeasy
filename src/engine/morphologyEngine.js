/**
 * morphologyEngine.js
 *
 * Converts concept-level tokens into surface-form words for a given language.
 * Supports 5 languages: en, it, fr, es, pt.
 *
 * @module morphologyEngine
 */

import TABLES from './morphologyTables.json' assert { type: 'json' };
import LEXICON from './lexicon.json' assert { type: 'json' };

/**
 * @typedef {'en'|'it'|'fr'|'es'|'pt'} LangCode
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
    // Fallback: use label from lexicon
    const lex = LEXICON.concepts[conceptId];
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
      // "want to go", "can go", "must go"
      if (modal === 'WANT') return `${modalForm} ${infinitive}`;
      return `${modalForm} ${infinitive}`;
    case 'it':
    case 'es':
    case 'pt':
      // "voglio andare", "quiero ir", "quero ir"
      return `${modalForm} ${infinitive}`;
    case 'fr':
      // "veux aller"
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
      // For simple present/past, prepend "do not" as simplification
      return `do not ${verbPhrase}`;
    }
    case 'it':
      // "vado" → "non vado"
      return `non ${verbPhrase}`;
    case 'fr': {
      // "mange" → "ne mange pas"
      // "vais manger" → "ne vais pas manger"
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
    default:
      return `not ${verbPhrase}`;
  }
}
