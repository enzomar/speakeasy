# CLAUDE.md — Project Instructions for AI Assistants

> **Project:** SpeakEasy AAC  
> **Owner:** Solo founder  
> **Stack:** React 19 · Vite 7 · Capacitor 8 · WebLLM · Transformers.js  
> **No backend.** Everything runs client-side or via hosted third-party services.

---

## 1. Architecture Overview

SpeakEasy is an Augmentative and Alternative Communication (AAC) app for people
with speech disabilities. It runs entirely on-device with on-device AI.

| Layer | Technology |
|-------|-----------|
| UI | React 19 + Vite 7 |
| Native shell | Capacitor 8 (iOS + Android) |
| On-device LLM | @mlc-ai/web-llm (Qwen3, 4-bit, WebGPU) |
| On-device STT | @xenova/transformers (Whisper, ONNX WASM) |
| RAG embeddings | @xenova/transformers (MiniLM-L6-v2, 384-d) |
| TTS | @capacitor-community/text-to-speech / Web Speech API |
| Auth | Firebase Auth (frontend SDK only) |
| Subscriptions | RevenueCat (native IAP only) |
| State | localStorage (no database) |
| Languages | 10: en, es, fr, de, it, pt, ar, zh, ja, ko |

---

## 2. PROTECTED FILES — DO NOT EXPOSE OR WEAKEN

The `src/engine/` directory contains the **proprietary language engine** — the
core IP of the product. These files must NEVER be:

- Logged, printed, or echoed to stdout/stderr in full
- Copied into prompts, comments, or documentation verbatim
- Moved to a public directory or made accessible without the app bundle
- Simplified, gutted, or replaced with stubs without explicit owner approval
- Exposed via new API endpoints, debug routes, or console globals

### Protected engine files

| File | Role |
|------|------|
| `src/engine/sentenceBuilder.js` | Core grammar pipeline (concept → surface form) |
| `src/engine/sentenceOrchestrator.js` | Confidence-based correction pipeline |
| `src/engine/conceptPredictor.js` | N-gram prediction model |
| `src/engine/confidenceScorer.js` | Grammar + morphology + n-gram scoring |
| `src/engine/morphologyEngine.js` | Verb/noun/pronoun inflection (10 languages) |
| `src/engine/llmCorrector.js` | Gemini-powered sentence polishing |
| `src/engine/hierarchyBridge.js` | Grid tap → concept ID mapping |
| `src/engine/correctionCache.js` | Persistent AI-correction cache |
| `src/engine/lexicon.json` | Concept lexicon (types, labels, 10 languages) |
| `src/engine/morphologyTables.json` | Conjugation + declension tables |
| `src/engine/grammarGraph.json` | Directed graph of valid sentence structures |

### Protected prompt/prediction files

| File | Role |
|------|------|
| `src/prompts/intentPrompt.js` | Heuristic template engine + gender fixer |
| `src/prompts/heuristicData.js` | POS dictionary + combo templates |
| `src/prompts/intentEmotionEngine.js` | Intent/emotion classification |
| `src/prompts/categoryEngines.js` | Per-category prediction logic |

### Protected AI features

| File | Role |
|------|------|
| `src/features/prediction/useAIPrediction.js` | WebLLM + Gemini prediction hook |
| `src/features/prediction/predictionEngine.js` | Prediction orchestration |
| `src/features/prediction/ragMemory.js` | On-device RAG (MiniLM-L6-v2 embeddings) |
| `src/features/listen/useWhisper.js` | On-device Whisper STT |

---

## 3. SECRETS & API KEYS

- `src/engine/llmCorrector.js` contains a built-in Gemini API key (`GEMINI_BUILT_IN_KEY`).
  **Never** log this key, add it to a new file, or expose it in client-facing output.
- Firebase config comes from `VITE_FIREBASE_*` env vars in `.env.local` — never hardcode.
- RevenueCat keys come from `VITE_RC_*` env vars — never hardcode.
- If you need to reference an API key in code, use `import.meta.env.VITE_*` pattern.

---

## 4. BUILD & DEV COMMANDS

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run test         # vitest run
npm run lint         # eslint

# Capacitor
npm run cap:sync     # Build + sync to native
npm run cap:ios      # Build + sync + open Xcode
npm run cap:android  # Build + sync + open Android Studio

