/**
 * usePrediction — wraps PredictionEngine with React state.
 *
 * Re-computes suggestions whenever the sentence changes.
 * Debounces updates to avoid excessive computation while the user is tapping.
 *
 * EXTENDING:
 *  • Swap the engine.predict() call with an async fetch() to a cloud LLM
 *    endpoint — the API surface of this hook remains unchanged.
 *  • Add an `isLoading` flag for the async cloud case.
 */

import { useState, useCallback, useRef } from "react";
import { predictionEngine } from "../utils/predictionEngine";
import { SEED_HISTORY }     from "../data/symbols";

const DEBOUNCE_MS = 80;
let PREDICTION_READY = false;

function ensurePredictionEngine() {
  if (!PREDICTION_READY) {
    const hasSaved = predictionEngine.load();
    if (!hasSaved) {
      SEED_HISTORY.forEach(s => predictionEngine.learn(s));
    }
    PREDICTION_READY = true;
  }
  return predictionEngine.stats();
}

export function usePrediction() {
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats]             = useState(() => ensurePredictionEngine());
  const debounceRef                   = useRef(null);
  const [ready]                       = useState(true);

  /**
   * Recompute next-word suggestions for the given word array.
   * @param {string[]} words
   * @param {number}   [n=5]
   */
  const computeSuggestions = useCallback((words, n = 5) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestions(predictionEngine.predict(words, n));
    }, DEBOUNCE_MS);
  }, []);

  /**
   * Feed a completed utterance into the model so it learns from the user.
   * Call this after every successful speak().
   * @param {string} sentence
   */
  const learn = useCallback((sentence) => {
    predictionEngine.learn(sentence);
    setStats(predictionEngine.stats());
  }, []);

  /** Hard-reset the model (e.g. from a settings screen) */
  const resetModel = useCallback(() => {
    predictionEngine.reset();
    // Re-seed so the app doesn't start empty
    SEED_HISTORY.forEach(s => predictionEngine.learn(s));
    setStats(predictionEngine.stats());
    setSuggestions([]);
  }, []);

  return { suggestions, computeSuggestions, learn, resetModel, stats, ready };
}
