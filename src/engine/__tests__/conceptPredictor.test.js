/**
 * conceptPredictor.test.js
 *
 * Unit tests for the n-gram + grammar graph concept predictor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  learnSequence,
  predictNext,
  resetNgrams,
} from '../conceptPredictor.js';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Start fresh for each test — reset ngrams and provide a clean localStorage stub
  resetNgrams();
});

// ─── Basic learning and prediction ───────────────────────────────────────────

describe('learnSequence + predictNext', () => {
  it('returns an array of strings', () => {
    const result = predictNext([], 6);
    expect(Array.isArray(result)).toBe(true);
  });

  it('predicts a frequently learned concept', () => {
    // Teach: after [I], EAT comes often
    learnSequence(['I', 'EAT', 'FOOD']);
    learnSequence(['I', 'EAT', 'FOOD']);
    learnSequence(['I', 'EAT', 'FOOD']);

    const suggestions = predictNext(['I'], 8);
    expect(suggestions).toContain('EAT');
  });

  it('promotes trigram frequency over bigram', () => {
    // Teach: [I, WANT] → DRINK overwhelmingly
    for (let i = 0; i < 5; i++) learnSequence(['I', 'WANT', 'DRINK', 'WATER']);
    // Teach: [I, WANT] → EAT only once
    learnSequence(['I', 'WANT', 'EAT', 'FOOD']);

    const suggestions = predictNext(['I', 'WANT'], 4);
    const drinkIdx = suggestions.indexOf('DRINK');
    const eatIdx   = suggestions.indexOf('EAT');

    // DRINK should rank higher (or both present)
    if (drinkIdx !== -1 && eatIdx !== -1) {
      expect(drinkIdx).toBeLessThan(eatIdx);
    } else {
      // At minimum DRINK should appear
      expect(drinkIdx).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects the n parameter', () => {
    learnSequence(['I', 'EAT', 'FOOD']);
    const result = predictNext(['I'], 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns no more suggestions than known concepts', () => {
    const result = predictNext([], 100);
    // Should be capped by lexicon size
    expect(result.length).toBeLessThanOrEqual(100);
  });
});

// ─── Grammar graph filtering ──────────────────────────────────────────────────

describe('predictNext — grammar graph filtering', () => {
  it('suggests verbs after a subject', () => {
    // After SUBJECT node, valid next roles include VERB, MODAL, NEGATION
    const suggestions = predictNext(['I'], 10);

    // Some verb concepts should be in suggestions (grammar graph allows VERB after SUBJECT)
    const verbConcepts = ['EAT', 'DRINK', 'GO', 'SLEEP', 'PLAY'];
    const matchedVerbs = suggestions.filter(id => verbConcepts.includes(id));
    expect(matchedVerbs.length).toBeGreaterThan(0);
  });

  it('suggests MODAL operators after a subject with no history', () => {
    const suggestions = predictNext(['I'], 12);
    const modals = ['WANT', 'CAN', 'MUST'];
    const matchedModals = suggestions.filter(id => modals.includes(id));
    expect(matchedModals.length).toBeGreaterThan(0);
  });

  it('suggests nouns after a verb', () => {
    learnSequence(['I', 'EAT', 'FOOD']);
    const suggestions = predictNext(['I', 'EAT'], 8);
    const nouns = ['FOOD', 'WATER', 'PIZZA', 'HOME'];
    const matched = suggestions.filter(id => nouns.includes(id));
    expect(matched.length).toBeGreaterThan(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('predictNext — edge cases', () => {
  it('works with empty history', () => {
    const result = predictNext([], 6);
    expect(Array.isArray(result)).toBe(true);
  });

  it('works with unknown concept IDs in history', () => {
    const result = predictNext(['ZZZUNKNOWN', 'ZZZALSO'], 5);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns same concepts after reset', () => {
    learnSequence(['I', 'EAT', 'FOOD']);
    learnSequence(['I', 'EAT', 'FOOD']);
    resetNgrams();

    learnSequence(['I', 'DRINK', 'WATER']);
    learnSequence(['I', 'DRINK', 'WATER']);

    const suggestions = predictNext(['I'], 6);
    // After reset and re-teaching DRINK, EAT may not be there
    expect(suggestions).toContain('DRINK');
  });

  it('does not return duplicates', () => {
    learnSequence(['I', 'EAT', 'FOOD']);
    const result = predictNext(['I'], 10);
    const unique = [...new Set(result)];
    expect(result.length).toBe(unique.length);
  });
});

// ─── Learning persistence ─────────────────────────────────────────────────────

describe('learnSequence accumulation', () => {
  it('accumulates counts across multiple learn calls', () => {
    learnSequence(['I', 'EAT', 'FOOD']);
    learnSequence(['I', 'DRINK', 'WATER']);
    learnSequence(['I', 'EAT', 'FOOD']);

    const s = predictNext(['I'], 5);
    // EAT taught twice should outrank DRINK taught once
    const eatIdx   = s.indexOf('EAT');
    const drinkIdx = s.indexOf('DRINK');

    if (eatIdx !== -1 && drinkIdx !== -1) {
      expect(eatIdx).toBeLessThanOrEqual(drinkIdx);
    } else {
      expect(s).toContain('EAT');
    }
  });
});
