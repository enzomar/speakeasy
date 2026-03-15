/**
 * index.js — Public API for the SpeakEasy AAC Language Engine
 *
 * Usage:
 *   import { buildSentence, predictNext, correctSentence, learnSequence } from './engine/index.js';
 *
 *   // Build a sentence from concept IDs
 *   const result = buildSentence(['I', 'WANT', 'EAT', 'PIZZA'], 'it');
 *   // → { text: "Voglio mangiare pizza.", lang: "it", confidence: 0.9 }
 *
 *   // Get next-concept predictions
 *   const suggestions = predictNext(['I', 'WANT'], 6);
 *   // → ["EAT", "DRINK", "GO", "HELP", "PLAY", "READ"]
 *
 *   // Optional: polish with LLM
 *   const polished = await correctSentence(result.text, 'it');
 *
 *   // Learn from confirmed sentences
 *   learnSequence(['I', 'WANT', 'EAT', 'PIZZA']);
 *
 * @module engine
 */

export { buildSentence } from './sentenceBuilder.js';

export {
  predictNext,
  learnSequence,
  resetNgrams,
  loadNgrams,
  saveNgrams,
  scoreSequenceProbability,
} from './conceptPredictor.js';

export { correctSentence } from './llmCorrector.js';

export {
  inflectVerb,
  inflectNoun,
  inflectPronoun,
  getCopula,
} from './morphologyEngine.js';

// Confidence scoring
export {
  scoreGrammar,
  scoreMorphology,
  computeConfidence,
} from './confidenceScorer.js';

// Correction cache
export {
  buildCacheKey,
  getCached,
  setCached,
  hasCached,
  deleteCached,
  clearCache,
  inspectCache,
  cacheSize,
} from './correctionCache.js';

// Main pipeline — async (calls LLM when confidence < threshold)
// Sync variant — instant, never calls LLM
export {
  generate,
  generateSync,
  DEFAULT_THRESHOLD,
  DEFAULT_WEIGHTS,
} from './sentenceOrchestrator.js';

// Hierarchy↔Engine bridge — maps grid tap labels to concept IDs
export {
  labelToConceptId,
  labelsToConceptIds,
  tapContextToConceptIds,
  isKnownConcept,
  l1CategoryToConceptId,
} from './hierarchyBridge.js';

// Concept Registry — single semantic source of truth
export {
  lookupConcept,
  resolveHierarchyId,
  hierarchyToConcept,
  conceptToHierarchyIds,
  getSemanticRole,
  getConceptsByRole,
  getConceptsByType,
  getLabel,
  isKnown,
  allConcepts,
  getL2SemanticType,
  getL2sBySemanticType,
  getRelationsFrom,
  getRelationsTo,
  getRelated,
  getInverseRelated,
  getSemanticNeighbors,
} from './conceptRegistry.js';

// Usage analytics — local tap/suggestion tracking
export {
  recordTap,
  recordSuggestionsShown,
  recordSuggestionPicked,
  recordCorrection,
  getTopL2,
  getTopTapPaths,
  getSuggestionPickRate,
  getCorrectionRate,
  getRecentHistory,
  getTapCount,
  persistStats,
  loadStats,
  resetStats,
} from './usageTracker.js';

// Grammar patterns — compositional sentence generation from semantic types
export {
  generateFromGrammar,
  generateFromGrammarL3,
  hasGrammarPattern,
} from './grammarPatterns.js';

// Re-export the raw data for external inspection if needed
export { default as LEXICON }       from './lexicon.json'       assert { type: 'json' };
export { default as GRAMMAR_GRAPH } from './grammarGraph.json'  assert { type: 'json' };
