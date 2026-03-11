/**
 * morphologyEngine.test.js
 *
 * Unit tests for inflection of verbs, nouns, pronouns, and copula.
 */
import { describe, it, expect } from 'vitest';
import {
  inflectVerb,
  inflectNoun,
  inflectPronoun,
  getCopula,
} from '../morphologyEngine.js';

// ─── inflectVerb ─────────────────────────────────────────────────────────────

describe('inflectVerb — present tense', () => {
  it('returns English present first person for GO', () => {
    expect(inflectVerb('GO', 'en')).toBe('go');
  });

  it('returns Italian present first person for GO', () => {
    expect(inflectVerb('GO', 'it')).toBe('vado');
  });

  it('returns French present first person for GO', () => {
    expect(inflectVerb('GO', 'fr')).toBe('vais');
  });

  it('returns Spanish present first person for GO', () => {
    expect(inflectVerb('GO', 'es')).toBe('voy');
  });

  it('returns Portuguese present first person for GO', () => {
    expect(inflectVerb('GO', 'pt')).toBe('vou');
  });

  it('returns Italian present for EAT', () => {
    expect(inflectVerb('EAT', 'it')).toBe('mangio');
  });
});

describe('inflectVerb — past tense', () => {
  it('returns English simple past for EAT', () => {
    expect(inflectVerb('EAT', 'en', 'past')).toBe('ate');
  });

  it('returns Italian passato prossimo for EAT', () => {
    expect(inflectVerb('EAT', 'it', 'past')).toBe('ho mangiato');
  });

  it('returns French passé composé for DRINK', () => {
    expect(inflectVerb('DRINK', 'fr', 'past')).toBe('ai bu');
  });

  it('returns Spanish preterite for GO', () => {
    expect(inflectVerb('GO', 'es', 'past')).toBe('fui');
  });
});

describe('inflectVerb — future tense', () => {
  it('returns English will-future for SLEEP', () => {
    expect(inflectVerb('SLEEP', 'en', 'future')).toBe('will sleep');
  });

  it('returns Italian simple future for GO', () => {
    expect(inflectVerb('GO', 'it', 'future')).toBe('andrò');
  });
});

describe('inflectVerb — negation', () => {
  it('negates English present (GO)', () => {
    expect(inflectVerb('GO', 'en', 'present', true)).toBe('do not go');
  });

  it('negates Italian present (GO) with "non"', () => {
    expect(inflectVerb('GO', 'it', 'present', true)).toBe('non vado');
  });

  it('negates French present (GO) with "ne...pas"', () => {
    expect(inflectVerb('GO', 'fr', 'present', true)).toBe('ne vais pas');
  });

  it('negates Spanish with "no"', () => {
    expect(inflectVerb('GO', 'es', 'present', true)).toBe('no voy');
  });

  it('negates Portuguese with "não"', () => {
    expect(inflectVerb('GO', 'pt', 'present', true)).toBe('não vou');
  });

  it('negates English will-future correctly', () => {
    expect(inflectVerb('GO', 'en', 'future', true)).toBe('will not go');
  });
});

describe('inflectVerb — modals', () => {
  it('produces WANT + GO infinitive in English', () => {
    expect(inflectVerb('GO', 'en', 'present', false, 'WANT')).toBe('want to go');
  });

  it('produces WANT + GO infinitive in Italian', () => {
    expect(inflectVerb('GO', 'it', 'present', false, 'WANT')).toBe('voglio andare');
  });

  it('produces CAN + EAT in French', () => {
    expect(inflectVerb('EAT', 'fr', 'present', false, 'CAN')).toBe('peux manger');
  });

  it('produces MUST + DRINK in Spanish', () => {
    expect(inflectVerb('DRINK', 'es', 'present', false, 'MUST')).toBe('debo beber');
  });
});

describe('inflectVerb — unknown concept fallback', () => {
  it('returns lowercased id for unknown concept with no lexicon entry', () => {
    const result = inflectVerb('UNKNOWN_XYZ', 'en');
    expect(result).toBe('unknown_xyz');
  });
});

// ─── inflectNoun ─────────────────────────────────────────────────────────────

describe('inflectNoun', () => {
  it('returns English translation of WATER', () => {
    expect(inflectNoun('WATER', 'en')).toBe('water');
  });

  it('returns Italian translation of WATER', () => {
    expect(inflectNoun('WATER', 'it')).toBe('acqua');
  });

  it('returns French translation of FOOD', () => {
    expect(inflectNoun('FOOD', 'fr')).toBe('nourriture');
  });

  it('returns Spanish translation of HOME', () => {
    expect(inflectNoun('HOME', 'es')).toBe('casa');
  });

  it('returns lowercased id for unknown concept', () => {
    expect(inflectNoun('ZZZUNKNOWN', 'en')).toBe('zzzunknown');
  });
});

// ─── inflectPronoun ───────────────────────────────────────────────────────────

describe('inflectPronoun — pro-drop languages (it, es, pt)', () => {
  it('drops "io" in Italian for first person', () => {
    expect(inflectPronoun('I', 'it', true)).toBe('');
  });

  it('drops "yo" in Spanish for first person', () => {
    expect(inflectPronoun('I', 'es', true)).toBe('');
  });

  it('drops "eu" in Portuguese for first person', () => {
    expect(inflectPronoun('I', 'pt', true)).toBe('');
  });

  it('keeps "io" when omitFirstPerson is false', () => {
    expect(inflectPronoun('I', 'it', false)).toBe('io');
  });

  it('keeps non-first-person pronouns', () => {
    expect(inflectPronoun('YOU', 'it', true)).toBe('tu');
    expect(inflectPronoun('HE', 'es', true)).toBe('él');
  });
});

describe('inflectPronoun — non-pro-drop languages (en, fr)', () => {
  it('keeps "I" in English', () => {
    expect(inflectPronoun('I', 'en', true)).toBe('I');
  });

  it('keeps "je" in French', () => {
    expect(inflectPronoun('I', 'fr', true)).toBe('je');
  });
});

// ─── getCopula ────────────────────────────────────────────────────────────────

describe('getCopula', () => {
  it('returns "am" for English present', () => {
    expect(getCopula('en', 'present')).toBe('am');
  });

  it('returns "sono" for Italian present', () => {
    expect(getCopula('it', 'present')).toBe('sono');
  });

  it('returns "suis" for French present', () => {
    expect(getCopula('fr', 'present')).toBe('suis');
  });

  it('returns past form for Spanish', () => {
    expect(getCopula('es', 'past')).toBe('estaba');
  });

  it('returns future form for Italian', () => {
    expect(getCopula('it', 'future')).toBe('sarò');
  });
});
