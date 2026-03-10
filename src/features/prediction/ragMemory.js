/**
 * RAG Memory — On-Device Retrieval-Augmented Generation
 * ======================================================
 * Uses @xenova/transformers (Xenova/all-MiniLM-L6-v2, ~23 MB) to embed
 * user utterances into 384-d Float32 vectors, stored in localStorage.
 * At query time, computes cosine similarity to find the k closest past
 * phrases, which are injected into the LLM prompt as grounding context.
 *
 * WHY THIS APPROACH:
 *  • No server round-trips — works 100% offline.
 *  • MiniLM-L6-v2 is tiny enough to load in < 2 seconds on modern phones.
 *  • Cosine search over ≤ 200 vectors is instant (< 1 ms).
 *
 * EXTENDING:
 *  • Replace Float32Array brute-force search with HNSW (hnswlib-wasm) for
 *    10 000+ phrase libraries.
 *  • Add per-category embedding spaces for multi-context users.
 *  • Sync vector store to IndexedDB for larger storage quotas.
 *
 * QUANTIZATION NOTE (for native mobile via llama.cpp):
 *  • Use gguf Q4_K_M of Qwen/Qwen3-1.7B or Qwen/Qwen2.5-1.5B-Instruct.
 *  • On Android: bundle via JNI with llama.cpp; iOS: Metal backend via
 *    llama.cpp Swift bindings or LLM Farm.
 *  • Q4_K_M gives ~900 MB on disk with < 1 GB RAM, suitable for mid-range
 *    phones (Snapdragon 778+, Apple A14+).
 *  • Inference speed: ~20–40 tok/s on Apple M-series, ~8–15 tok/s on
 *    Snapdragon 8 Gen 2 (CPU).
 */

import { pipeline, env as xenovaEnv } from "@xenova/transformers";

// Force all model fetches to go to the HuggingFace CDN, never to the local
// dev server or Capacitor's WebView origin.  Without explicit remoteHost +
// remotePathTemplate, some bundlers/WebViews resolve model paths relative to
// the app origin, causing the SPA fallback to return index.html (HTML) instead
// of the JSON config — triggering "Unexpected token '<'" parse errors.
xenovaEnv.allowLocalModels    = false;
xenovaEnv.useBrowserCache     = true;
xenovaEnv.remoteHost          = "https://huggingface.co/";
xenovaEnv.remotePathTemplate  = "{model}/resolve/{revision}/";

const STORE_KEY = "speakeasy_rag_v1";
const MAX_DOCS  = 300; // cap at 300 embeddings to keep localStorage < 2 MB

let embedder = null; // lazy-loaded singleton
let embedderFailed = false; // skip retries if model can't load

// ── Embedding ─────────────────────────────────────────────────────────────────

/**
 * Load the embedding pipeline (once). Downloads and caches the model files
 * from the HuggingFace CDN on first run.
 * Returns null if the model cannot be loaded (e.g. offline, network blocked).
 */
async function getEmbedder() {
  if (embedder) return embedder;
  if (embedderFailed) return null;
  try {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true } // use INT8 ONNX — ~23 MB, fast on-device
    );
    console.info("[RAG] Embedding model ready.");
    return embedder;
  } catch (err) {
    const hint = err.message?.includes("<!doctype") || err.message?.includes("Unexpected token")
      ? "Model fetch returned HTML — likely a network or CORS issue."
      : err.message;
    console.warn("[RAG] Embedding model failed to load — RAG disabled:", hint);
    embedderFailed = true;
    return null;
  }
}

/**
 * Embed a single piece of text, returning a normalised Float32Array of length 384.
 * Returns null if the embedder is unavailable.
 * @param {string} text
 * @returns {Promise<Float32Array|null>}
 */
async function embed(text) {
  const model = await getEmbedder();
  if (!model) return null;
  const output = await model(text, { pooling: "mean", normalize: true });
  return output.data; // Float32Array
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

// ── Persistence ───────────────────────────────────────────────────────────────

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Revive plain arrays back to Float32Arrays
    return parsed.map(doc => ({
      ...doc,
      vec: new Float32Array(doc.vec),
    }));
  } catch {
    return [];
  }
}

function saveStore(docs) {
  try {
    // Serialise Float32Arrays to plain arrays for JSON
    const serialisable = docs.map(d => ({ ...d, vec: Array.from(d.vec) }));
    localStorage.setItem(STORE_KEY, JSON.stringify(serialisable));
  } catch {
    // Quota exceeded — keep newest half and retry once
    try {
      const newest = docs.slice(0, Math.ceil(docs.length / 2)); // docs are newest-first
      localStorage.setItem(STORE_KEY, JSON.stringify(newest.map(d => ({ ...d, vec: Array.from(d.vec) }))));
    } catch { /* give up */ }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a new utterance to the RAG store.
 * Duplicates (same lowercased text) are deduplicated by bumping count.
 *
 * @param {string} text - The spoken phrase to remember.
 * @returns {Promise<void>}
 */
export async function ragAdd(text) {
  if (!text?.trim()) return;
  const trimmed = text.trim();
  const docs    = loadStore();

  const existing = docs.find(d => d.text.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.count     = (existing.count || 1) + 1;
    existing.updatedAt = Date.now();
    saveStore(docs);
    return;
  }

  const vec = await embed(trimmed);
  if (!vec) return; // embedder unavailable
  const newDoc = {
    id:        Date.now(),
    text:      trimmed,
    vec,
    count:     1,
    updatedAt: Date.now(),
  };

  const updated = [newDoc, ...docs].slice(0, MAX_DOCS);
  saveStore(updated);
}

/**
 * Retrieve the k most-similar past utterances for a given query string.
 *
 * @param {string} query   - Current partial sentence or last word(s).
 * @param {number} [k=5]   - Number of results to return.
 * @param {number} [minSim=0.25] - Minimum cosine similarity threshold.
 * @returns {Promise<Array<{text:string, score:number, count:number}>>}
 */
export async function ragQuery(query, k = 5, minSim = 0.25) {
  if (!query?.trim()) return [];
  const docs = loadStore();
  if (docs.length === 0) return [];

  const qVec = await embed(query.trim());
  if (!qVec) return [];

  const scored = docs
    .map(doc => ({
      text:  doc.text,
      score: cosine(qVec, doc.vec) + Math.log1p(doc.count ?? 1) * 0.05,
      count: doc.count ?? 1,
    }))
    .filter(d => d.score >= minSim)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored;
}

/**
 * Wipe the entire RAG store (e.g. from settings → Reset AI memory).
 */
export function ragReset() {
  localStorage.removeItem(STORE_KEY);
}

/**
 * Return the number of documents in the RAG store.
 */
export function ragSize() {
  return loadStore().length;
}
