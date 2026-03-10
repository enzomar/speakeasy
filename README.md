# SpeakEasy

**An Augmentative and Alternative Communication (AAC) app with on-device AI, built for people who need a voice.**

SpeakEasy runs entirely in the browser or as a native iOS/Android app — no server, no cloud, no account required. Tap symbols to build sentences, and the app speaks them aloud using high-quality text-to-speech. An on-device language model provides contextual reply suggestions when someone speaks to you.

---

## Features

### Symbol Board
- **100+ built-in symbols** organised across 8 categories: Social, People, Feelings, Actions, Food, Places, Things, and Descriptors
- Each symbol shows an emoji and a localised label
- Tap symbols to compose messages; freely mix tapping and typing
- Category grid with drill-down navigation and quick-phrase / emergency tabs

### Intelligent Prediction Pipeline
SpeakEasy uses a **three-tier prediction system**, all running 100% on-device:

| Tier | Trigger | Latency | What it does |
|------|---------|---------|-------------|
| **Heuristic templates** | Every symbol tap | 0 ms | POS-aware sentence candidates from per-language templates |
| **Gender agreement fixer** | Post-heuristic | 0 ms | Rule-based suffix correction (IT/FR/ES) — no LLM needed |
| **N-gram engine** | Background | < 1 ms | Bigram/trigram predictions learned from your speech history |
| **On-device LLM** | Listen Mode only | 1-3 s | Contextual reply generation when someone speaks to you |

The LLM (Qwen3 0.6B–1.7B via WebGPU) is **reserved for Mode B** — generating contextual replies to overheard speech. Simple symbol-tap predictions use instant heuristics, making the app responsive even on low-end devices.

