/**
 * Board intent tabs — replaces the old single-category model with
 * communication-intent groups: Symbols, Quick Replies, Questions, Emergency.
 *
 * Each non-symbol tab has a set of phrases with full i18n translations.
 * Users can customise these from Settings → Board Config.
 */

export const BOARD_TABS = [
  { id: "symbols",   icon: "Grid3X3",       labelKey: "tabSymbols" },
  { id: "replies",   icon: "MessageCircle", labelKey: "tabReplies" },
  { id: "questions", icon: "HelpCircle",    labelKey: "tabQuestions" },
  { id: "emergency", icon: "AlertTriangle", labelKey: "tabEmergency" },
];

// ── Quick-phrase sub-categories (shown when tapping QUICK PHRASES on home) ──

export const QUICK_SUBCATEGORIES = [
  { id: "doctor",       emoji: "🩺", labelKey: "qcDoctor",       color: "#E03131", bg: "#FFF5F5" },
  { id: "daily",        emoji: "☀️", labelKey: "qcDaily",        color: "#2F9E44", bg: "#EBFBEE" },
  { id: "direction",    emoji: "🧭", labelKey: "qcDirection",    color: "#1971C2", bg: "#E7F5FF" },
  { id: "conversation", emoji: "💬", labelKey: "qcConversation", color: "#E67700", bg: "#FFF9DB" },
];

// ── Default phrases per tab ────────────────────────────────────────────────

