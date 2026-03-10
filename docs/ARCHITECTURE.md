# SpeakEasy AAC — Architecture Document

> **Version:** 2.0  
> **Date:** 9 March 2026  
> **Stack:** React 19 · Vite 7 · Capacitor 8 · WebLLM · Transformers.js

---

## 1. System Overview

SpeakEasy is an Augmentative and Alternative Communication (AAC) app designed
for people with speech disabilities. It runs entirely on-device — no cloud
services required — using on-device AI for intent prediction, speech-to-text,
and RAG-based personalisation.

---

## 2. Technology Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| UI Framework       | React 19 + Vite 7                                          |
| Native Shell       | Capacitor 8 (iOS + Android)                                |
| On-device LLM      | @mlc-ai/web-llm (Qwen3-1.7B / Qwen2.5-0.5B, 4-bit, WebGPU) |
| On-device STT       | @xenova/transformers (Whisper tiny/base, ONNX WASM)       |
| RAG Embeddings     | @xenova/transformers (MiniLM-L6-v2, 384-d vectors)         |
| TTS                | @capacitor-community/text-to-speech / Web Speech API        |
| Icons              | lucide-react                                                |
| State Persistence  | localStorage                                                |
| Internationalisation | 10 languages (en, es, fr, de, it, pt, ar, zh, ja, ko)    |

---

## 3. Package Diagram

```mermaid
graph TB
    subgraph Entry
        main.jsx
        index.html
    end

    subgraph Orchestrator
        App.jsx
    end

    subgraph Components
        subgraph Communication
            MessageBar
            IntentBar
            PredictionBar
            SymbolButton
        end
        subgraph Navigation
            CategoryGrid
            SymbolPicker
            SymbolBoard
            CategoryFilter
            BoardTabStrip
        end
        subgraph Content
            PhraseGrid
            CoreWordGrid
            SmartRow
            FavoritesBar
            RecentPhrasesBar
        end
        subgraph Pages
            HistoryPanel
            ProfilePanel
            SymbolsPage
            FavoritesPage
            HelpModal
        end
        subgraph Listen_Mode
            ListenModePanel
        end
        subgraph Shared
            ConfirmSheet
            ErrorBoundary
        end
    end

    subgraph Hooks
        useTTS
        usePrediction
        useAIPrediction
        useWhisper
        useListenMode
        useStorage
        useLanguage
        useFavorites
        useCustomSymbols
        useQuickPhrases
        useSymbolOrder
    end

    subgraph Utilities
        predictionEngine
        ragMemory
        audioCapture
        platform
    end

    subgraph Data
        symbols.js
        languages.js
        boardTabs.js
    end

    subgraph Prompts
        intentPrompt.js
    end

    subgraph External_Libraries
        web-llm
        transformers.js
        capacitor
        WebSpeechAPI["Web Speech API"]
    end

    main.jsx --> App.jsx
    App.jsx --> Components
    App.jsx --> Hooks
    Hooks --> Utilities
    Hooks --> Data
    useAIPrediction --> intentPrompt.js
    useAIPrediction --> web-llm
    useAIPrediction --> ragMemory
    useWhisper --> transformers.js
    ragMemory --> transformers.js
    useTTS --> capacitor
    useTTS --> WebSpeechAPI
    useListenMode --> audioCapture
    useListenMode --> useWhisper
    predictionEngine -.-> localStorage[(localStorage)]
    ragMemory -.-> localStorage
    useStorage -.-> localStorage
    useFavorites -.-> localStorage
    useLanguage -.-> localStorage
```

---

## 4. Component Diagram

