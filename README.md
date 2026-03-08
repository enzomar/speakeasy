# SpeakEasy

**An Augmentative and Alternative Communication (AAC) app with on-device AI, built for people who need a voice.**

SpeakEasy runs entirely in the browser or as a native iOS/Android app — no server, no cloud,  account is required. Tap symbols to build sentences, and the app speaks them aloud using high-quality text-to-speech. An on-device language model learns your patterns and suggests what you might say next.

---

## Features

### Symbol Board
- **100+ built-in symbols** organised across 8 categories: Social, People, Feelings, Actions, Food, Places, Things, and Descriptors
- Each symbol shows an emoji and a localised label
- Tap symbols to compose messages; freely mix tapping and typing
- Category filter with collapsible panel for quick navigation

### On-Device AI Prediction
- **WebLLM** runs a 4-bit quantised [Qwen2.5-0.5B](https://huggingface.co/Qwen) model directly in the browser via WebGPU
- **RAG Memory** powered by [MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) (~23 MB) — embeds your past utterances into vectors stored in `localStorage` and retrieves the most relevant context to improve predictions
- **N-gram fallback** — bigram/trigram prediction engine provides instant suggestions while the LLM loads
- All inference runs 100% offline with zero data leaving the device

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

Separate **typing language** and **TTS language** settings so you can type in one language and hear output in another.

### Text-to-Speech
- **Native TTS** on iOS/Android via `@capacitor-community/text-to-speech`
- **Web Speech API** on desktop/mobile browsers with smart voice selection — automatically prefers premium, enhanced, natural, and neural voices
- Adjustable **speed** and **pitch**, selectable **voice name**, and a **Try Voice** button to preview settings
- Haptic feedback on native platforms when speaking

### Accessibility & UX
- **Left/right-handed mode** — flips action button layout for comfortable one-handed use
- iOS-inspired native design: translucent blur headers, system font stack, smooth animations
- Mobile-first responsive layout — full-width, no artificial constraints
- History panel with phrase frequency tracking, export, and one-tap replay
- User profile with customisable display name and avatar emoji

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev) + [Vite 7](https://vite.dev) |
| Native | [Capacitor 8](https://capacitorjs.com) (iOS + Android) |
| AI / LLM | [@mlc-ai/web-llm](https://github.com/AlibabaGroup/MLC-LLM) (WebGPU) |
| Embeddings | [@xenova/transformers](https://github.com/xenova/transformers.js) (MiniLM-L6-v2) |
| Icons | [Lucide React](https://lucide.dev) |
| TTS | Web Speech API / Capacitor TTS plugin |
| Storage | `localStorage` (settings, history, RAG vectors) |

---

## Project Structure

```
speakeasy/
├── public/                     # Static assets
├── src/
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Root component, state management
│   ├── index.css               # Design system (CSS variables, animations)
│   ├── App.css                 # App-specific styles
│   ├── components/
│   │   ├── CategoryFilter.jsx  # Collapsible category selector
│   │   ├── HistoryPanel.jsx    # Past utterances list
│   │   ├── MessageBar.jsx      # Sentence builder + action buttons
│   │   ├── PredictionBar.jsx   # AI-powered next-word suggestions
│   │   ├── ProfilePanel.jsx    # Settings & preferences
│   │   ├── SymbolBoard.jsx     # Grid of tappable symbols
│   │   └── SymbolButton.jsx    # Individual symbol tile
│   ├── data/
│   │   ├── languages.js        # Language definitions, i18n strings
│   │   └── symbols.js          # Symbol/category definitions, seed phrases
│   ├── hooks/
│   │   ├── useAIPrediction.js  # WebLLM + RAG prediction hook
│   │   ├── useLanguage.js      # Language state management
│   │   ├── usePrediction.js    # Combined prediction (AI + n-gram)
│   │   ├── useStorage.js       # History persistence
│   │   └── useTTS.js           # Text-to-speech (native + web)
│   └── utils/
│       ├── platform.js         # Capacitor/web platform detection
│       ├── predictionEngine.js # N-gram bigram/trigram engine
│       └── ragMemory.js        # Vector store + cosine similarity search
├── capacitor.config.ts         # Capacitor configuration
├── vite.config.js              # Vite build configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install & Run (Web)

```bash
# Clone the repository
git clone https://github.com/your-username/speakeasy.git
cd speakeasy

# Install dependencies
npm install

# Start development server
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
# Build + sync to native platforms
npm run cap:sync

# Open in Xcode
npm run cap:ios

# Open in Android Studio
npm run cap:android

# Build + run on connected device
npm run cap:run:ios
npm run cap:run:android
```

---

## Configuration

All user preferences are stored in `localStorage` and can be changed from the **Profile** panel within the app:

| Setting | Description | Default |
|---------|-------------|---------|
| Display name | Shown in the profile header | — |
| Avatar emoji | Profile icon | 😊 |
| Typing language | Language for symbol labels and UI | English |
| TTS language | Voice output language | English |
| Voice name | Specific TTS voice | Auto (best available) |
| Voice speed | Speech rate (0.5–2×) | 1.0 |
| Voice pitch | Voice pitch (0–2) | 1.0 |
| AI model | `fast` (0.5B) or `default` (1.7B) | fast |
| Handedness | Left or right-handed layout | Right |

---

## AI Models

SpeakEasy ships with two model options:

| Model | Size | VRAM | Speed | Compatibility |
|-------|------|------|-------|---------------|
| **Qwen2.5-0.5B** (fast) | ~300 MB | ~400 MB | ~25 tok/s | Most WebGPU devices |
| **Qwen3-1.7B** (default) | ~900 MB | ~1 GB | ~15 tok/s | Desktop + high-end mobile |

The model is downloaded once and cached by the browser. Switch between models in **Profile → AI Engine**.

### How Prediction Works

1. **N-gram engine** provides instant bigram/trigram suggestions from your history (< 1 ms)
2. **RAG memory** retrieves the 5 most similar past utterances via cosine similarity over MiniLM embeddings
3. **LLM** generates context-aware next-word/phrase predictions using the RAG context
4. Results are merged and ranked — n-gram fills in while the LLM processes

---

## Privacy

- **Zero cloud dependency** — all data stays on your device
- No accounts, no analytics, no telemetry
- AI models run locally via WebGPU/WASM
- History and RAG vectors stored in `localStorage` — clear them anytime from **Profile → Data & Privacy**
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

> **Note:** On browsers without WebGPU, the AI prediction gracefully degrades to n-gram suggestions only. The core AAC functionality works everywhere.

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>SpeakEasy</strong> — Everyone deserves a voice.
</p>
