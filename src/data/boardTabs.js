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

// ── Default phrases per tab ────────────────────────────────────────────────

export const DEFAULT_PHRASES = {
  replies: [
    { id: "r1",  emoji: "👍", label: "yes",           translations: { en: "Yes", es: "Sí", fr: "Oui", de: "Ja", it: "Sì", pt: "Sim", ar: "نعم", zh: "是的", ja: "はい", ko: "네" } },
    { id: "r2",  emoji: "👎", label: "no",            translations: { en: "No", es: "No", fr: "Non", de: "Nein", it: "No", pt: "Não", ar: "لا", zh: "不是", ja: "いいえ", ko: "아니요" } },
    { id: "r3",  emoji: "🤔", label: "maybe",         translations: { en: "Maybe", es: "Quizás", fr: "Peut-être", de: "Vielleicht", it: "Forse", pt: "Talvez", ar: "ربما", zh: "也许", ja: "多分", ko: "아마도" } },
    { id: "r4",  emoji: "👌", label: "ok",             translations: { en: "OK, got it", es: "Vale, entendido", fr: "D'accord, compris", de: "OK, verstanden", it: "OK, capito", pt: "OK, entendi", ar: "حسناً، فهمت", zh: "好的，明白了", ja: "わかりました", ko: "알겠습니다" } },
    { id: "r5",  emoji: "🙏", label: "thanks",        translations: { en: "Thank you", es: "Gracias", fr: "Merci", de: "Danke", it: "Grazie", pt: "Obrigado", ar: "شكراً", zh: "谢谢", ja: "ありがとう", ko: "감사합니다" } },
    { id: "r6",  emoji: "😊", label: "agree",         translations: { en: "I agree", es: "Estoy de acuerdo", fr: "Je suis d'accord", de: "Einverstanden", it: "Sono d'accordo", pt: "Concordo", ar: "أوافق", zh: "我同意", ja: "同意です", ko: "동의합니다" } },
    { id: "r7",  emoji: "🤷", label: "dontKnow",      translations: { en: "I don't know", es: "No lo sé", fr: "Je ne sais pas", de: "Ich weiß nicht", it: "Non lo so", pt: "Não sei", ar: "لا أعرف", zh: "我不知道", ja: "わかりません", ko: "모르겠어요" } },
    { id: "r8",  emoji: "🔄", label: "repeat",        translations: { en: "Can you repeat?", es: "¿Puedes repetir?", fr: "Tu peux répéter?", de: "Kannst du wiederholen?", it: "Puoi ripetere?", pt: "Pode repetir?", ar: "هل يمكنك التكرار؟", zh: "能再说一遍吗？", ja: "もう一度言ってください", ko: "다시 말해주세요" } },
    { id: "r9",  emoji: "⏳", label: "wait",          translations: { en: "Give me a moment", es: "Dame un momento", fr: "Un instant", de: "Einen Moment bitte", it: "Un momento", pt: "Um momento", ar: "لحظة من فضلك", zh: "请稍等", ja: "少々お待ちください", ko: "잠시만요" } },
    { id: "r10", emoji: "⛔", label: "stop",          translations: { en: "Please stop", es: "Por favor para", fr: "Arrête s'il te plaît", de: "Bitte aufhören", it: "Per favore fermati", pt: "Por favor pare", ar: "توقف من فضلك", zh: "请停下", ja: "やめてください", ko: "멈춰주세요" } },
    { id: "r11", emoji: "😢", label: "sorry",         translations: { en: "I'm sorry", es: "Lo siento", fr: "Désolé", de: "Es tut mir leid", it: "Mi dispiace", pt: "Desculpe", ar: "أنا آسف", zh: "对不起", ja: "すみません", ko: "죄송합니다" } },
    { id: "r12", emoji: "💬", label: "tellMore",      translations: { en: "Tell me more", es: "Cuéntame más", fr: "Dis-moi plus", de: "Erzähl mir mehr", it: "Dimmi di più", pt: "Conte-me mais", ar: "أخبرني المزيد", zh: "告诉我更多", ja: "もっと教えて", ko: "더 말해주세요" } },
    { id: "r13", emoji: "📝", label: "writeIt",       translations: { en: "Can you write it down?", es: "¿Puedes escribirlo?", fr: "Tu peux l'écrire?", de: "Kannst du es aufschreiben?", it: "Puoi scriverlo?", pt: "Pode escrever?", ar: "هل يمكنك كتابة ذلك؟", zh: "能写下来吗？", ja: "書いてもらえますか？", ko: "적어줄 수 있나요?" } },
    { id: "r14", emoji: "🐢", label: "slower",        translations: { en: "Please speak slower", es: "Habla más despacio", fr: "Parle plus doucement", de: "Sprich bitte langsamer", it: "Parla più lentamente", pt: "Fale mais devagar", ar: "تكلم ببطء من فضلك", zh: "请说慢一点", ja: "ゆっくり話してください", ko: "천천히 말해주세요" } },
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