```mermaid
graph TB
    App["App.jsx<br/>(Orchestrator)"]:::orchestrator

    subgraph Board_Tab["Board Tab"]
        MB["MessageBar"]
        IB["IntentBar"]
        CG["CategoryGrid<br/>(3×3 Home)"]
        SP["SymbolPicker<br/>(Category Drill)"]
        PG["PhraseGrid<br/>(Quick/Emergency)"]
    end

    subgraph Other_Tabs["Other Tabs"]
        HP["HistoryPanel"]
        SYM["SymbolsPage"]
        PP["ProfilePanel"]
    end

    subgraph Overlays
        LMP["ListenModePanel"]
        HM["HelpModal"]
        CS["ConfirmSheet"]
    end

    subgraph Hooks_Layer["Hooks Layer"]
        hTTS["useTTS"]
        hPred["usePrediction"]
        hAI["useAIPrediction"]
        hStore["useStorage"]
        hLang["useLanguage"]
        hListen["useListenMode"]
        hWhisp["useWhisper"]
        hFav["useFavorites"]
        hCSym["useCustomSymbols"]
        hQP["useQuickPhrases"]
    end

    subgraph AI_ML["AI / ML Layer"]
        PE["PredictionEngine<br/>(n-gram)"]
        RAG["RAG Memory<br/>(MiniLM-L6)"]
        LLM["WebLLM<br/>(Qwen 0.5B/1.7B)"]
        WH["Whisper<br/>(ONNX WASM)"]
        IP["Intent Prompt<br/>(System + User)"]
    end

    subgraph Data_Layer["Data Layer"]
        DSym["symbols.js"]
        DLang["languages.js"]
        DTab["boardTabs.js"]
        LS[(localStorage)]
    end

    App --> MB & IB & CG & SP & PG
    App --> HP & SYM & PP
    App --> LMP & HM

    App --> hTTS & hPred & hAI & hStore & hLang & hListen & hFav & hCSym & hQP

    hAI --> PE & RAG & LLM & IP
    hPred --> PE
    hListen --> hWhisp
    hWhisp --> WH

    hStore & hFav & hLang --> LS
    PE & RAG --> LS

    SP --> DSym & DLang
    hLang --> DLang
    hQP --> DTab

    classDef orchestrator fill:#add8e6,stroke:#333
```

---

## 5. Class Diagram — Core Domain

```mermaid
classDiagram
    class PredictionEngine {
        -unigrams: Map~string, number~
        -bigrams: Map~string, Map~string, number~~
        -trigrams: Map~string, Map~string, number~~
        -phrases: Map~string, number~
        +learn(sentence: string) void
        +predict(words: string[], n: number) string[]
        +predictIntents(words: string[], n: number, langCode: string) string[]
        +save() void
        +load() boolean
        +reset() void
        +stats() Object
    }

    class RAGMemory {
        -docs: Array~text, vector~
        -embedder: Pipeline
        +ragAdd(text: string) Promise~void~
        +ragQuery(text: string, k: number) Promise~Array~
        +ragReset() void
    }

    class AudioCapture {
        -audioContext: AudioContext
        -analyser: AnalyserNode
        -processor: ScriptProcessorNode
        +start() Promise~void~
        +stop() Float32Array
        +getRecordingBuffer() Float32Array
        +getEnergy() number
    }

    class IntentPrompt {
        +SYSTEM_PROMPT: string$
        +GENERATION_CONFIG: object$
        +buildSystemPrompt(langCode: string) string
        +buildUserPrompt(words: string, ragHits: array, langCode: string) string
    }

    class Symbol {
        +id: string
        +label: string
        +emoji: string
        +category: string
    }

    class Language {
        +code: string
        +name: string
        +flag: string
        +ttsLang: string
        +dir: ltr | rtl
    }

    class Utterance {
        +id: string
        +text: string
        +timestamp: number
        +lang: string
    }

    PredictionEngine "1" --> "*" Utterance : learns from
    RAGMemory "1" --> "*" Utterance : embeds
    IntentPrompt ..> RAGMemory : retrieves context
    IntentPrompt ..> PredictionEngine : n-gram fallback
```

---

## 6. State Machine — Listen Mode