export const DEFAULT_PHRASES = {
  // ── Generic quick replies (kept for backward compat) ────────────────────
  replies: [
    { id: "r1",  emoji: "👍", label: "yes",           translations: { en: "Yes", es: "Sí", fr: "Oui", it: "Sì", pt: "Sim" } },
    { id: "r2",  emoji: "👎", label: "no",            translations: { en: "No", es: "No", fr: "Non", it: "No", pt: "Não" } },
    { id: "r3",  emoji: "🤔", label: "maybe",         translations: { en: "Maybe", es: "Quizás", fr: "Peut-être", it: "Forse", pt: "Talvez" } },
    { id: "r4",  emoji: "👌", label: "ok",             translations: { en: "OK, got it", es: "Vale, entendido", fr: "D'accord, compris", it: "OK, capito", pt: "OK, entendi" } },
    { id: "r5",  emoji: "🙏", label: "thanks",        translations: { en: "Thank you", es: "Gracias", fr: "Merci", it: "Grazie", pt: "Obrigado" } },
    { id: "r6",  emoji: "😊", label: "agree",         translations: { en: "I agree", es: "Estoy de acuerdo", fr: "Je suis d'accord", it: "Sono d'accordo", pt: "Concordo" } },
    { id: "r7",  emoji: "🤷", label: "dontKnow",      translations: { en: "I don't know", es: "No lo sé", fr: "Je ne sais pas", it: "Non lo so", pt: "Não sei" } },
    { id: "r8",  emoji: "🔄", label: "repeat",        translations: { en: "Can you repeat?", es: "¿Puedes repetir?", fr: "Tu peux répéter?", it: "Puoi ripetere?", pt: "Pode repetir?" } },
    { id: "r9",  emoji: "⏳", label: "wait",          translations: { en: "Give me a moment", es: "Dame un momento", fr: "Un instant", it: "Un momento", pt: "Um momento" } },
    { id: "r10", emoji: "⛔", label: "stop",          translations: { en: "Please stop", es: "Por favor para", fr: "Arrête s'il te plaît", it: "Per favore fermati", pt: "Por favor pare" } },
    { id: "r11", emoji: "😢", label: "sorry",         translations: { en: "I'm sorry", es: "Lo siento", fr: "Désolé", it: "Mi dispiace", pt: "Desculpe" } },
    { id: "r12", emoji: "💬", label: "tellMore",      translations: { en: "Tell me more", es: "Cuéntame más", fr: "Dis-moi plus", it: "Dimmi di più", pt: "Conte-me mais" } },
    { id: "r13", emoji: "📝", label: "writeIt",       translations: { en: "Can you write it down?", es: "¿Puedes escribirlo?", fr: "Tu peux l'écrire?", it: "Puoi scriverlo?", pt: "Pode escrever?" } },
    { id: "r14", emoji: "🐢", label: "slower",        translations: { en: "Please speak slower", es: "Habla más despacio", fr: "Parle plus lentement", it: "Parla più lentamente", pt: "Fale mais devagar" } },
  ],

  // ── Doctor / Medical ────────────────────────────────────────────────────
  doctor: [
    { id: "d1",  emoji: "🩺", label: "seeDoctor",     translations: { en: "I need to see a doctor", es: "Necesito ver a un doctor", fr: "J'ai besoin de voir un médecin", it: "Ho bisogno di vedere un dottore", pt: "Preciso ver um médico" } },
    { id: "d2",  emoji: "🩹", label: "pain",          translations: { en: "I'm in pain", es: "Tengo dolor", fr: "J'ai mal", it: "Ho dolore", pt: "Estou com dor" } },
    { id: "d3",  emoji: "🤕", label: "headHurts",     translations: { en: "My head hurts", es: "Me duele la cabeza", fr: "J'ai mal à la tête", it: "Mi fa male la testa", pt: "Minha cabeça dói" } },
    { id: "d4",  emoji: "🤢", label: "stomachHurts",  translations: { en: "My stomach hurts", es: "Me duele el estómago", fr: "J'ai mal au ventre", it: "Mi fa male lo stomaco", pt: "Meu estômago dói" } },
    { id: "d5",  emoji: "😮‍💨", label: "breathe",       translations: { en: "I can't breathe well", es: "No puedo respirar bien", fr: "J'ai du mal à respirer", it: "Non respiro bene", pt: "Não consigo respirar bem" } },
    { id: "d6",  emoji: "💊", label: "medication",    translations: { en: "I need my medication", es: "Necesito mi medicación", fr: "J'ai besoin de mes médicaments", it: "Ho bisogno della mia medicina", pt: "Preciso da minha medicação" } },
    { id: "d7",  emoji: "💉", label: "allergic",      translations: { en: "I'm allergic", es: "Soy alérgico", fr: "Je suis allergique", it: "Sono allergico", pt: "Sou alérgico" } },
    { id: "d8",  emoji: "🤒", label: "fever",         translations: { en: "I have a fever", es: "Tengo fiebre", fr: "J'ai de la fièvre", it: "Ho la febbre", pt: "Estou com febre" } },
    { id: "d9",  emoji: "🤮", label: "nausea",        translations: { en: "I feel nauseous", es: "Tengo náuseas", fr: "J'ai la nausée", it: "Ho la nausea", pt: "Estou com náusea" } },
    { id: "d10", emoji: "😵‍💫", label: "dizzy",         translations: { en: "I feel dizzy", es: "Estoy mareado", fr: "J'ai des vertiges", it: "Mi gira la testa", pt: "Estou tonto" } },
    { id: "d11", emoji: "📋", label: "medCard",       translations: { en: "Please read my medical card", es: "Lee mi tarjeta médica", fr: "Lisez ma carte médicale", it: "Leggete la mia tessera sanitaria", pt: "Leia meu cartão médico" } },
    { id: "d12", emoji: "🗓️", label: "appointment",   translations: { en: "I have an appointment", es: "Tengo una cita", fr: "J'ai un rendez-vous", it: "Ho un appuntamento", pt: "Tenho uma consulta" } },
    { id: "d13", emoji: "💤", label: "cantSleep",     translations: { en: "I can't sleep", es: "No puedo dormir", fr: "Je n'arrive pas à dormir", it: "Non riesco a dormire", pt: "Não consigo dormir" } },
    { id: "d14", emoji: "🦷", label: "toothache",     translations: { en: "I have a toothache", es: "Me duele un diente", fr: "J'ai mal aux dents", it: "Ho mal di denti", pt: "Estou com dor de dente" } },
  ],

  // ── Daily / Routine ─────────────────────────────────────────────────────
  daily: [
    { id: "dy1",  emoji: "🌅", label: "goodMorning",  translations: { en: "Good morning", es: "Buenos días", fr: "Bonjour", it: "Buongiorno", pt: "Bom dia" } },
    { id: "dy2",  emoji: "🌙", label: "goodNight",    translations: { en: "Good night", es: "Buenas noches", fr: "Bonne nuit", it: "Buonanotte", pt: "Boa noite" } },
    { id: "dy3",  emoji: "🍽️", label: "hungry",       translations: { en: "I'm hungry", es: "Tengo hambre", fr: "J'ai faim", it: "Ho fame", pt: "Estou com fome" } },
    { id: "dy4",  emoji: "💧", label: "thirsty",      translations: { en: "I'm thirsty", es: "Tengo sed", fr: "J'ai soif", it: "Ho sete", pt: "Estou com sede" } },
    { id: "dy5",  emoji: "🚻", label: "bathroom",     translations: { en: "I need the bathroom", es: "Necesito el baño", fr: "J'ai besoin d'aller aux toilettes", it: "Ho bisogno del bagno", pt: "Preciso ir ao banheiro" } },
    { id: "dy6",  emoji: "🍳", label: "breakfast",    translations: { en: "Time for breakfast", es: "Hora de desayunar", fr: "C'est l'heure du petit-déjeuner", it: "È ora di colazione", pt: "Hora do café da manhã" } },
    { id: "dy7",  emoji: "🍝", label: "lunch",        translations: { en: "Time for lunch", es: "Hora de almorzar", fr: "C'est l'heure du déjeuner", it: "È ora di pranzo", pt: "Hora do almoço" } },
    { id: "dy8",  emoji: "🍽️", label: "dinner",       translations: { en: "Time for dinner", es: "Hora de cenar", fr: "C'est l'heure du dîner", it: "È ora di cena", pt: "Hora do jantar" } },
    { id: "dy9",  emoji: "😴", label: "tired",        translations: { en: "I'm tired", es: "Estoy cansado", fr: "Je suis fatigué", it: "Sono stanco", pt: "Estou cansado" } },
    { id: "dy10", emoji: "✅", label: "ready",        translations: { en: "I'm ready", es: "Estoy listo", fr: "Je suis prêt", it: "Sono pronto", pt: "Estou pronto" } },
    { id: "dy11", emoji: "🚿", label: "shower",       translations: { en: "I want to take a shower", es: "Quiero ducharme", fr: "Je veux prendre une douche", it: "Voglio fare la doccia", pt: "Quero tomar banho" } },
    { id: "dy12", emoji: "👕", label: "getChanged",   translations: { en: "I need to get changed", es: "Necesito cambiarme", fr: "Je dois me changer", it: "Devo cambiarmi", pt: "Preciso me trocar" } },
    { id: "dy13", emoji: "📺", label: "watchTV",      translations: { en: "I want to watch TV", es: "Quiero ver la tele", fr: "Je veux regarder la télé", it: "Voglio guardare la TV", pt: "Quero ver TV" } },
    { id: "dy14", emoji: "🚶", label: "goOut",        translations: { en: "I want to go outside", es: "Quiero salir", fr: "Je veux sortir", it: "Voglio uscire", pt: "Quero sair" } },
  ],

  // ── Direction / Navigation ──────────────────────────────────────────────
  direction: [
    { id: "dr1",  emoji: "📍", label: "whereAreWe",   translations: { en: "Where are we?", es: "¿Dónde estamos?", fr: "Où sommes-nous?", it: "Dove siamo?", pt: "Onde estamos?" } },
    { id: "dr2",  emoji: "⬅️", label: "turnLeft",     translations: { en: "Turn left", es: "Gira a la izquierda", fr: "Tournez à gauche", it: "Gira a sinistra", pt: "Vire à esquerda" } },
    { id: "dr3",  emoji: "➡️", label: "turnRight",    translations: { en: "Turn right", es: "Gira a la derecha", fr: "Tournez à droite", it: "Gira a destra", pt: "Vire à direita" } },
    { id: "dr4",  emoji: "⬆️", label: "goStraight",   translations: { en: "Go straight", es: "Sigue recto", fr: "Allez tout droit", it: "Vai dritto", pt: "Siga em frente" } },
    { id: "dr5",  emoji: "🛑", label: "stopHere",     translations: { en: "Stop here", es: "Para aquí", fr: "Arrêtez-vous ici", it: "Fermati qui", pt: "Pare aqui" } },
    { id: "dr6",  emoji: "😰", label: "imLost",       translations: { en: "I'm lost", es: "Estoy perdido", fr: "Je suis perdu", it: "Mi sono perso", pt: "Estou perdido" } },
    { id: "dr7",  emoji: "🏠", label: "takeHome",     translations: { en: "Take me home", es: "Llévame a casa", fr: "Ramenez-moi à la maison", it: "Portami a casa", pt: "Me leve para casa" } },
    { id: "dr8",  emoji: "📏", label: "howFar",       translations: { en: "How far is it?", es: "¿A qué distancia está?", fr: "C'est loin?", it: "Quanto è lontano?", pt: "Quão longe fica?" } },
    { id: "dr9",  emoji: "🚕", label: "needTaxi",     translations: { en: "I need a taxi", es: "Necesito un taxi", fr: "J'ai besoin d'un taxi", it: "Ho bisogno di un taxi", pt: "Preciso de um táxi" } },
    { id: "dr10", emoji: "🚻", label: "whereBathroom",translations: { en: "Where is the bathroom?", es: "¿Dónde está el baño?", fr: "Où sont les toilettes?", it: "Dov'è il bagno?", pt: "Onde fica o banheiro?" } },
    { id: "dr11", emoji: "🔙", label: "goBack",       translations: { en: "Let's go back", es: "Volvamos", fr: "Revenons en arrière", it: "Torniamo indietro", pt: "Vamos voltar" } },
    { id: "dr12", emoji: "🚌", label: "takeBus",      translations: { en: "Which bus do I take?", es: "¿Qué autobús tomo?", fr: "Quel bus je prends?", it: "Quale autobus prendo?", pt: "Qual ônibus eu pego?" } },
  ],

  // ── Conversation / Social ───────────────────────────────────────────────
  conversation: [
    { id: "cv1",  emoji: "👋", label: "howAreYou",    translations: { en: "How are you?", es: "¿Cómo estás?", fr: "Comment tu vas ?", it: "Come stai?", pt: "Como vai?" } },
    { id: "cv2",  emoji: "😊", label: "imFine",       translations: { en: "I'm fine, thank you", es: "Estoy bien, gracias", fr: "Je vais bien, merci", it: "Sto bene, grazie", pt: "Estou bem, obrigado" } },
    { id: "cv3",  emoji: "🤝", label: "niceToMeet",   translations: { en: "Nice to meet you", es: "Mucho gusto", fr: "Enchanté", it: "Piacere di conoscerti", pt: "Prazer em conhecer" } },
    { id: "cv4",  emoji: "👤", label: "yourName",     translations: { en: "What's your name?", es: "¿Cómo te llamas?", fr: "Comment tu t'appelles?", it: "Come ti chiami?", pt: "Qual é o seu nome?" } },
    { id: "cv5",  emoji: "💬", label: "tellMore",     translations: { en: "Tell me more", es: "Cuéntame más", fr: "Dis-moi plus", it: "Dimmi di più", pt: "Conte-me mais" } },
    { id: "cv6",  emoji: "😂", label: "thatsFunny",   translations: { en: "That's funny!", es: "¡Eso es gracioso!", fr: "C'est drôle!", it: "È divertente!", pt: "Isso é engraçado!" } },
    { id: "cv7",  emoji: "😊", label: "agree",        translations: { en: "I agree", es: "Estoy de acuerdo", fr: "Je suis d'accord", it: "Sono d'accordo", pt: "Concordo" } },
    { id: "cv8",  emoji: "🙅", label: "disagree",     translations: { en: "I don't agree", es: "No estoy de acuerdo", fr: "Je ne suis pas d'accord", it: "Non sono d'accordo", pt: "Não concordo" } },
    { id: "cv9",  emoji: "🐢", label: "speakSlower",  translations: { en: "Please speak slower", es: "Habla más despacio", fr: "Parle plus lentement", it: "Parla più lentamente", pt: "Fale mais devagar" } },
    { id: "cv10", emoji: "🤔", label: "dontUnderstand",translations: { en: "I don't understand", es: "No entiendo", fr: "Je ne comprends pas", it: "Non capisco", pt: "Não entendo" } },
    { id: "cv11", emoji: "🔄", label: "repeat",       translations: { en: "Can you repeat?", es: "¿Puedes repetir?", fr: "Tu peux répéter?", it: "Puoi ripetere?", pt: "Pode repetir?" } },
    { id: "cv12", emoji: "🕐", label: "talkLater",    translations: { en: "Let's talk later", es: "Hablemos luego", fr: "Parlons plus tard", it: "Parliamo dopo", pt: "Vamos conversar depois" } },
    { id: "cv13", emoji: "😢", label: "sorry",        translations: { en: "I'm sorry", es: "Lo siento", fr: "Désolé", it: "Mi dispiace", pt: "Desculpe" } },
    { id: "cv14", emoji: "👋", label: "goodbye",      translations: { en: "Goodbye, see you soon", es: "Adiós, nos vemos", fr: "Au revoir, à bientôt", it: "Arrivederci, a presto", pt: "Tchau, até logo" } },
  ],

  questions: [
    { id: "q1",  emoji: "🕐", label: "whatTime",      translations: { en: "What time is it?", es: "¿Qué hora es?", fr: "Quelle heure est-il?", de: "Wie spät ist es?", it: "Che ore sono?", pt: "Que horas são?", ar: "كم الساعة؟", zh: "现在几点？", ja: "今何時ですか？", ko: "몇 시예요?" } },
    { id: "q2",  emoji: "📍", label: "where",         translations: { en: "Where is it?", es: "¿Dónde está?", fr: "Où est-ce?", de: "Wo ist das?", it: "Dove si trova?", pt: "Onde fica?", ar: "أين هو؟", zh: "在哪里？", ja: "どこですか？", ko: "어디에요?" } },
    { id: "q3",  emoji: "🚻", label: "bathroom",      translations: { en: "Where is the bathroom?", es: "¿Dónde está el baño?", fr: "Où sont les toilettes?", de: "Wo ist die Toilette?", it: "Dov'è il bagno?", pt: "Onde fica o banheiro?", ar: "أين الحمام؟", zh: "洗手间在哪里？", ja: "トイレはどこですか？", ko: "화장실이 어디예요?" } },
    { id: "q4",  emoji: "💰", label: "howMuch",       translations: { en: "How much does it cost?", es: "¿Cuánto cuesta?", fr: "Combien ça coûte?", de: "Wie viel kostet das?", it: "Quanto costa?", pt: "Quanto custa?", ar: "كم الثمن؟", zh: "多少钱？", ja: "いくらですか？", ko: "얼마예요?" } },
    { id: "q5",  emoji: "🗓️", label: "when",          translations: { en: "When?", es: "¿Cuándo?", fr: "Quand?", de: "Wann?", it: "Quando?", pt: "Quando?", ar: "متى؟", zh: "什么时候？", ja: "いつ？", ko: "언제요?" } },
    { id: "q6",  emoji: "👤", label: "who",           translations: { en: "Who?", es: "¿Quién?", fr: "Qui?", de: "Wer?", it: "Chi?", pt: "Quem?", ar: "من؟", zh: "谁？", ja: "誰？", ko: "누구요?" } },
    { id: "q7",  emoji: "❓", label: "why",           translations: { en: "Why?", es: "¿Por qué?", fr: "Pourquoi?", de: "Warum?", it: "Perché?", pt: "Por quê?", ar: "لماذا؟", zh: "为什么？", ja: "なぜ？", ko: "왜요?" } },
    { id: "q8",  emoji: "🔧", label: "howDoI",        translations: { en: "How do I do this?", es: "¿Cómo hago esto?", fr: "Comment je fais?", de: "Wie mache ich das?", it: "Come faccio?", pt: "Como faço isso?", ar: "كيف أفعل هذا؟", zh: "这怎么做？", ja: "これはどうやりますか？", ko: "이거 어떻게 해요?" } },
    { id: "q9",  emoji: "🤝", label: "canYouHelp",    translations: { en: "Can you help me?", es: "¿Puedes ayudarme?", fr: "Tu peux m'aider?", de: "Kannst du mir helfen?", it: "Puoi aiutarmi?", pt: "Pode me ajudar?", ar: "هل يمكنك مساعدتي؟", zh: "你能帮帮我吗？", ja: "手伝ってくれますか？", ko: "도와줄 수 있나요?" } },
    { id: "q10", emoji: "📞", label: "canYouCall",    translations: { en: "Can you make a call for me?", es: "¿Puedes llamar por mí?", fr: "Tu peux appeler pour moi?", de: "Kannst du für mich anrufen?", it: "Puoi fare una chiamata per me?", pt: "Pode ligar para mim?", ar: "هل يمكنك الاتصال نيابة عني؟", zh: "你能帮我打个电话吗？", ja: "電話してもらえますか？", ko: "전화해줄 수 있나요?" } },
  ],

  emergency: [
    { id: "e1",  emoji: "🆘", label: "helpMe",        translations: { en: "HELP ME!", es: "¡AYUDA!", fr: "AIDEZ-MOI!", de: "HILFE!", it: "AIUTO!", pt: "SOCORRO!", ar: "ساعدوني!", zh: "救命！", ja: "助けて！", ko: "도와주세요!" }, urgent: true },
    { id: "e2",  emoji: "🚑", label: "call911",       translations: { en: "Call 911 now!", es: "¡Llama al 112!", fr: "Appelez le 15!", de: "Rufen Sie 112 an!", it: "Chiamate il 118!", pt: "Ligue 192!", ar: "اتصل بالإسعاف!", zh: "打120！", ja: "119に電話！", ko: "119에 전화!" }, urgent: true },
    { id: "e3",  emoji: "🩹", label: "inPain",        translations: { en: "I'm in pain", es: "Tengo dolor", fr: "J'ai mal", de: "Ich habe Schmerzen", it: "Ho dolore", pt: "Estou com dor", ar: "أشعر بألم", zh: "我很痛", ja: "痛いです", ko: "아파요" }, urgent: true },
    { id: "e4",  emoji: "💊", label: "needMeds",      translations: { en: "I need my medication", es: "Necesito mi medicación", fr: "J'ai besoin de mes médicaments", de: "Ich brauche meine Medikamente", it: "Ho bisogno della mia medicina", pt: "Preciso da minha medicação", ar: "أحتاج دوائي", zh: "我需要吃药", ja: "薬が必要です", ko: "약이 필요해요" } },
    { id: "e5",  emoji: "💧", label: "needWater",     translations: { en: "I need water", es: "Necesito agua", fr: "J'ai besoin d'eau", de: "Ich brauche Wasser", it: "Ho bisogno d'acqua", pt: "Preciso de água", ar: "أحتاج ماء", zh: "我需要水", ja: "水が必要です", ko: "물이 필요해요" } },
    { id: "e6",  emoji: "😮‍💨", label: "cantBreathe",   translations: { en: "I can't breathe well", es: "No puedo respirar bien", fr: "J'ai du mal à respirer", de: "Ich kann nicht gut atmen", it: "Non respiro bene", pt: "Não consigo respirar bem", ar: "لا أستطيع التنفس", zh: "我呼吸困难", ja: "息がしにくい", ko: "숨쉬기 힘들어요" }, urgent: true },
    { id: "e7",  emoji: "🤢", label: "feelSick",      translations: { en: "I feel sick", es: "Me siento mal", fr: "Je me sens mal", de: "Mir ist schlecht", it: "Mi sento male", pt: "Estou passando mal", ar: "أشعر بالمرض", zh: "我不舒服", ja: "気分が悪いです", ko: "몸이 안 좋아요" } },
    { id: "e8",  emoji: "🏠", label: "goHome",        translations: { en: "I need to go home", es: "Necesito ir a casa", fr: "Je dois rentrer chez moi", de: "Ich muss nach Hause", it: "Devo andare a casa", pt: "Preciso ir para casa", ar: "أحتاج للعودة للمنزل", zh: "我需要回家", ja: "家に帰りたい", ko: "집에 가야 해요" } },
    { id: "e9",  emoji: "🚫", label: "leaveAlone",    translations: { en: "Please leave me alone", es: "Déjame en paz", fr: "Laissez-moi tranquille", de: "Lassen Sie mich in Ruhe", it: "Lasciatemi in pace", pt: "Me deixe em paz", ar: "اتركوني وحدي", zh: "请别打扰我", ja: "一人にしてください", ko: "혼자 있게 해주세요" } },
    { id: "e10", emoji: "👨‍⚕️", label: "needDoctor",    translations: { en: "I need a doctor", es: "Necesito un doctor", fr: "J'ai besoin d'un médecin", de: "Ich brauche einen Arzt", it: "Ho bisogno di un dottore", pt: "Preciso de um médico", ar: "أحتاج طبيب", zh: "我需要看医生", ja: "医者が必要です", ko: "의사가 필요해요" } },
    { id: "e11", emoji: "🤒", label: "allergic",      translations: { en: "I'm having an allergic reaction", es: "Tengo una reacción alérgica", fr: "Je fais une réaction allergique", de: "Ich habe eine allergische Reaktion", it: "Ho una reazione allergica", pt: "Estou tendo uma reação alérgica", ar: "لدي حساسية", zh: "我过敏了", ja: "アレルギー反応が出ています", ko: "알레르기 반응이에요" }, urgent: true },
    { id: "e12", emoji: "📋", label: "medicalCard",   translations: { en: "Please read my medical card", es: "Lee mi tarjeta médica", fr: "Lisez ma carte médicale", de: "Bitte lesen Sie meinen Notfallausweis", it: "Leggete la mia tessera sanitaria", pt: "Leia meu cartão médico", ar: "يرجى قراءة بطاقتي الطبية", zh: "请看我的医疗卡", ja: "医療カードを読んでください", ko: "의료 카드를 읽어주세요" } },
  ],
};