# Makefile shortcuts
make dev             # Start dev server
make build           # Production build
make android         # Full Android build + open
make ios             # Full iOS build + open
make clean           # Delete build artefacts
make setup-hooks     # Install pre-commit hook (auto patch-bump)
```

---

## 5. CODING CONVENTIONS

### General
- **ESM only** — all source uses `import`/`export` (package.json `"type": "module"`)
- **No TypeScript** — plain JSX/JS with JSDoc type annotations where needed
- **React 19** — use hooks, functional components only, no class components
- **No backend** — this is a solo-founder project with zero server infrastructure
- All state lives in `localStorage` — no database, no server sync

### File organization
```
src/
  app/          — App shell (App.jsx, native.js)
  data/         — Static data (hierarchy, symbols, languages, word frequency)
  engine/       — ⚠️ PROPRIETARY language engine (see §2)
  features/     — Feature modules (prediction, listen, onboarding, etc.)
  i18n/         — Translations
  landing/      — Landing page components (if any)
  prompts/      — ⚠️ Heuristic templates, intent/emotion engines (see §2)
  services/     — Firebase auth, RevenueCat, subscription logic
  shared/       — Shared hooks, utilities, platform detection
```

### Style
- Indent: 2 spaces
- Strings: single quotes in JS, double quotes in JSX attributes
- Semicolons: yes (sometimes omitted in existing code — match surrounding style)
- Console logging: use `[SpeakEasy ✨]` prefix for orchestrator, `[SpeakEasy:*]` for subsystem debug logs
- Debug logging gated behind `import.meta.env.VITE_DEBUG === '1'` or `globalThis.__SPEAKEASY_DEBUG__`

### JSON imports
- Engine files use `assert { type: 'json' }` for JSON imports (Node 20 syntax)
- This may produce build warnings — these are known and harmless

### Vite config
- `vite.config.js` has custom middleware for landing page routing and COOP/COEP headers
- WASM/ONNX/model files return 404 in dev to force CDN fallback
- Chunk size warning limit is 50 MB (web-llm ships large WASM)
- Manual chunks: `react-vendor`, `transformers-vendor`

---

## 6. CRITICAL CONSTRAINTS

1. **No backend** — Do not suggest adding a server, serverless functions, or
   database. All logic must run in-browser or via hosted third-party SDKs
   (Firebase Auth, RevenueCat, Gemini API).

2. **Offline-first** — The app must work without internet. AI features
   (LLM, STT, embeddings) run on-device via WebGPU/WASM. The Gemini corrector
   is optional — the deterministic engine is the primary path.

3. **10-language support** — Any change to the engine, lexicon, or morphology
   must work across all 10 languages (en, es, fr, de, it, pt, ar, zh, ja, ko).
   Test with at least English + one Romance + one CJK language.

4. **Accessibility** — This is an AAC app for users with disabilities. Never
   break keyboard nav, screen reader support, or touch target sizes (min 44×44).

5. **Bundle size awareness** — Web-llm and transformers are already large.
   Do not add new heavy dependencies without explicit approval. Prefer
   tree-shakeable ESM packages.

6. **PWA + Capacitor dual target** — The app runs as both a PWA (Vercel) and
   a native app (Capacitor). Changes must work in both contexts. Check
   `isNative` from `src/shared/platform.js` for platform-specific branching.

7. **Pre-commit hook** — The repo has a pre-commit hook (`scripts/pre-commit.sh`)
   that auto-increments the patch version. Do not bypass with `--no-verify`.

---

## 7. LANDING PAGE

- `public/landing.html` — Static landing page served at `/` (Vite middleware in dev, Vercel in prod)
- `public/landing.js` — 10-language translations object
- `public/landing.css` — Landing page styles
- These files are **separate** from the React app (`/app` route)
- Landing page uses preview-state messaging (early access, no pricing displayed)
- All CTAs link to `/app` for the web preview

---

## 8. TESTING

```bash
npm run test                    # Run all tests (vitest)
npm run test:watch              # Watch mode

# Engine grid test (generates output for all L1→L2→L3 combos)
node scripts/test-grid-combinations.mjs --lang en
node scripts/test-grid-combinations.mjs --lang fr --dir output-test-grid-fr
```

After any engine change, run the grid test for at least English and French to
verify sentence output hasn't regressed.

---

## 9. DEPLOYMENT

- **Web (PWA):** Push to `main` → Vercel auto-deploys. Config in `vercel.json`.
- **iOS:** `make ios` → Xcode → Archive → App Store Connect
- **Android:** `make android` → Android Studio → Build Bundle → Play Console
- **Version bumps:** Automatic via pre-commit hook, or manual: `node scripts/bump-version.mjs`

---

## 10. DO NOT

- ❌ Add a backend, server, or database
- ❌ Expose engine source code in logs, docs, or debug output
- ❌ Remove or weaken the confidence-based correction pipeline
- ❌ Hardcode API keys (use `VITE_*` env vars)
- ❌ Break offline functionality
- ❌ Add dependencies >1 MB without explicit approval
- ❌ Remove language support (all 10 languages must be maintained)
- ❌ Skip testing after engine changes
- ❌ Use `--no-verify` on git commits
- ❌ Create public API endpoints or expose internal state via `window.*` globals