```mermaid
stateDiagram-v2
    [*] --> IDLE

    IDLE --> LISTENING : user enables Listen Mode
    LISTENING --> WAKE_CHECKING : voice activity detected (VAD)
    WAKE_CHECKING --> LISTENING : no wake word matched
    WAKE_CHECKING --> WAKE_DETECTED : wake word confirmed
    WAKE_DETECTED --> RECORDING : 600ms flash complete
    RECORDING --> TRANSCRIBING : silence detected (end of speech)
    TRANSCRIBING --> GENERATING : transcript received
    GENERATING --> SUGGESTIONS : 4 reply options ready
    SUGGESTIONS --> SPEAKING : user taps a reply
    SPEAKING --> IDLE : TTS complete
    SUGGESTIONS --> IDLE : user dismisses

    LISTENING --> IDLE : user disables Listen Mode
    RECORDING --> IDLE : user cancels

    IDLE : Mic off
    LISTENING : Mic open, Energy VAD active
    WAKE_CHECKING : Short 3s Whisper transcription
    WAKE_DETECTED : Visual flash — Heard you!
    RECORDING : Full utterance capture (≤15s)
    TRANSCRIBING : Whisper STT (full audio)
    GENERATING : WebLLM generates 4 reply suggestions
    SUGGESTIONS : Bottom sheet with reply pills
    SPEAKING : TTS playing selected reply
```

---

## 7. Sequence Diagram — Symbol Tap → Speak

```mermaid
sequenceDiagram
    actor User
    participant SB as SymbolButton
    participant App as App.jsx
    participant MB as MessageBar
    participant IB as IntentBar
    participant Pred as usePrediction (n-gram)
    participant AI as useAIPrediction
    participant PE as PredictionEngine
    participant RAG as RAG Memory
    participant LLM as WebLLM
    participant TTS as useTTS

    User->>SB: tap symbol
    SB->>App: handleTap(label)
    App->>App: setWords([...words, label])
    App->>MB: render word chips

    rect rgb(240, 248, 255)
        Note over App,LLM: Prediction (parallel)
        App->>Pred: predict(words)
        Pred->>PE: predict(words, 5)
        PE-->>Pred: ["the", "my", "to", ...]
        Pred-->>App: n-gram suggestions

        App->>AI: predict(words, langCode)
        AI->>PE: predictIntents(words, 4, langCode)
        PE-->>AI: fallback intents
        AI-->>IB: render intent pills (instant)

        AI->>RAG: ragQuery(sentence, 5)
        RAG-->>AI: top-5 similar past phrases
        AI->>LLM: generate(systemPrompt, userPrompt)
        LLM-->>AI: 4 intent sentences
        AI-->>IB: update with LLM intents
    end

    rect rgb(245, 255, 245)
        Note over User,TTS: Speak
        User->>MB: tap "Speak" button
        MB->>App: handleSpeak()
        App->>TTS: speak(sentence, {lang, speed, pitch})
        TTS-->>User: audio output

        App->>App: useStorage.saveUtterance(sentence)
        App->>RAG: ragAdd(sentence)
        App->>PE: learn(sentence)
    end
```

---

## 8. Sequence Diagram — Listen Mode Conversation

```mermaid
sequenceDiagram
    actor Partner as Conversation Partner
    participant Mic as audioCapture
    participant LM as useListenMode
    participant WH as useWhisper (Whisper STT)
    participant LLM as WebLLM
    participant UI as ListenModePanel
    participant TTS as useTTS
    actor User

    User->>LM: enable Listen Mode
    LM->>Mic: start() — open mic
    LM->>LM: state = LISTENING

    Partner->>Mic: speaks (voice)
    Mic->>LM: energy > threshold (VAD)
    LM->>LM: state = WAKE_CHECKING
    LM->>Mic: get 3s audio snippet
    LM->>WH: transcribe(snippet)
    WH-->>LM: "hey Luma can you help"

    LM->>LM: keyword match ("Luma" ✓)
    LM->>LM: state = WAKE_DETECTED (600ms)
    LM->>LM: state = RECORDING
    LM->>Mic: capture full utterance

    Partner->>Mic: "I'm going to the store, do you need anything?"
    Mic->>LM: silence detected → stop

    LM->>LM: state = TRANSCRIBING
    LM->>WH: transcribe(fullAudio)
    WH-->>LM: "I'm going to the store do you need anything"

    LM->>LM: state = GENERATING
    LM->>LLM: generate 4 contextual replies
    LLM-->>LM: ["Yes please", "No thank you", ...]

    LM->>LM: state = SUGGESTIONS
    LM->>UI: show reply pills
    User->>UI: tap "Yes please"

    LM->>LM: state = SPEAKING
    LM->>TTS: speak("Yes please")
    TTS-->>Partner: audio: "Yes please"
    LM->>LM: state = IDLE
```

