/**
 * sentenceBuilder.test.js
 *
 * Unit tests for the deterministic sentence building pipeline.
 * Covers: SVO patterns, operators (PAST/FUTURE/NOT/WANT/CAN),
 * copula sentences, implicit subject, multi-language output, and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { buildSentence } from '../sentenceBuilder.js';

// ─── Basic SVO ────────────────────────────────────────────────────────────────

describe('buildSentence — basic SVO in English', () => {
  it('builds "I eat food." for [I, EAT, FOOD]', () => {
    const { text } = buildSentence(['I', 'EAT', 'FOOD'], 'en');
    expect(text).toBe('I eat food.');
  });

  it('builds "I drink water." for [I, DRINK, WATER]', () => {
    const { text } = buildSentence(['I', 'DRINK', 'WATER'], 'en');
    expect(text).toBe('I drink water.');
  });

  it('builds correctly for [I, PLAY] (intransitive)', () => {
    const { text } = buildSentence(['I', 'PLAY'], 'en');
    expect(text.toLowerCase()).toContain('play');
  });
});

// ─── Pro-drop subject omission ────────────────────────────────────────────────

describe('buildSentence — pro-drop Italian', () => {
  it('omits "io" and starts with verb in Italian SVO', () => {
    const { text } = buildSentence(['I', 'EAT', 'FOOD'], 'it');
    // Italian: "Mangio cibo." — starts with verb conjugation, no standalone "io" pronoun
    expect(text.toLowerCase()).toMatch(/^mangio/);
    // "io" must not appear as a standalone word (pronoun dropped), but may be substring of verbs
    expect(text.toLowerCase()).not.toMatch(/\bio\b/);
  });

  it('produces correct Italian for [I, DRINK, WATER]', () => {
    const { text } = buildSentence(['I', 'DRINK', 'WATER'], 'it');
    expect(text.toLowerCase()).toMatch(/^bevo/);
    expect(text.toLowerCase()).toContain('acqua');
  });
});

describe('buildSentence — pro-drop Spanish', () => {
  it('omits "yo" and starts with verb in Spanish', () => {
    const { text } = buildSentence(['I', 'EAT', 'FOOD'], 'es');
    expect(text.toLowerCase()).toMatch(/^como/);
    expect(text.toLowerCase()).not.toContain('yo');
  });
});

// ─── Tense operators ──────────────────────────────────────────────────────────

describe('buildSentence — PAST operator', () => {
  it('uses past tense in English', () => {
    const { text } = buildSentence(['I', 'PAST', 'EAT', 'FOOD'], 'en');
    expect(text.toLowerCase()).toContain('ate');
  });

  it('uses passato prossimo in Italian', () => {
    const { text } = buildSentence(['I', 'PAST', 'EAT', 'FOOD'], 'it');
    expect(text.toLowerCase()).toContain('ho mangiato');
  });

  it('uses futur simple in French with FUTURE operator', () => {
    const { text } = buildSentence(['I', 'FUTURE', 'GO', 'HOME'], 'fr');
    expect(text.toLowerCase()).toContain('irai');
  });
});

// ─── NOT operator ─────────────────────────────────────────────────────────────

describe('buildSentence — NOT operator', () => {
  it('negates English sentence', () => {
    const { text } = buildSentence(['I', 'NOT', 'EAT', 'FOOD'], 'en');
    expect(text.toLowerCase()).toContain('not');
    expect(text.toLowerCase()).toContain('eat');
  });

  it('negates Italian with "non"', () => {
    const { text } = buildSentence(['I', 'NOT', 'GO'], 'it');
    expect(text.toLowerCase()).toContain('non');
    expect(text.toLowerCase()).toContain('vado');
  });

  it('negates French with ne...pas', () => {
    const { text } = buildSentence(['I', 'NOT', 'GO'], 'fr');
    expect(text.toLowerCase()).toContain('ne');
    expect(text.toLowerCase()).toContain('pas');
  });

  it('negates Spanish with "no"', () => {
    const { text } = buildSentence(['I', 'NOT', 'DRINK', 'WATER'], 'es');
    expect(text.toLowerCase()).toMatch(/^no/);
  });
});

// ─── WANT modal ───────────────────────────────────────────────────────────────

describe('buildSentence — WANT modal', () => {
  it('produces "I want to eat food." in English', () => {
    const { text } = buildSentence(['I', 'WANT', 'EAT', 'FOOD'], 'en');
    expect(text.toLowerCase()).toContain('want to eat');
    expect(text.toLowerCase()).toContain('food');
  });

  it('produces "voglio mangiare cibo." in Italian', () => {
    const { text } = buildSentence(['I', 'WANT', 'EAT', 'FOOD'], 'it');
    expect(text.toLowerCase()).toContain('voglio mangiare');
    expect(text.toLowerCase()).toContain('cibo');
  });

  it('produces "quiero comer" in Spanish', () => {
    const { text } = buildSentence(['I', 'WANT', 'EAT', 'FOOD'], 'es');
    expect(text.toLowerCase()).toContain('quiero comer');
  });

  it('produces "veux manger" in French', () => {
    const { text } = buildSentence(['I', 'WANT', 'EAT', 'FOOD'], 'fr');
    expect(text.toLowerCase()).toContain('veux manger');
  });
});

// ─── CAN modal ────────────────────────────────────────────────────────────────

describe('buildSentence — CAN modal', () => {
  it('produces "can go" in English', () => {
    const { text } = buildSentence(['I', 'CAN', 'GO'], 'en');
    expect(text.toLowerCase()).toContain('can go');
  });

  it('produces "posso andare" in Italian', () => {
    const { text } = buildSentence(['I', 'CAN', 'GO'], 'it');
    expect(text.toLowerCase()).toContain('posso andare');
  });
});

// ─── Compound operators (NOT + WANT) ─────────────────────────────────────────

describe('buildSentence — NOT + WANT', () => {
  it('does not crash and produces negated modal in English', () => {
    const { text } = buildSentence(['I', 'NOT', 'WANT', 'EAT', 'FOOD'], 'en');
    expect(text).toBeTruthy();
    expect(text.toLowerCase()).toMatch(/not|don.t/);
  });
});

// ─── Copula sentences ─────────────────────────────────────────────────────────

describe('buildSentence — copula (S + be + ADJ)', () => {
  it('uses copula in English for adjective-only sequence', () => {
    const { text } = buildSentence(['I', 'HAPPY'], 'en');
    expect(text.toLowerCase()).toContain('am');
    expect(text.toLowerCase()).toContain('happy');
  });

  it('uses copula in Italian for adjective-only', () => {
    const { text } = buildSentence(['I', 'HAPPY'], 'it');
    expect(text.toLowerCase()).toContain('sono');
    expect(text.toLowerCase()).toContain('felice');
  });
});

// ─── Implicit subject ──────────────────────────────────────────────────────────

describe('buildSentence — implicit subject "I"', () => {
  it('adds implicit I in English when no subject given', () => {
    const { text } = buildSentence(['WANT', 'EAT', 'FOOD'], 'en');
    expect(text).toBeTruthy();
    expect(text.toLowerCase()).toContain('want to eat');
  });
});

// ─── Place ────────────────────────────────────────────────────────────────────

describe('buildSentence — place', () => {
  it('appends place preposition in English', () => {
    const { text } = buildSentence(['I', 'GO', 'HOME'], 'en');
    expect(text.toLowerCase()).toContain('home');
    expect(text.toLowerCase()).toContain('go');
  });
});

// ─── Multi-language equivalence ───────────────────────────────────────────────

describe('buildSentence — five languages produce non-empty results', () => {
  const input = ['I', 'WANT', 'DRINK', 'WATER'];
  const langs = ['en', 'it', 'fr', 'es', 'pt'];

  for (const lang of langs) {
    it(`produces non-empty text for lang="${lang}"`, () => {
      const { text, confidence } = buildSentence(input, lang);
      expect(text.length).toBeGreaterThan(3);
      expect(confidence).toBeGreaterThan(0);
    });
  }
});

// ─── Confidence scoring ───────────────────────────────────────────────────────

describe('buildSentence — confidence', () => {
  it('returns 1.0 confidence for complete SVO', () => {
    const { confidence } = buildSentence(['I', 'EAT', 'FOOD'], 'en');
    expect(confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('returns lower confidence for verb-only input', () => {
    const { confidence: c1 } = buildSentence(['EAT'], 'en');
    const { confidence: c2 } = buildSentence(['I', 'EAT', 'FOOD'], 'en');
    expect(c1).toBeLessThan(c2);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('buildSentence — edge cases', () => {
  it('returns empty text for empty array', () => {
    const { text } = buildSentence([], 'en');
    expect(text).toBe('');
  });

  it('does not crash for unknown concept IDs', () => {
    const { text } = buildSentence(['I', 'ZZZUNKNOWN'], 'en');
    expect(typeof text).toBe('string');
  });

  it('capitalizes first letter', () => {
    const { text } = buildSentence(['I', 'EAT', 'FOOD'], 'en');
    expect(text[0]).toBe(text[0].toUpperCase());
  });

  it('ends with a period', () => {
    const { text } = buildSentence(['I', 'EAT', 'FOOD'], 'en');
    expect(text).toMatch(/\.$/);
  });
});