### RAG Memory
- Powered by [MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (~23 MB) — embeds your past utterances into 384-d vectors stored in `localStorage`
- Retrieves the most relevant context to improve LLM reply suggestions
- All inference runs 100% offline with zero data leaving the device

### Listen Mode (Two-Stage)
- **Stage 1 – Wake word detection**: Mic open with energy VAD → short Whisper transcription → keyword match
- **Stage 2 – Full transcription**: Records full utterance → Whisper STT → LLM generates 5 contextual replies
- User can **tap a reply** (speaks it via TTS), **type their own reply** using the board, or **listen again**
- Runs entirely on-device using [@xenova/transformers](https://github.com/xenova/transformers.js) (Whisper ONNX WASM)

### Multilingual Support
10 languages with full UI translation, localised symbol labels, and per-language TTS voices:

| Language | Code | TTS |
|----------|------|-----|
| 🇬🇧 English | `en` | `en-US` |
| 🇪🇸 Español | `es` | `es-ES` |
| 🇫🇷 Français | `fr` | `fr-FR` |
| 🇩🇪 Deutsch | `de` | `de-DE` |
| 🇮🇹 Italiano | `it` | `it-IT` |
| 🇧🇷 Português | `pt` | `pt-BR` |
| 🇸🇦 العربية | `ar` | `ar-SA` |
| 🇨🇳 中文 | `zh` | `zh-CN` |
| 🇯🇵 日本語 | `ja` | `ja-JP` |
| 🇰🇷 한국어 | `ko` | `ko-KR` |

Separate **UI language**, **typing language**, **TTS language**, and **listening language** settings for bilingual users.

### Text-to-Speech
- **Native TTS** on iOS/Android via `@capacitor-community/text-to-speech`
- **Web Speech API** on desktop/mobile browsers with smart voice selection — automatically prefers premium, enhanced, natural, and neural voices
- Adjustable **speed** and **pitch**, selectable **voice name**, and a **Try Voice** button to preview settings
- Haptic feedback on native platforms when speaking
- Gender-aware voice preferences

### Accessibility & UX
- **Left/right-handed mode** — flips action button layout for comfortable one-handed use
- iOS-inspired native design: translucent blur headers, system font stack, smooth animations
- Mobile-first responsive layout — full-width, optimised for one-thumb use
- 60+ avatar emoji options including skin-tone variants, roles, animals, and accessibility symbols
- History panel with phrase frequency tracking, export, and one-tap replay

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev) + [Vite 7](https://vite.dev) |
| Native | [Capacitor 8](https://capacitorjs.com) (iOS + Android) |
| AI / LLM | [@mlc-ai/web-llm](https://github.com/AlibabaGroup/MLC-LLM) (Qwen3, 4-bit, WebGPU) |
| STT | [@xenova/transformers](https://github.com/xenova/transformers.js) (Whisper ONNX WASM) |
| Embeddings | [@xenova/transformers](https://github.com/xenova/transformers.js) (MiniLM-L6-v2, 384-d) |
| Icons | [Lucide React](https://lucide.dev) |
| TTS | Web Speech API / Capacitor TTS plugin |
| Storage | `localStorage` (settings, history, RAG vectors, n-gram model) |

---

## Project Structure

```
speakeasy/
├── public/                          # Static assets (logo, icons)
├── src/
│   ├── main.jsx                     # React root mount + ErrorBoundary
│   ├── index.css                    # Design system (CSS variables, light/dark)
│   ├── app/
│   │   ├── App.jsx                  # Root orchestrator (~690 lines)
│   │   ├── App.css                  # App-specific styles
│   │   └── native.js                # Capacitor bootstrap + haptic()
│   ├── features/
│   │   ├── board/                   # CategoryGrid, SymbolPicker, PhraseGrid,
│   │   │                            #   SmartKeyboard, IntentBar, SymbolButton, etc.
│   │   ├── composer/                # MessageBar (sentence builder + speak)
│   │   ├── prediction/              # useAIPrediction, usePrediction,
│   │   │                            #   predictionEngine, ragMemory
│   │   ├── listen/                  # useListenMode, useWhisper, ListenOverlay,
│   │   │                            #   audioCapture, wakeWordDetector
│   │   ├── history/                 # HistoryPanel, useStorage
│   │   ├── settings/                # SettingsPanel, AIModelModal, useSettings
│   │   ├── profile/                 # ProfilePanel
│   │   └── symbols/                 # SymbolsPage, useCustomSymbols
│   ├── i18n/
│   │   ├── languages.js             # LANGUAGES, LANG_MAP, ACTIVATION_KEYWORDS
│   │   ├── translations.js          # Symbol / category / hierarchy translations
│   │   ├── ui-strings.js            # UI_STRINGS + getUI() for 6 languages
│   │   └── useLanguage.js           # 4-dimension language state hook
│   ├── data/
│   │   ├── symbols.js               # AAC symbol definitions (9 categories)
│   │   ├── hierarchy.js             # Category → subcategory → symbol tree
│   │   ├── boardTabs.js             # Board tabs + default phrases
│   │   ├── wordFrequency.js         # Word frequency data
│   │   └── posLookup.js             # POS lookup table
│   ├── shared/
│   │   ├── platform.js              # Capacitor platform detection
│   │   ├── ui/                      # ConfirmSheet, HelpModal, settingsUI,
│   │   │                            #   ErrorBoundary
│   │   └── hooks/                   # useFavorites, useQuickPhrases, useTTS
│   └── prompts/
│       └── intentPrompt.js          # Heuristic templates, gender fixer,
│                                    #   LLM prompt builders, parsers
├── docs/
│   └── ARCHITECTURE.md              # Detailed architecture document
├── claude.md                        # AI assistant rules for this project
├── capacitor.config.json            # Capacitor configuration
├── vite.config.js                   # Vite build config (COOP/COEP, WASM)
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install & Run (Web)

```bash
git clone https://github.com/your-username/speakeasy.git
cd speakeasy
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a browser with **WebGPU support** (Chrome 113+, Edge 113+) for AI predictions.

### Build for Production

```bash
npm run build
npm run preview
```

### Native (iOS / Android)

Requires [Xcode](https://developer.apple.com/xcode/) (iOS) or [Android Studio](https://developer.android.com/studio) (Android).

```bash
npm run cap:sync          # Build + sync to native platforms
npm run cap:ios           # Build, sync, open in Xcode
npm run cap:android       # Build, sync, open in Android Studio
npm run cap:run:ios       # Build, sync, run on iOS device
npm run cap:run:android   # Build, sync, run on Android device
```

---

## AI Models

SpeakEasy ships with four model options (used for **Mode B — Listen Mode replies only**):

| Model | Size | VRAM | Speed | Use case |
|-------|------|------|-------|----------|
| **Qwen3 0.6B** (fast) | ~400 MB | ~500 MB | ~25 tok/s | Most WebGPU devices |
| **Qwen3 1.7B** (quality) | ~900 MB | ~1 GB | ~15 tok/s | Desktop + high-end mobile |
| **Gemma 3 1B** | ~600 MB | ~700 MB | ~20 tok/s | Balanced speed & quality |
| **Qwen2.5 0.5B** | ~300 MB | ~400 MB | ~30 tok/s | Smallest + fastest download |

The model is downloaded once and cached by the browser. Switch between models in **Settings → AI Engine**.

### How Prediction Works

```
Symbol tap ──► Heuristic templates (0ms) ──► Gender fixer (0ms) ──► Display
                                                                       │
Listen Mode ──► Whisper STT ──► LLM Mode B (1-3s) ──► Reply pills ────┘
                                                                       │
Background ────► N-gram engine learns from spoken phrases ─────────────┘
```

1. **Heuristic templates** generate 5 POS-aware sentences instantly per symbol tap
2. **Gender agreement fixer** applies rule-based suffix correction (IT: `-ato → -ata`, FR: `-é → -ée`, ES: `-ado → -ada`)
3. **N-gram engine** provides bigram/trigram suggestions from your history (< 1 ms)
4. **LLM** generates contextual replies only in Listen Mode when someone speaks to you
5. **RAG memory** retrieves your most similar past utterances to improve LLM context

---

## Privacy

- **Zero cloud dependency** — all data stays on your device
- No accounts, no analytics, no telemetry
- AI models run locally via WebGPU/WASM
- History and RAG vectors stored in `localStorage` — clear them anytime from **Settings → Data & Privacy**
- Export your phrase history as a file at any time

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run cap:sync` | Build + sync to Capacitor platforms |
| `npm run cap:ios` | Build, sync, and open in Xcode |
| `npm run cap:android` | Build, sync, and open in Android Studio |
| `npm run cap:run:ios` | Build, sync, and run on iOS device |
| `npm run cap:run:android` | Build, sync, and run on Android device |

---

## Browser Compatibility

| Feature | Chrome 113+ | Safari 17+ | Firefox | Mobile Chrome |
|---------|-------------|------------|---------|---------------|
| Core app | ✅ | ✅ | ✅ | ✅ |
| Web Speech TTS | ✅ | ✅ | ✅ | ✅ |
| WebGPU (AI) | ✅ | ✅ | ❌ | ✅ (Android) |
| WASM fallback | ✅ | ✅ | ✅ | ✅ |

> **Note:** On browsers without WebGPU, the AI prediction gracefully degrades to heuristic + n-gram suggestions only. The core AAC functionality works everywhere.

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>SpeakEasy</strong> — Everyone deserves a voice.
</p>