---

## 9. Sequence Diagram — AI Intent Prediction Pipeline

```mermaid
sequenceDiagram
    participant App as App.jsx
    participant Hook as useAIPrediction
    participant NGram as PredictionEngine (n-gram)
    participant RAG as RAG Memory (MiniLM-L6)
    participant Prompt as intentPrompt.js
    participant LLM as WebLLM (Qwen 0.5B/1.7B)
    participant UI as IntentBar

    App->>Hook: predict(["want", "water"], "en")

    rect rgb(255, 250, 230)
        Note over Hook,NGram: Phase 1 — Instant N-gram Fallback
        Hook->>NGram: predictIntents(words, 4, "en")
        Note right of NGram: Uses localised INTENT_FRAMES + phrase history matching
        NGram-->>Hook: ["I want water", "Can I have water", ...]
        Hook->>UI: render pills (source="ngram")
    end

    rect rgb(230, 245, 255)
        Note over Hook,RAG: Phase 2 — RAG Context Retrieval
        Hook->>RAG: ragQuery("want water", 5)
        RAG->>RAG: embed query → 384-d vector, cosine similarity search
        RAG-->>Hook: [{text: "I want some water please", score: 0.89}, ...]
    end

    rect rgb(235, 255, 235)
        Note over Hook,LLM: Phase 3 — LLM Generation
        Hook->>Prompt: buildSystemPrompt("en")
        Prompt-->>Hook: system prompt (AAC predictor instructions)
        Hook->>Prompt: buildUserPrompt("want water", ragHits, "en")
        Prompt-->>Hook: user prompt with RAG context

        Hook->>LLM: chat.completions.create(system+user, {max_tokens:120, temp:0.3})
        LLM-->>Hook: 4 intent sentences

        Hook->>Hook: parseIntentOutput() → 4 sentences
        Hook->>Hook: dedupeAndMerge(llm, ngram, 4)
        Hook->>UI: update pills (source="llm")
    end
```

---

## 10. Component Tree (Hierarchy)

```mermaid
graph TB
    Main["main.jsx"] --> EB["ErrorBoundary"]
    EB --> App["App.jsx<br/>(all hooks instantiated)"]

    subgraph Board_Tab["Board Tab"]
        MB["MessageBar<br/>(sentence builder)"]
        IB["IntentBar<br/>(AI sentence pills)"]
        CG["CategoryGrid<br/>(3×3 home tiles)"]
        SP["SymbolPicker<br/>(category drill-in)"]
        PG["PhraseGrid<br/>(quick/emergency)"]
        SVH["SubViewHeader<br/>(back + title)"]
    end

    subgraph History_Tab["History Tab"]
        HP["HistoryPanel"]
    end

    subgraph Symbols_Tab["Symbols Tab"]
        SYP["SymbolsPage"]
    end

    subgraph Profile_Tab["Profile Tab"]
        PP["ProfilePanel"]
    end

    subgraph Global_Overlays["Global Overlays"]
        LMP["ListenModePanel"]
        HM["HelpModal"]
        CS["ConfirmSheet"]
    end

    App --> MB & IB & CG
    CG -->|drill-in| SP
    CG -->|quick/emergency| PG
    App --> HP
    App --> SYP
    App --> PP
    App --> LMP & HM
```

---

## 11. Deployment Diagram

```mermaid
graph TB
    subgraph UserDevice["User Device"]
        subgraph Cap["Capacitor Shell (iOS / Android)"]
            subgraph WV["WKWebView / Android WebView"]
                SPA["React 19 SPA"]
                GPU["WebGPU"]
                WASM["ONNX WASM"]
                WSA["Web Speech API"]
                LS[("localStorage<br/>(all user data)")]
                Cache[("Cache API<br/>(ML models)")]
            end
            NTTS["Native TTS<br/>(Capacitor Plugin)"]
            NUI["StatusBar / SplashScreen"]
        end
    end

    HF(["☁ Hugging Face Hub<br/>(model download, once)"])

    SPA -->|"WebLLM (Qwen 4-bit)"| GPU
    SPA -->|"Whisper STT + MiniLM"| WASM
    SPA -->|"fallback TTS (web)"| WSA
    SPA -->|"native TTS"| NTTS
    SPA -->|"read/write"| LS
    GPU -->|"model weights"| Cache
    WASM -->|"ONNX models"| Cache
    WASM -.->|"first-time download"| HF
    GPU -.->|"first-time download"| HF
```

