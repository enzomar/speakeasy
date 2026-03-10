/**
 * Onboarding.jsx — First-run setup wizard.
 *
 * Steps:
 *   0  Language picker
 *   1  Name + Avatar
 *   2  Gender + Try-voice
 *   3  Handedness
 *   4  Ready / Done
 *
 * All strings are embedded here so the component is fully self-contained
 * and works correctly even before the user has chosen a language.
 *
 * On completion, `onComplete({ langCode, name, avatar, gender, hand })`
 * is called and `speakeasy_onboarding_v1 = "1"` is written to localStorage.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LANGUAGES } from "../../i18n/languages";

// ─── Localised strings ────────────────────────────────────────────────────────

const T = {
  en: {
    tagline:       "Your voice, your way.",
    chooseLang:    "Choose your language",
    next:          "Next",
    back:          "Back",
    skip:          "Skip",
    letsGo:        "Let's go →",
    step1Title:    "What's your name?",
    step1Sub:      "Optional — helps personalise your experience",
    namePh:        "Your name…",
    avatarTitle:   "Choose your avatar",
    step2Title:    "Your voice",
    step2Sub:      "Choose the voice that sounds like you",
    male:          "Male",
    female:        "Female",
    neutral:       "Neutral",
    tryVoice:      "Try voice",
    trying:        "Playing…",
    tryLine:       "Hello! I am using SpeakEasy. This is my voice.",
    step3Title:    "Which hand do you prefer?",
    step3Sub:      "Controls will be placed for comfort",
    handLeft:      "Left hand",
    handRight:     "Right hand",
    readyTitle:    "You're all set!",
    readySubtitle:   "SpeakEasy is ready. Let's start communicating.",
    introStepTitle: "What is SpeakEasy?",
    introSubtitle:  "AAC for everyone — no cloud, no limits.",
    feat1Title:     "Who it's for",
    feat1Text:      "People with ALS, autism, aphasia, stroke, cerebral palsy, or any condition affecting speech — and anyone who needs an alternative or augmented voice.",
    feat2Title:     "How it works",
    feat2Text:      "Tap pictogram symbols to build a sentence. Your device speaks it aloud. Mix tapping, typing, and AI-powered replies.",
    feat3Title:     "Why it's different",
    feat3Text:      "All AI runs entirely on your device. No account, no cloud, no tracking. Fully offline and private.",
    genderMale:    "♂",
    genderFemale:  "♀",
    genderNeutral: "◇",
  },
  es: {
    tagline:       "Tu voz, a tu manera.",
    chooseLang:    "Elige tu idioma",
    next:          "Siguiente",
    back:          "Atrás",
    skip:          "Omitir",
    letsGo:        "¡Empezar →",
    step1Title:    "¿Cómo te llamas?",
    step1Sub:      "Opcional — ayuda a personalizar tu experiencia",
    namePh:        "Tu nombre…",
    avatarTitle:   "Elige tu avatar",
    step2Title:    "Tu voz",
    step2Sub:      "Elige la voz que mejor te representa",
    male:          "Masculina",
    female:        "Femenina",
    neutral:       "Neutral",
    tryVoice:      "Probar voz",
    trying:        "Reproduciendo…",
    tryLine:       "¡Hola! Uso SpeakEasy. Esta es mi voz.",
    step3Title:    "¿Qué mano prefieres?",
    step3Sub:      "Los controles se colocarán para tu comodidad",
    handLeft:      "Mano izquierda",
    handRight:     "Mano derecha",
    readyTitle:    "¡Todo listo!",
    readySubtitle:  "SpeakEasy está listo. Empecemos a comunicarnos.",
    introStepTitle: "¿Qué es SpeakEasy?",
    introSubtitle:  "CAA para todos — sin nube, sin límites.",
    feat1Title:     "¿Para quién es?",
    feat1Text:      "Personas con ELA, autismo, afasia, ictus, parálisis cerebral o cualquier condición que afecte el habla — y cualquiera que necesite una voz aumentativa.",
    feat2Title:     "Cómo funciona",
    feat2Text:      "Toca pictogramas para construir frases. Tu dispositivo las dice en voz alta. Combina símbolos, escritura y respuestas con IA.",
    feat3Title:     "Por qué es diferente",
    feat3Text:      "Toda la IA se ejecuta en tu dispositivo. Sin cuenta, sin nube, sin rastreo. Completamente sin conexión y privado.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  fr: {
    tagline:       "Votre voix, à votre façon.",
    chooseLang:    "Choisissez votre langue",
    next:          "Suivant",
    back:          "Retour",
    skip:          "Passer",
    letsGo:        "C'est parti →",
    step1Title:    "Quel est votre prénom ?",
    step1Sub:      "Facultatif — aide à personnaliser votre expérience",
    namePh:        "Votre prénom…",
    avatarTitle:   "Choisissez votre avatar",
    step2Title:    "Votre voix",
    step2Sub:      "Choisissez la voix qui vous ressemble",
    male:          "Masculine",
    female:        "Féminine",
    neutral:       "Neutre",
    tryVoice:      "Tester la voix",
    trying:        "Lecture…",
    tryLine:       "Bonjour ! J'utilise SpeakEasy. C'est ma voix.",
    step3Title:    "Quelle main préférez-vous ?",
    step3Sub:      "Les contrôles seront placés pour votre confort",
    handLeft:      "Main gauche",
    handRight:     "Main droite",
    readyTitle:    "Tout est prêt !",
    readySubtitle:  "SpeakEasy est prêt. Commençons à communiquer.",
    introStepTitle: "Qu'est-ce que SpeakEasy ?",
    introSubtitle:  "CAA pour tous — sans cloud, sans limites.",
    feat1Title:     "À qui ça s'adresse ?",
    feat1Text:      "Personnes atteintes de SLA, d'autisme, d'aphasie, d'AVC, de paralysie cérébrale ou de toute condition affectant la parole — et toute personne ayant besoin d'une voix augmentée.",
    feat2Title:     "Comment ça fonctionne",
    feat2Text:      "Appuyez sur des pictogrammes pour former des phrases. Votre appareil les prononce à voix haute. Combinez pictogrammes, saisie et réponses IA.",
    feat3Title:     "Pourquoi c'est différent",
    feat3Text:      "Toute l'IA tourne sur votre appareil. Pas de compte, pas de cloud, pas de traçage. Entièrement hors ligne et privé.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  de: {
    tagline:       "Ihre Stimme, Ihr Weg.",
    chooseLang:    "Sprache wählen",
    next:          "Weiter",
    back:          "Zurück",
    skip:          "Überspringen",
    letsGo:        "Los geht's →",
    step1Title:    "Wie heißen Sie?",
    step1Sub:      "Optional — hilft dabei, das Erlebnis zu personalisieren",
    namePh:        "Ihr Name…",
    avatarTitle:   "Avatar auswählen",
    step2Title:    "Ihre Stimme",
    step2Sub:      "Wählen Sie die Stimme, die zu Ihnen passt",
    male:          "Männlich",
    female:        "Weiblich",
    neutral:       "Neutral",
    tryVoice:      "Stimme testen",
    trying:        "Wiedergabe…",
    tryLine:       "Hallo! Ich benutze SpeakEasy. Das ist meine Stimme.",
    step3Title:    "Welche Hand bevorzugen Sie?",
    step3Sub:      "Steuerelemente werden für Ihren Komfort angepasst",
    handLeft:      "Linke Hand",
    handRight:     "Rechte Hand",
    readyTitle:    "Alles bereit!",
    readySubtitle:  "SpeakEasy ist bereit. Fangen wir an zu kommunizieren.",
    introStepTitle: "Was ist SpeakEasy?",
    introSubtitle:  "UK für alle — keine Cloud, keine Grenzen.",
    feat1Title:     "Für wen ist es?",
    feat1Text:      "Menschen mit ALS, Autismus, Aphasie, Schlaganfall, Zerebralparese oder anderen Sprachstörungen — und alle, die unterstützte Kommunikation brauchen.",
    feat2Title:     "Wie es funktioniert",
    feat2Text:      "Tippen Sie auf Piktogramme, um Sätze zu erstellen. Ihr Gerät spricht sie laut vor. Kombinieren Sie Symbole, Eingabe und KI-Antworten.",
    feat3Title:     "Warum es anders ist",
    feat3Text:      "Alle KI läuft auf Ihrem Gerät. Kein Konto, keine Cloud, kein Tracking. Vollständig offline und privat.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  it: {
    tagline:       "La tua voce, a modo tuo.",
    chooseLang:    "Scegli la tua lingua",
    next:          "Avanti",
    back:          "Indietro",
    skip:          "Salta",
    letsGo:        "Iniziamo →",
    step1Title:    "Come ti chiami?",
    step1Sub:      "Facoltativo — aiuta a personalizzare l'esperienza",
    namePh:        "Il tuo nome…",
    avatarTitle:   "Scegli il tuo avatar",
    step2Title:    "La tua voce",
    step2Sub:      "Scegli la voce che ti rappresenta",
    male:          "Maschile",
    female:        "Femminile",
    neutral:       "Neutro",
    tryVoice:      "Prova voce",
    trying:        "Riproduzione…",
    tryLine:       "Ciao! Uso SpeakEasy. Questa è la mia voce.",
    step3Title:    "Quale mano preferisci?",
    step3Sub:      "I controlli saranno posizionati per il tuo comfort",
    handLeft:      "Mano sinistra",
    handRight:     "Mano destra",
    readyTitle:    "Tutto pronto!",
    readySubtitle:  "SpeakEasy è pronto. Iniziamo a comunicare.",
    introStepTitle: "Cos'è SpeakEasy?",
    introSubtitle:  "CAA per tutti — nessun cloud, nessun limite.",
    feat1Title:     "A chi è destinato",
    feat1Text:      "Persone con SLA, autismo, afasia, ictus, paralisi cerebrale o qualsiasi condizione che influisce sul linguaggio — e chiunque abbia bisogno di una voce aumentativa.",
    feat2Title:     "Come funziona",
    feat2Text:      "Tocca pittogrammi per costruire frasi. Il tuo dispositivo le legge ad alta voce. Combina tocchi, digitazione e risposte AI.",
    feat3Title:     "Perché è diverso",
    feat3Text:      "Tutta l'IA gira sul tuo dispositivo. Nessun account, nessun cloud, nessun tracciamento. Completamente offline e privato.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  pt: {
    tagline:       "Sua voz, do seu jeito.",
    chooseLang:    "Escolha seu idioma",
    next:          "Próximo",
    back:          "Voltar",
    skip:          "Pular",
    letsGo:        "Vamos lá →",
    step1Title:    "Qual é o seu nome?",
    step1Sub:      "Opcional — ajuda a personalizar a experiência",
    namePh:        "Seu nome…",
    avatarTitle:   "Escolha seu avatar",
    step2Title:    "Sua voz",
    step2Sub:      "Escolha a voz que mais combina com você",
    male:          "Masculino",
    female:        "Feminino",
    neutral:       "Neutro",
    tryVoice:      "Testar voz",
    trying:        "Reproduzindo…",
    tryLine:       "Olá! Uso o SpeakEasy. Esta é minha voz.",
    step3Title:    "Qual mão você prefere?",
    step3Sub:      "Os controles serão posicionados para seu conforto",
    handLeft:      "Mão esquerda",
    handRight:     "Mão direita",
    readyTitle:    "Tudo pronto!",
    readySubtitle:  "O SpeakEasy está pronto. Vamos nos comunicar.",
    introStepTitle: "O que é o SpeakEasy?",
    introSubtitle:  "CAA para todos — sem nuvem, sem limites.",
    feat1Title:     "Para quem é",
    feat1Text:      "Pessoas com ELA, autismo, afasia, AVC, paralisia cerebral ou qualquer condição que afete a fala — e qualquer pessoa que precise de uma voz alternativa.",
    feat2Title:     "Como funciona",
    feat2Text:      "Toque em pictogramas para formar frases. Seu dispositivo as fala em voz alta. Combine toques, digitação e respostas com IA.",
    feat3Title:     "Por que é diferente",
    feat3Text:      "Toda a IA roda no seu dispositivo. Sem conta, sem nuvem, sem rastreamento. Totalmente offline e privado.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  ar: {
    tagline:       "صوتك، بطريقتك.",
    chooseLang:    "اختر لغتك",
    next:          "التالي",
    back:          "رجوع",
    skip:          "تخطي",
    letsGo:        "هيا نبدأ →",
    step1Title:    "ما اسمك؟",
    step1Sub:      "اختياري — يساعد في تخصيص تجربتك",
    namePh:        "اسمك…",
    avatarTitle:   "اختر صورتك الرمزية",
    step2Title:    "صوتك",
    step2Sub:      "اختر الصوت الذي يمثلك",
    male:          "ذكر",
    female:        "أنثى",
    neutral:       "محايد",
    tryVoice:      "جرب الصوت",
    trying:        "يعزف…",
    tryLine:       "مرحباً! أستخدم SpeakEasy. هذا صوتي.",
    step3Title:    "أي يد تفضل؟",
    step3Sub:      "سيتم وضع عناصر التحكم لراحتك",
    handLeft:      "اليد اليسرى",
    handRight:     "اليد اليمنى",
    readyTitle:    "كل شيء جاهز!",
    readySubtitle:  "SpeakEasy جاهز. لنبدأ التواصل.",
    introStepTitle: "ما هو SpeakEasy؟",
    introSubtitle:  "التواصل المعزَّز للجميع — بدون سحابة، بلا حدود.",
    feat1Title:     "لمن هو مخصص؟",
    feat1Text:      "للأشخاص المصابين بـ ALS والتوحد والحبسة الكلامية والسكتة الدماغية والشلل الدماغي أو أي حالة تؤثر على الكلام — ولكل من يحتاج إلى صوت بديل.",
    feat2Title:     "كيف يعمل",
    feat2Text:      "اضغط على الرموز التصويرية لبناء جمل. يقرأها جهازك بصوت عالٍ. يمكنك الجمع بين الرموز والكتابة والردود بالذكاء الاصطناعي.",
    feat3Title:     "لماذا هو مختلف",
    feat3Text:      "كل الذكاء الاصطناعي يعمل على جهازك. لا حساب، لا سحابة، لا تتبع. يعمل بالكامل دون اتصال بالإنترنت.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  zh: {
    tagline:       "您的声音，您的方式。",
    chooseLang:    "选择您的语言",
    next:          "下一步",
    back:          "返回",
    skip:          "跳过",
    letsGo:        "开始 →",
    step1Title:    "您叫什么名字？",
    step1Sub:      "可选 — 帮助个性化您的体验",
    namePh:        "您的名字…",
    avatarTitle:   "选择您的头像",
    step2Title:    "您的声音",
    step2Sub:      "选择最适合您的声音",
    male:          "男性",
    female:        "女性",
    neutral:       "中性",
    tryVoice:      "试听声音",
    trying:        "播放中…",
    tryLine:       "你好！我正在使用 SpeakEasy。这是我的声音。",
    step3Title:    "您习惯使用哪只手？",
    step3Sub:      "控件将根据您的舒适度放置",
    handLeft:      "左手",
    handRight:     "右手",
    readyTitle:    "一切准备就绪！",
    readySubtitle:  "SpeakEasy 已准备好。让我们开始沟通。",
    introStepTitle: "什么是 SpeakEasy？",
    introSubtitle:  "人人可用的辅助交流工具 — 无云端，无限制。",
    feat1Title:     "适合哪些人",
    feat1Text:      "患有 ALS、自闭症、失语症、中风、脑瘫或任何影响语言的疾病的人——以及任何需要辅助沟通的人。",
    feat2Title:     "如何使用",
    feat2Text:      "点击图标符号来组建句子，设备会大声读出。可以混合使用符号、输入和 AI 生成的回复。",
    feat3Title:     "为什么与众不同",
    feat3Text:      "所有 AI 均在您的设备上运行。无需账户，无云端，无跟踪。完全离线，完全私密。",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  ja: {
    tagline:       "あなたの声、あなたの言葉で。",
    chooseLang:    "言語を選んでください",
    next:          "次へ",
    back:          "戻る",
    skip:          "スキップ",
    letsGo:        "始めましょう →",
    step1Title:    "お名前は？",
    step1Sub:      "任意 — 体験をパーソナライズするのに役立ちます",
    namePh:        "お名前…",
    avatarTitle:   "アバターを選んでください",
    step2Title:    "あなたの声",
    step2Sub:      "あなたに合った声を選んでください",
    male:          "男性",
    female:        "女性",
    neutral:       "ニュートラル",
    tryVoice:      "声を試す",
    trying:        "再生中…",
    tryLine:       "こんにちは！SpeakEasy を使っています。これが私の声です。",
    step3Title:    "どちらの手が使いやすいですか？",
    step3Sub:      "操作しやすい位置にコントロールが配置されます",
    handLeft:      "左手",
    handRight:     "右手",
    readyTitle:    "準備完了！",
    readySubtitle:  "SpeakEasy の準備ができました。コミュニケーションを始めましょう。",
    introStepTitle: "SpeakEasy とは？",
    introSubtitle:  "すべての人のための AAC — クラウド不要、制限なし。",
    feat1Title:     "対象となる方",
    feat1Text:      "ALS、自閉症、失語症、脳卒中、脳性麻痺など言葉に影響がある方、そして代替コミュニケーションを必要とするすべての方に向けています。",
    feat2Title:     "使い方",
    feat2Text:      "ピクトグラム記号をタップして文を作成します。デバイスが読み上げます。記号、文字入力、AI の返答を自由に組み合わせて使えます。",
    feat3Title:     "何が違うのか",
    feat3Text:      "すべての AI はデバイス上で動作します。アカウント不要、クラウド不要、追跡なし。完全なオフライン・プライバシー保護。",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
  ko: {
    tagline:       "당신의 목소리, 당신의 방식으로.",
    chooseLang:    "언어를 선택하세요",
    next:          "다음",
    back:          "뒤로",
    skip:          "건너뛰기",
    letsGo:        "시작하기 →",
    step1Title:    "이름이 무엇인가요?",
    step1Sub:      "선택 사항 — 경험을 개인화하는 데 도움이 됩니다",
    namePh:        "이름…",
    avatarTitle:   "아바타를 선택하세요",
    step2Title:    "당신의 목소리",
    step2Sub:      "당신에게 맞는 목소리를 선택하세요",
    male:          "남성",
    female:        "여성",
    neutral:       "중립",
    tryVoice:      "목소리 듣기",
    trying:        "재생 중…",
    tryLine:       "안녕하세요! 저는 SpeakEasy를 사용합니다. 이것이 제 목소리입니다.",
    step3Title:    "어느 손을 더 선호하시나요?",
    step3Sub:      "편의를 위해 컨트롤이 배치됩니다",
    handLeft:      "왼손",
    handRight:     "오른손",
    readyTitle:    "모든 준비 완료!",
    readySubtitle:  "SpeakEasy가 준비되었습니다. 소통을 시작해 봅시다.",
    introStepTitle: "SpeakEasy 란 무엇인가요?",
    introSubtitle:  "모두를 위한 AAC — 클라우드 없이, 제한 없이.",
    feat1Title:     "누구를 위한 앱인가요?",
    feat1Text:      "ALS, 자폐증, 실어증, 뇌졸중, 뇌성마비 등 언어에 영향을 미치는 상태를 가진 분들, 그리고 보완대체의사소통이 필요한 모든 분들을 위한 앱입니다.",
    feat2Title:     "어떻게 사용하나요?",
    feat2Text:      "그림 기호를 탭하여 문장을 만드세요. 기기가 큰소리로 말해줍니다. 기호, 타이핑, AI 답변을 자유롭게 조합할 수 있습니다.",
    feat3Title:     "무엇이 다른가요?",
    feat3Text:      "모든 AI가 기기에서 실행됩니다. 계정 불필요, 클라우드 없음, 추적 없음. 완전 오프라인 및 프라이버시 보호.",
    genderMale: "♂", genderFemale: "♀", genderNeutral: "◇",
  },
};

function t(langCode, key) {
  return (T[langCode] ?? T.en)[key] ?? T.en[key] ?? key;
}

// ── Detect browser language ───────────────────────────────────────────────────

function detectBrowserLang() {
  const nav = navigator.language?.slice(0, 2) ?? "en";
  return LANGUAGES.find(l => l.code === nav)?.code ?? "en";
}

// ── Avatar list ───────────────────────────────────────────────────────────────

const AVATARS = [
  "🧑", "👦", "👧", "👨", "👩", "🧒",
  "👴", "👵", "🧔", "👱", "🧑‍🦱", "🧑‍🦳",
  "🧑‍🦼", "🧑‍🦽", "🧁", "🐱", "🐶", "🦊",
  "🐸", "⭐", "🌟", "💙",
];

// ── Speak helper (Web Speech API) ─────────────────────────────────────────────

function speakDemo(text, ttsLang, onStart, onEnd) {
  const synth = window.speechSynthesis;
  if (!synth) { onEnd(); return; }
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = ttsLang;

  // Pick best available voice for the target language
  const voices = synth.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith(ttsLang.slice(0, 2)) &&
    /premium|enhanced|natural|neural/i.test(v.name)
  ) ?? voices.find(v => v.lang.startsWith(ttsLang.slice(0, 2)));
  if (preferred) utter.voice = preferred;

  utter.onstart = () => onStart();
  utter.onend   = () => onEnd();
  utter.onerror = () => onEnd();
  synth.speak(utter);
}

// ── Small UI primitives ───────────────────────────────────────────────────────

const tint = "var(--tint, #3B9B8F)";

function Btn({ children, onClick, variant = "primary", style: sx, disabled }) {
  const base = {
    border: "none", borderRadius: 14, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", fontSize: 17, fontWeight: 600,
    padding: "14px 28px", transition: "opacity 0.15s, transform 0.1s",
    WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
    userSelect: "none", opacity: disabled ? 0.4 : 1,
    ...sx,
  };
  const styles = {
    primary:  { ...base, background: tint,                     color: "#fff"             },
    ghost:    { ...base, background: "transparent",             color: tint, padding: "14px 16px" },
    outline:  { ...base, background: "var(--surface, #f5f5f5)", color: "var(--text, #111)", border: "1.5px solid var(--sep, #ddd)" },
  };
  return <button style={styles[variant]} onClick={onClick} disabled={disabled}>{children}</button>;
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8,
          height: 8, borderRadius: 4,
          background: i === current ? tint : "var(--sep, #ddd)",
          transition: "width 0.3s ease, background 0.3s ease",
        }} />
      ))}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepLanguage({ langCode, onSelect }) {
  const detected = detectBrowserLang();
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 24px" }}>
      <p style={{ textAlign: "center", fontSize: 15, color: "var(--text-3, #888)", margin: "0 0 20px" }}>
        {t(langCode, "chooseLang")}
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 14,
              border: `2px solid ${lang.code === langCode ? tint : "var(--sep, #ddd)"}`,
              background: lang.code === langCode ? `color-mix(in srgb, ${tint} 12%, transparent)` : "var(--surface, #fafafa)",
              cursor: "pointer", fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transition: "border-color 0.15s, background 0.15s",
              textAlign: lang.dir === "rtl" ? "right" : "left",
              direction: lang.dir,
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{lang.flag}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text, #111)" }}>{lang.name}</span>
            {lang.code === detected && lang.code !== langCode && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3, #888)", flexShrink: 0 }}>auto</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepNameAvatar({ langCode, name, setName, avatar, setAvatar }) {
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 24px" }}>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-3, #888)", margin: "0 0 20px" }}>
        {t(langCode, "step1Sub")}
      </p>

      {/* Name input */}
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t(langCode, "namePh")}
        maxLength={40}
        style={{
          width: "100%", boxSizing: "border-box",
          fontSize: 18, fontFamily: "inherit", fontWeight: 500,
          padding: "14px 16px", borderRadius: 14,
          border: "2px solid var(--sep, #ddd)",
          background: "var(--surface, #fafafa)",
          color: "var(--text, #111)",
          outline: "none", marginBottom: 24,
          textAlign: LANGUAGES.find(l => l.code === langCode)?.dir === "rtl" ? "right" : "left",
          direction: LANGUAGES.find(l => l.code === langCode)?.dir ?? "ltr",
        }}
      />

      {/* Avatar grid */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2, #555)", marginBottom: 12 }}>
        {t(langCode, "avatarTitle")}
      </p>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
        gap: 8,
      }}>
        {AVATARS.map(em => (
          <button
            key={em}
            onClick={() => setAvatar(em)}
            style={{
              fontSize: 26, padding: "6px", borderRadius: 12,
              border: `2px solid ${em === avatar ? tint : "transparent"}`,
              background: em === avatar ? `color-mix(in srgb, ${tint} 12%, transparent)` : "var(--surface, #f0f0f0)",
              cursor: "pointer", lineHeight: 1.3,
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transition: "border-color 0.12s, background 0.12s",
            }}
            aria-label={em}
          >{em}</button>
        ))}
      </div>
    </div>
  );
}