---

## 12. Data Model

```mermaid
erDiagram
    Symbol {
        string id PK
        string label
        string emoji
        string category
    }

    Category {
        string id PK
        string emoji
        string label
        string mapTo
        string action
    }

    Language {
        string code PK "ISO 639-1"
        string name
        string flag
        string ttsLang "BCP-47"
        string dir "ltr or rtl"
    }

    Utterance {
        string id PK
        string text
        number timestamp
        string lang
    }

    Favorite {
        string id PK
        string text
        string emoji
    }

    CustomSymbol {
        string id PK
        string label
        string emoji
        string category
    }

    NgramModel {
        map unigrams "word to count"
        map bigrams "word to word-count"
        map trigrams "pair to word-count"
        map phrases "sentence to count"
    }

    RAGStore {
        array docs "text + vector384"
        number maxDocs "300"
    }

    UIStrings {
        string langCode PK
        string keys "~100 translated"
    }

    SymbolTranslations {
        string langCode PK
        map translations "symbolId to label"
    }

    Language ||--o{ UIStrings : has
    Language ||--o{ SymbolTranslations : has
    Symbol }o--|| Category : "belongs to"
    Utterance }o--|| Language : "spoken in"
    NgramModel }o..o{ Utterance : "learns from"
    RAGStore }o..o{ Utterance : "embeds"
```

---

## 13. localStorage Keys

| Key                              | Owner             | Content                                  |
| -------------------------------- | ----------------- | ---------------------------------------- |
| `speakeasy_history_v1`           | useStorage        | Utterance history (JSON array)           |
| `speakeasy_settings_v1`         | useStorage        | User preferences (JSON object)           |
| `speakeasy_ngrams_v1`           | PredictionEngine  | N-gram frequency tables                  |
| `speakeasy_rag_v1`              | ragMemory         | 384-d vectors + text (max 300 docs)      |
| `speakeasy_favorites_v1`        | useFavorites      | Favourite phrases (JSON array)           |
| `speakeasy_custom_symbols_v1`   | useCustomSymbols  | User-created symbols                     |
| `speakeasy_hidden_symbols_v1`   | useCustomSymbols  | Hidden built-in symbol IDs               |
| `speakeasy_quick_phrases_v1`    | useQuickPhrases   | Customised phrase tabs                   |
| `speakeasy_symbol_order_v1`     | useSymbolOrder    | Per-category symbol ordering             |
| `speakeasy_uilang_v1`           | useLanguage       | Interface language code                  |
| `speakeasy_typelang_v1`         | useLanguage       | Symbol board language code               |
| `speakeasy_ttslang_v1`          | useLanguage       | TTS voice language code                  |
| `speakeasy_listenlang_v1`       | useLanguage       | Speech recognition language code         |
| `speakeasy_langs_linked_v1`     | useLanguage       | Whether type↔TTS are linked              |
| `speakeasy_name_v1`             | ProfilePanel      | User's display name                      |
| `speakeasy_avatar_v1`           | ProfilePanel      | User's avatar selection                  |
| `speakeasy_theme_v1`            | App.jsx           | Light / dark theme preference            |

---

## 14. File Map

```
speakeasy/
├── index.html                     # Entry HTML (Capacitor viewport-fit)
├── vite.config.js                 # Vite config (COOP/COEP, WASM, chunking)
├── package.json                   # Dependencies & scripts
├── public/                        # Static assets
├── src/
│   ├── main.jsx                   # React root mount + ErrorBoundary
│   ├── App.jsx                    # Root orchestrator (644 lines)
│   ├── App.css                    # App-specific styles
│   ├── index.css                  # Global theme (light/dark, CSS vars)
│   ├── components/
│   │   ├── MessageBar.jsx         # Sentence builder + speak button
│   │   ├── IntentBar.jsx          # AI intent pills (tap=speak, hold=edit)
│   │   ├── CategoryGrid.jsx       # 3×3 home category tiles
│   │   ├── SymbolPicker.jsx       # Category drill-in symbol grid
│   │   ├── SymbolBoard.jsx        # Scrollable symbol grid
│   │   ├── SymbolButton.jsx       # Single AAC tile (emoji + label)
│   │   ├── CoreWordGrid.jsx       # High-frequency core words
│   │   ├── SmartRow.jsx           # Context-aware cross-category row
│   │   ├── PredictionBar.jsx      # N-gram next-word strip
│   │   ├── PhraseGrid.jsx         # Quick reply / emergency phrases
│   │   ├── CategoryFilter.jsx     # Category selector + display mode
│   │   ├── BoardTabStrip.jsx      # Board sub-tab strip
│   │   ├── FavoritesBar.jsx       # Inline favourite pills
│   │   ├── FavoritesPage.jsx      # Favourites management page
│   │   ├── RecentPhrasesBar.jsx   # Recent phrases strip
│   │   ├── HistoryPanel.jsx       # Utterance history list
│   │   ├── ProfilePanel.jsx       # Settings (858 lines, iOS-style)
│   │   ├── SymbolsPage.jsx        # Symbol management (add/hide)
│   │   ├── ListenModePanel.jsx    # Listen Mode overlay (state-driven)
│   │   ├── HelpModal.jsx          # Help sheet + contact form
│   │   ├── ConfirmSheet.jsx       # Reusable confirmation dialog
│   │   └── ErrorBoundary.jsx      # React error boundary
│   ├── hooks/
│   │   ├── useTTS.js              # Text-to-speech (native + web)
│   │   ├── usePrediction.js       # N-gram prediction React wrapper
│   │   ├── useAIPrediction.js     # WebLLM intent prediction
│   │   ├── useWhisper.js          # Whisper STT (ONNX WASM)
│   │   ├── useListenMode.js       # Listen Mode state machine
│   │   ├── useStorage.js          # History + settings persistence
│   │   ├── useLanguage.js         # 4-dimension language management
│   │   ├── useFavorites.js        # Favourite phrases CRUD
│   │   ├── useCustomSymbols.js    # Custom symbol management
│   │   ├── useQuickPhrases.js     # Quick phrase tab customisation
│   │   └── useSymbolOrder.js      # Per-category symbol ordering
│   ├── utils/
│   │   ├── predictionEngine.js    # N-gram engine (bi/trigram + phrases)
│   │   ├── ragMemory.js           # RAG vector store (MiniLM-L6)
│   │   ├── audioCapture.js        # Web Audio mic + VAD
│   │   └── platform.js            # Capacitor platform detection
│   ├── data/
│   │   ├── symbols.js             # AAC symbol definitions (9 categories)
│   │   ├── languages.js           # 10 languages + translations + UI strings
│   │   └── boardTabs.js           # Board tabs + default phrases
│   └── prompts/
│       └── intentPrompt.js        # LLM system/user prompt templates
└── docs/
    └── ARCHITECTURE.md            # This file
```

---

## 15. Design Decisions

| Decision | Rationale |
| --- | --- |
| **No Redux / Context API** | App.jsx is the single orchestrator; prop-drilling is sufficient for the flat component tree |
| **All AI on-device** | Privacy-first by design — no audio or text ever leaves the device |
| **4-bit quantised models** | Enables running LLMs in the browser; Qwen3 1.7B fits in ~900 MB VRAM |
| **N-gram + LLM dual path** | N-grams provide instant fallback (<1ms); LLM enhances when loaded |
| **RAG over utterance history** | Personalises suggestions based on the user's actual communication patterns |
| **localStorage only** | Works identically in browser and Capacitor WebView; no native DB needed |
| **CSS custom properties for theming** | `data-theme` attribute enables instant light/dark switching without re-render |
| **Separated language dimensions** | UI, symbols, TTS, and listen can theoretically differ (e.g. bilingual user) |
| **Energy VAD + wake word** | Two-stage listening avoids continuous Whisper transcription (saves battery) |