function StepVoice({ langCode, gender, setGender, ttsLang }) {
  const [playing, setPlaying] = useState(false);

  const GENDERS = [
    { value: "male",    icon: "♂", label: t(langCode, "male"),    color: "#4A90E2" },
    { value: "female",  icon: "♀", label: t(langCode, "female"),  color: "#E24A7A" },
    { value: "neutral", icon: "◇", label: t(langCode, "neutral"), color: "#7A4AE2" },
  ];

  const handleTry = useCallback(() => {
    if (playing) return;
    // Make sure voices are loaded (required in Chrome)
    if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.getVoices(); // trigger load
    }
    setPlaying(true);
    speakDemo(t(langCode, "tryLine"), ttsLang, () => {}, () => setPlaying(false));
  }, [playing, langCode, ttsLang]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 24px" }}>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-3, #888)", margin: "0 0 24px" }}>
        {t(langCode, "step2Sub")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {GENDERS.map(g => (
          <button
            key={g.value}
            onClick={() => setGender(g.value)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px", borderRadius: 16,
              border: `2px solid ${g.value === gender ? g.color : "var(--sep, #ddd)"}`,
              background: g.value === gender
                ? `color-mix(in srgb, ${g.color} 10%, transparent)`
                : "var(--surface, #fafafa)",
              cursor: "pointer", fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <span style={{
              fontSize: 24, width: 40, height: 40, borderRadius: 12,
              background: `color-mix(in srgb, ${g.color} 18%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: g.color, flexShrink: 0,
            }}>{g.icon}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: "var(--text, #111)" }}>
              {g.label}
            </span>
            {g.value === gender && (
              <span style={{ marginLeft: "auto", color: g.color, fontSize: 20 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Try voice */}
      <div style={{ textAlign: "center" }}>
        <Btn variant="outline" onClick={handleTry} disabled={playing} style={{ minWidth: 160 }}>
          {playing ? t(langCode, "trying") : `🔊 ${t(langCode, "tryVoice")}`}
        </Btn>
      </div>
    </div>
  );
}

function StepHandedness({ langCode, hand, setHand }) {
  const hands = [
    { value: "left",  emoji: "🫲", label: t(langCode, "handLeft")  },
    { value: "right", emoji: "🫱", label: t(langCode, "handRight") },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4px 24px 24px" }}>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-3, #888)", margin: "0 0 28px" }}>
        {t(langCode, "step3Sub")}
      </p>
      <div style={{ display: "flex", gap: 14, flex: 1, alignItems: "flex-start" }}>
        {hands.map(h => (
          <button
            key={h.value}
            onClick={() => setHand(h.value)}
            style={{
              flex: 1, padding: "28px 16px", borderRadius: 20,
              border: `2.5px solid ${h.value === hand ? tint : "var(--sep, #ddd)"}`,
              background: h.value === hand ? `color-mix(in srgb, ${tint} 10%, transparent)` : "var(--surface, #fafafa)",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <span style={{ fontSize: 52 }}>{h.emoji}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text, #111)" }}>{h.label}</span>
            {h.value === hand && (
              <span style={{ fontSize: 22, color: tint }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepIntro({ langCode }) {
  const features = [
    {
      icon: "🧑‍🦽",
      color: "#4A90E2",
      title: t(langCode, "feat1Title"),
      text:  t(langCode, "feat1Text"),
    },
    {
      icon: "👆",
      color: tint,
      title: t(langCode, "feat2Title"),
      text:  t(langCode, "feat2Text"),
    },
    {
      icon: "🔒",
      color: "#27AE60",
      title: t(langCode, "feat3Title"),
      text:  t(langCode, "feat3Text"),
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px" }}>
      <p style={{
        textAlign: "center", fontSize: 14, color: "var(--text-3, #888)",
        margin: "0 0 20px", fontStyle: "italic",
      }}>
        {t(langCode, "introSubtitle")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: "flex", gap: 14, alignItems: "flex-start",
            padding: "16px", borderRadius: 18,
            background: `color-mix(in srgb, ${f.color} 8%, var(--surface, #fafafa))`,
            border: `1.5px solid color-mix(in srgb, ${f.color} 20%, transparent)`,
            animation: `ob-fadein 0.4s ease ${i * 0.1}s both`,
          }}>
            <div style={{
              fontSize: 28, width: 48, height: 48, flexShrink: 0,
              borderRadius: 14, background: `color-mix(in srgb, ${f.color} 15%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {f.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: "0 0 4px", fontSize: 15, fontWeight: 700,
                color: f.color,
              }}>
                {f.title}
              </p>
              <p style={{
                margin: 0, fontSize: 13.5, lineHeight: 1.5,
                color: "var(--text-2, #555)",
              }}>
                {f.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReady({ langCode, name, avatar }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 32px", textAlign: "center",
    }}>
      <div style={{
        fontSize: 72, marginBottom: 16,
        animation: "ob-bounce 0.6s ease",
      }}>
        {avatar}
      </div>
      {name ? (
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text, #111)", margin: "0 0 8px" }}>
          {name}!
        </p>
      ) : null}
      <p style={{ fontSize: 20, fontWeight: 700, color: tint, margin: "0 0 12px" }}>
        {t(langCode, "readyTitle")}
      </p>
      <p style={{ fontSize: 15, color: "var(--text-3, #888)", maxWidth: 300 }}>
        {t(langCode, "readySubtitle")}
      </p>
    </div>
  );
}

// ── Main Onboarding Component ─────────────────────────────────────────────────

const STEPS = ["language", "intro", "nameAvatar", "voice", "handedness", "ready"];
const STEP_LABELS = { language: 0, intro: 1, nameAvatar: 2, voice: 3, handedness: 4, ready: 5 };

export const ONBOARDING_KEY = "speakeasy_onboarding_v1";

export default function Onboarding({ onComplete }) {
  const [step,    setStep]   = useState(0);
  const [leaving, setLeaving] = useState(null); // "left" | "right"

  // Form state
  const [langCode, setLangCode] = useState(detectBrowserLang);
  const [name,     setName]     = useState("");
  const [avatar,   setAvatar]   = useState("🧑");
  const [gender,   setGender]   = useState("neutral");
  const [hand,     setHand]     = useState("right");

  const lang = LANGUAGES.find(l => l.code === langCode) ?? LANGUAGES[0];
  const isRtl = lang.dir === "rtl";

  const goNext = useCallback(() => {
    if (step >= STEPS.length - 1) return;
    setLeaving("left");
    setTimeout(() => { setStep(s => s + 1); setLeaving(null); }, 220);
  }, [step]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    setLeaving("right");
    setTimeout(() => { setStep(s => s - 1); setLeaving(null); }, 220);
  }, [step]);

  const handleComplete = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
    onComplete({ langCode, name: name.trim(), avatar, gender, hand });
  }, [onComplete, langCode, name, avatar, gender, hand]);

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const stepName = STEPS[step];

  // Style for slide animation
  const slideStyle = leaving === "left"
    ? { transform: "translateX(-40px)", opacity: 0 }
    : leaving === "right"
    ? { transform: "translateX(40px)", opacity: 0 }
    : { transform: "translateX(0)", opacity: 1 };

  const totalDots = STEPS.length;

  return (
    <>
      <style>{`
        @keyframes ob-bounce {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes ob-fadein {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "var(--bg, #fff)",
        display: "flex", flexDirection: "column",
        zIndex: 9999,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        direction: isRtl ? "rtl" : "ltr",
        animation: "ob-fadein 0.4s ease",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "16px 20px 10px",
          flexShrink: 0,
        }}>
          {/* Back button */}
          {!isFirst ? (
            <button
              onClick={goBack}
              aria-label="Back"
              style={{
                width: 40, height: 40, borderRadius: 12,
                border: "none", background: "var(--surface, #f0f0f0)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "var(--text, #111)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isRtl ? "→" : "←"}
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}

          {/* Logo */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontSize: 22 }}>🗣️</span>
            <span style={{
              fontSize: 17, fontWeight: 800, color: tint,
              letterSpacing: "-0.3px", marginLeft: 5,
            }}>SpeakEasy</span>
          </div>

          {/* Skip (only on non-last, non-ready steps after step 0) */}
          {!isLast && step > 0 ? (
            <button
              onClick={goNext}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 15, color: "var(--text-3, #888)", fontFamily: "inherit",
                WebkitTapHighlightColor: "transparent", padding: "4px 0",
              }}
            >
              {t(langCode, "skip")}
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}
        </div>

        {/* ── Progress dots ── */}
        <div style={{ flexShrink: 0, paddingBottom: 6 }}>
          <ProgressDots total={totalDots} current={step} />
        </div>

        {/* ── Step title ── */}
        <div style={{
          paddingLeft: 24, paddingRight: 24, paddingBottom: 16, flexShrink: 0,
          transition: "opacity 0.2s",
          opacity: leaving ? 0 : 1,
        }}>
          {step === 0 && (
            <>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text, #111)", lineHeight: 1.2 }}>
                {t(langCode, "chooseLang")}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 15, color: tint, fontWeight: 600 }}>
                {t(langCode, "tagline")}
              </p>
            </>
          )}
          {step === 1 && (
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text, #111)" }}>
              {t(langCode, "introStepTitle")}
            </p>
          )}
          {step === 2 && (
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text, #111)" }}>
              {t(langCode, "step1Title")}
            </p>
          )}
          {step === 3 && (
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text, #111)" }}>
              {t(langCode, "step2Title")}
            </p>
          )}
          {step === 4 && (
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text, #111)" }}>
              {t(langCode, "step3Title")}
            </p>
          )}
          {step === 5 && null /* ready step has its own layout */}
        </div>

        {/* ── Step content ── */}
        <div style={{
          flex: 1, overflowY: "auto", minHeight: 0,
          transition: "transform 0.22s ease, opacity 0.22s ease",
          ...slideStyle,
        }}>
          {stepName === "language"   && <StepLanguage   langCode={langCode} onSelect={setLangCode} />}
          {stepName === "intro"      && <StepIntro      langCode={langCode} />}
          {stepName === "nameAvatar" && <StepNameAvatar langCode={langCode} name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} />}
          {stepName === "voice"      && <StepVoice      langCode={langCode} gender={gender} setGender={setGender} ttsLang={lang.ttsLang} />}
          {stepName === "handedness" && <StepHandedness langCode={langCode} hand={hand} setHand={setHand} />}
          {stepName === "ready"      && <StepReady      langCode={langCode} name={name} avatar={avatar} />}
        </div>

        {/* ── Footer / Next button ── */}
        <div style={{
          padding: "12px 24px 20px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {isLast ? (
            <Btn onClick={handleComplete} style={{ width: "100%" }}>
              {t(langCode, "letsGo")}
            </Btn>
          ) : (
            <Btn onClick={goNext} style={{ width: "100%" }}>
              {t(langCode, "next")}
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}
