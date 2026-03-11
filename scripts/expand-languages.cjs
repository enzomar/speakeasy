/**
 * expand-languages.cjs
 * 
 * Temporary script to expand lexicon.json and morphologyTables.json
 * from 5 languages (en/it/fr/es/pt) to 10 languages (+de/ar/zh/ja/ko).
 * Run once, then delete.
 */

const fs = require('fs');
const path = require('path');

const LEX_PATH  = path.join(__dirname, '..', 'src/engine/lexicon.json');
const MORPH_PATH = path.join(__dirname, '..', 'src/engine/morphologyTables.json');

const lex  = JSON.parse(fs.readFileSync(LEX_PATH, 'utf8'));
const morph = JSON.parse(fs.readFileSync(MORPH_PATH, 'utf8'));

// ═══════════════════════════════════════════════════════════════════════
// 1. Update meta
// ═══════════════════════════════════════════════════════════════════════
lex._meta.languages = ["en","it","fr","es","pt","de","ar","zh","ja","ko"];

// Helper: merge new labels into an existing concept
function addLabels(concept, additions) {
  if (!concept) return;
  if (concept.labels) Object.assign(concept.labels, additions);
  else if (concept.lemma) Object.assign(concept.lemma, additions);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. LEXICON — Pronoun labels
// ═══════════════════════════════════════════════════════════════════════
const PRONOUNS = {
  I:    { de:"ich",  ar:"أنا",  zh:"我",   ja:"私",    ko:"나"   },
  YOU:  { de:"du",   ar:"أنت",  zh:"你",   ja:"あなた", ko:"너"   },
  HE:   { de:"er",   ar:"هو",   zh:"他",   ja:"彼",    ko:"그"   },
  SHE:  { de:"sie",  ar:"هي",   zh:"她",   ja:"彼女",  ko:"그녀"  },
  WE:   { de:"wir",  ar:"نحن",  zh:"我们",  ja:"私たち", ko:"우리"  },
  THEY: { de:"sie",  ar:"هم",   zh:"他们",  ja:"彼ら",  ko:"그들"  },
};
for (const [id, t] of Object.entries(PRONOUNS)) addLabels(lex.concepts[id], t);

// ═══════════════════════════════════════════════════════════════════════
// 3. LEXICON — Noun labels (people, objects, misc)
// ═══════════════════════════════════════════════════════════════════════
const NOUN_LABELS = {
  // People
  MOM:       { de:"Mama",       ar:"أمي",       zh:"妈妈",   ja:"お母さん",   ko:"엄마"   },
  DAD:       { de:"Papa",       ar:"أبي",       zh:"爸爸",   ja:"お父さん",   ko:"아빠"   },
  FRIEND:    { de:"Freund",     ar:"صديق",      zh:"朋友",   ja:"友達",      ko:"친구"   },
  DOCTOR:    { de:"Arzt",       ar:"طبيب",      zh:"医生",   ja:"医者",      ko:"의사"   },
  TEACHER:   { de:"Lehrer",     ar:"معلم",      zh:"老师",   ja:"先生",      ko:"선생님"  },
  EVERYONE:  { de:"alle",       ar:"الجميع",    zh:"所有人",  ja:"みんな",    ko:"모두"   },
  // Objects
  WATER:     { de:"Wasser",     ar:"ماء",       zh:"水",     ja:"水",        ko:"물"     },
  FOOD:      { de:"Essen",      ar:"طعام",      zh:"食物",   ja:"食べ物",    ko:"음식"   },
  MILK:      { de:"Milch",      ar:"حليب",      zh:"牛奶",   ja:"牛乳",      ko:"우유"   },
  JUICE:     { de:"Saft",       ar:"عصير",      zh:"果汁",   ja:"ジュース",  ko:"주스"   },
  BREAD:     { de:"Brot",       ar:"خبز",       zh:"面包",   ja:"パン",      ko:"빵"     },
  MEDICINE:  { de:"Medikament", ar:"دواء",      zh:"药",     ja:"薬",        ko:"약"     },
  BOOK:      { de:"Buch",       ar:"كتاب",      zh:"书",     ja:"本",        ko:"책"     },
  PHONE:     { de:"Telefon",    ar:"هاتف",      zh:"手机",   ja:"電話",      ko:"전화기"  },
  // Additional people
  TOILET:    { de:"Toilette",   ar:"حمام",      zh:"厕所",   ja:"トイレ",    ko:"화장실"  },
  SPACE:     { de:"Platz",      ar:"مساحة",     zh:"空间",   ja:"場所",      ko:"공간"   },
  BREAK:     { de:"Pause",      ar:"استراحة",   zh:"休息",   ja:"休憩",      ko:"휴식"   },
  BROTHER:   { de:"Bruder",     ar:"أخ",        zh:"哥哥",   ja:"兄",        ko:"형"     },
  SISTER:    { de:"Schwester",  ar:"أخت",       zh:"姐姐",   ja:"姉",        ko:"언니"   },
  GRANDMA:   { de:"Oma",        ar:"جدة",       zh:"奶奶",   ja:"おばあさん", ko:"할머니"  },
  GRANDPA:   { de:"Opa",        ar:"جد",        zh:"爷爷",   ja:"おじいさん", ko:"할아버지" },
  NURSE:     { de:"Pfleger",    ar:"ممرض",      zh:"护士",   ja:"看護師",    ko:"간호사"  },
  THERAPIST: { de:"Therapeut",  ar:"معالج",     zh:"治疗师",  ja:"セラピスト", ko:"치료사"  },
  CAREGIVER: { de:"Betreuer",   ar:"مقدم رعاية", zh:"护理员", ja:"介護者",    ko:"돌보미"  },
};
for (const [id, t] of Object.entries(NOUN_LABELS)) addLabels(lex.concepts[id], t);

// German articles for nouns
const DE_ARTICLES = {
  MOM:       { def:"die Mama",       indef:"eine Mama"        },
  DAD:       { def:"der Papa",       indef:"ein Papa"         },
  FRIEND:    { def:"der Freund",     indef:"ein Freund"       },
  DOCTOR:    { def:"der Arzt",       indef:"ein Arzt"         },
  TEACHER:   { def:"der Lehrer",     indef:"ein Lehrer"       },
  WATER:     { def:"das Wasser",     indef:"Wasser",     part:"Wasser"    },
  FOOD:      { def:"das Essen",      indef:"Essen",      part:"Essen"     },
  MILK:      { def:"die Milch",      indef:"Milch",      part:"Milch"     },
  JUICE:     { def:"der Saft",       indef:"Saft",       part:"Saft"      },
  BREAD:     { def:"das Brot",       indef:"Brot",       part:"Brot"      },
  MEDICINE:  { def:"das Medikament", indef:"ein Medikament"   },
  BOOK:      { def:"das Buch",       indef:"ein Buch"         },
  PHONE:     { def:"das Telefon",    indef:"ein Telefon"      },
  TOILET:    { def:"die Toilette",   indef:"eine Toilette"    },
  SPACE:     { def:"der Platz",      indef:"ein Platz"        },
  BREAK:     { def:"die Pause",      indef:"eine Pause"       },
  BROTHER:   { def:"der Bruder",     indef:"ein Bruder"       },
  SISTER:    { def:"die Schwester",  indef:"eine Schwester"   },
  GRANDMA:   { def:"die Oma",        indef:"eine Oma"         },
  GRANDPA:   { def:"der Opa",        indef:"ein Opa"          },
  NURSE:     { def:"der Pfleger",    indef:"ein Pfleger"      },
  THERAPIST: { def:"der Therapeut",  indef:"ein Therapeut"    },
  CAREGIVER: { def:"der Betreuer",   indef:"ein Betreuer"     },
};
for (const [id, arts] of Object.entries(DE_ARTICLES)) {
  if (!lex.concepts[id].articles) lex.concepts[id].articles = {};
  lex.concepts[id].articles.de = arts;
}

// ═══════════════════════════════════════════════════════════════════════
// 4. LEXICON — Verb lemmas
// ═══════════════════════════════════════════════════════════════════════
const VERB_LEMMAS = {
  GO:         { de:"gehen",      ar:"ذهب",      zh:"去",    ja:"行く",      ko:"가다"     },
  COME:       { de:"kommen",     ar:"جاء",      zh:"来",    ja:"来る",      ko:"오다"     },
  EAT:        { de:"essen",      ar:"أكل",      zh:"吃",    ja:"食べる",    ko:"먹다"     },
  DRINK:      { de:"trinken",    ar:"شرب",      zh:"喝",    ja:"飲む",      ko:"마시다"   },
  SLEEP:      { de:"schlafen",   ar:"نام",      zh:"睡觉",  ja:"寝る",      ko:"자다"     },
  PLAY:       { de:"spielen",    ar:"لعب",      zh:"玩",    ja:"遊ぶ",      ko:"놀다"     },
  WANT:       { de:"wollen",     ar:"أراد",     zh:"想要",  ja:"欲しい",    ko:"원하다"   },
  LIKE:       { de:"mögen",      ar:"أحب",      zh:"喜欢",  ja:"好き",      ko:"좋아하다" },
  NEED:       { de:"brauchen",   ar:"احتاج",    zh:"需要",  ja:"必要",      ko:"필요하다" },
  GIVE:       { de:"geben",      ar:"أعطى",     zh:"给",    ja:"あげる",    ko:"주다"     },
  HELP:       { de:"helfen",     ar:"ساعد",     zh:"帮助",  ja:"助ける",    ko:"돕다"     },
  LOOK:       { de:"schauen",    ar:"نظر",      zh:"看",    ja:"見る",      ko:"보다"     },
  LISTEN:     { de:"hören",      ar:"استمع",    zh:"听",    ja:"聞く",      ko:"듣다"     },
  READ:       { de:"lesen",      ar:"قرأ",      zh:"读",    ja:"読む",      ko:"읽다"     },
  OPEN:       { de:"öffnen",     ar:"فتح",      zh:"开",    ja:"開ける",    ko:"열다"     },
  STOP:       { de:"aufhören",   ar:"توقف",     zh:"停",    ja:"止める",    ko:"멈추다"   },
  WAIT:       { de:"warten",     ar:"انتظر",    zh:"等",    ja:"待つ",      ko:"기다리다" },
  FEEL:       { de:"fühlen",     ar:"شعر",      zh:"感觉",  ja:"感じる",    ko:"느끼다"   },
  // Additional verbs
  WATCH:      { de:"anschauen",  ar:"شاهد",     zh:"看",    ja:"見る",      ko:"보다"     },
  FINISH:     { de:"beenden",    ar:"أنهى",     zh:"完成",  ja:"終わる",    ko:"끝내다"   },
  TURN:       { de:"drehen",     ar:"دار",      zh:"转",    ja:"回す",      ko:"돌리다"   },
  SHOW:       { de:"zeigen",     ar:"أظهر",     zh:"给看",  ja:"見せる",    ko:"보여주다" },
  CHOOSE:     { de:"wählen",     ar:"اختار",    zh:"选择",  ja:"選ぶ",      ko:"고르다"   },
  UNDERSTAND: { de:"verstehen",  ar:"فهم",      zh:"理解",  ja:"分かる",    ko:"이해하다" },
  TELL:       { de:"sagen",      ar:"قال",      zh:"告诉",  ja:"言う",      ko:"말하다"   },
  ASK:        { de:"fragen",     ar:"سأل",      zh:"问",    ja:"聞く",      ko:"묻다"     },
  REPEAT:     { de:"wiederholen", ar:"كرر",     zh:"重复",  ja:"繰り返す",  ko:"반복하다" },
  HUG:        { de:"umarmen",    ar:"عانق",     zh:"拥抱",  ja:"抱きしめる", ko:"안다"    },
  CHANGE:     { de:"ändern",     ar:"غيّر",     zh:"改变",  ja:"変える",    ko:"바꾸다"   },
  REST:       { de:"ausruhen",   ar:"استراح",   zh:"休息",  ja:"休む",      ko:"쉬다"     },
};
for (const [id, t] of Object.entries(VERB_LEMMAS)) addLabels(lex.concepts[id], t);

// ═══════════════════════════════════════════════════════════════════════
// 5. LEXICON — Place labels + locatives
// ═══════════════════════════════════════════════════════════════════════
const PLACE_ADDITIONS = {
  HOME:       { labels:{ de:"Zuhause",     ar:"بيت",     zh:"家",    ja:"家",     ko:"집"    }, locative:{ de:"nach Hause",      ar:"إلى البيت",       zh:"回家",       ja:"家に",       ko:"집에"      }},
  SCHOOL:     { labels:{ de:"Schule",      ar:"مدرسة",   zh:"学校",  ja:"学校",   ko:"학교"  }, locative:{ de:"zur Schule",      ar:"إلى المدرسة",     zh:"去学校",     ja:"学校に",     ko:"학교에"    }},
  HOSPITAL:   { labels:{ de:"Krankenhaus", ar:"مستشفى",  zh:"医院",  ja:"病院",   ko:"병원"  }, locative:{ de:"ins Krankenhaus", ar:"إلى المستشفى",    zh:"去医院",     ja:"病院に",     ko:"병원에"    }},
  PARK:       { labels:{ de:"Park",        ar:"حديقة",   zh:"公园",  ja:"公園",   ko:"공원"  }, locative:{ de:"in den Park",     ar:"إلى الحديقة",     zh:"去公园",     ja:"公園に",     ko:"공원에"    }},
  OUTSIDE:    { labels:{ de:"draußen",     ar:"خارج",    zh:"外面",  ja:"外",     ko:"밖"    }, locative:{ de:"nach draußen",    ar:"إلى الخارج",      zh:"去外面",     ja:"外に",       ko:"밖에"      }},
  STORE:      { labels:{ de:"Laden",       ar:"متجر",    zh:"商店",  ja:"お店",   ko:"가게"  }, locative:{ de:"zum Laden",       ar:"إلى المتجر",      zh:"去商店",     ja:"お店に",     ko:"가게에"    }},
  RESTAURANT: { labels:{ de:"Restaurant",  ar:"مطعم",    zh:"餐厅",  ja:"レストラン", ko:"식당" }, locative:{ de:"ins Restaurant", ar:"إلى المطعم",      zh:"去餐厅",     ja:"レストランに", ko:"식당에"   }},
  CAR:        { labels:{ de:"Auto",        ar:"سيارة",   zh:"汽车",  ja:"車",     ko:"차"    }, locative:{ de:"ins Auto",        ar:"في السيارة",      zh:"上车",       ja:"車に",       ko:"차에"      }},
  BUS:        { labels:{ de:"Bus",         ar:"حافلة",   zh:"公交车", ja:"バス",   ko:"버스"  }, locative:{ de:"in den Bus",      ar:"في الحافلة",      zh:"上公交车",   ja:"バスに",     ko:"버스에"    }},
  BATHROOM:   { labels:{ de:"Badezimmer",  ar:"حمام",    zh:"卫生间", ja:"トイレ", ko:"화장실"}, locative:{ de:"ins Badezimmer",  ar:"إلى الحمام",      zh:"去卫生间",   ja:"トイレに",   ko:"화장실에"  }},
};
for (const [id, data] of Object.entries(PLACE_ADDITIONS)) {
  Object.assign(lex.concepts[id].labels, data.labels);
  Object.assign(lex.concepts[id].locative, data.locative);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. LEXICON — Adjective labels
// ═══════════════════════════════════════════════════════════════════════
// Gender-sensitive adjectives: Arabic gets {m, f} objects; de/zh/ja/ko get flat strings
const GENDER_ADJ = {
  HAPPY:      { de:"glücklich",  ar:{ m:"سعيد",    f:"سعيدة"    }, zh:"高兴",  ja:"嬉しい",   ko:"행복한"   },
  SAD:        { de:"traurig",    ar:{ m:"حزين",    f:"حزينة"    }, zh:"难过",  ja:"悲しい",   ko:"슬픈"     },
  ANGRY:      { de:"wütend",     ar:{ m:"غاضب",    f:"غاضبة"    }, zh:"生气",  ja:"怒った",   ko:"화난"     },
  SCARED:     { de:"ängstlich",  ar:{ m:"خائف",    f:"خائفة"    }, zh:"害怕",  ja:"怖い",    ko:"무서운"   },
  TIRED:      { de:"müde",       ar:{ m:"متعب",    f:"متعبة"    }, zh:"累",   ja:"疲れた",   ko:"피곤한"   },
  SICK:       { de:"krank",      ar:{ m:"مريض",    f:"مريضة"    }, zh:"病",   ja:"病気",    ko:"아픈"     },
  HURT:       { de:"verletzt",   ar:{ m:"مصاب",    f:"مصابة"    }, zh:"疼",   ja:"痛い",    ko:"다친"     },
  GOOD:       { de:"gut",        ar:{ m:"جيد",     f:"جيدة"     }, zh:"好",   ja:"良い",    ko:"좋은"     },
  BAD:        { de:"schlecht",   ar:{ m:"سيئ",     f:"سيئة"     }, zh:"坏",   ja:"悪い",    ko:"나쁜"     },
  BIG:        { de:"groß",       ar:{ m:"كبير",    f:"كبيرة"    }, zh:"大",   ja:"大きい",   ko:"큰"      },
  SMALL:      { de:"klein",      ar:{ m:"صغير",    f:"صغيرة"    }, zh:"小",   ja:"小さい",   ko:"작은"     },
  FRUSTRATED: { de:"frustriert", ar:{ m:"محبط",    f:"محبطة"    }, zh:"沮丧",  ja:"苛立った", ko:"답답한"   },
  CONFUSED:   { de:"verwirrt",   ar:{ m:"مرتبك",   f:"مرتبكة"   }, zh:"困惑",  ja:"混乱した", ko:"혼란스러운" },
  NERVOUS:    { de:"nervös",     ar:{ m:"متوتر",   f:"متوترة"   }, zh:"紧张",  ja:"緊張した", ko:"긴장한"   },
  BORED:      { de:"gelangweilt",ar:{ m:"ملول",    f:"ملولة"    }, zh:"无聊",  ja:"退屈な",  ko:"지루한"   },
  LONELY:     { de:"einsam",     ar:{ m:"وحيد",    f:"وحيدة"    }, zh:"孤独",  ja:"寂しい",  ko:"외로운"   },
  EXCITED:    { de:"aufgeregt",  ar:{ m:"متحمس",   f:"متحمسة"   }, zh:"兴奋",  ja:"わくわく", ko:"신나는"   },
  CALM:       { de:"ruhig",      ar:{ m:"هادئ",    f:"هادئة"    }, zh:"平静",  ja:"穏やか",  ko:"차분한"   },
};
for (const [id, t] of Object.entries(GENDER_ADJ)) {
  Object.assign(lex.concepts[id].labels, t);
}

// Non-gender-sensitive adjectives: all flat strings
const FLAT_ADJ = {
  HOT:    { de:"heiß",     ar:"حار",     zh:"热",   ja:"暑い",  ko:"뜨거운"  },
  COLD:   { de:"kalt",     ar:"بارد",    zh:"冷",   ja:"寒い",  ko:"차가운"  },
  CLEAN:  { de:"sauber",   ar:"نظيف",    zh:"干净",  ja:"きれい", ko:"깨끗한" },
  DIRTY:  { de:"schmutzig",ar:"وسخ",     zh:"脏",   ja:"汚い",  ko:"더러운"  },
  LOUD:   { de:"laut",     ar:"صاخب",    zh:"吵",   ja:"うるさい",ko:"시끄러운"},
  QUIET:  { de:"leise",    ar:"هادئ",    zh:"安静",  ja:"静か",  ko:"조용한"  },
  FAST:   { de:"schnell",  ar:"سريع",    zh:"快",   ja:"速い",  ko:"빠른"   },
  SLOW:   { de:"langsam",  ar:"بطيء",    zh:"慢",   ja:"遅い",  ko:"느린"   },
  BROKEN: { de:"kaputt",   ar:"مكسور",   zh:"坏了",  ja:"壊れた", ko:"고장난" },
  READY:  { de:"bereit",   ar:"جاهز",    zh:"准备好", ja:"準備できた",ko:"준비된"},
  SAME:   { de:"gleich",   ar:"نفس",     zh:"相同",  ja:"同じ",  ko:"같은"   },
};
for (const [id, t] of Object.entries(FLAT_ADJ)) {
  Object.assign(lex.concepts[id].labels, t);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. LEXICON — Interjection labels
// ═══════════════════════════════════════════════════════════════════════
const INTERJECTIONS = {
  YES:    { de:"ja",             ar:"نعم",        zh:"是",    ja:"はい",       ko:"네"       },
  NO:     { de:"nein",           ar:"لا",         zh:"不",    ja:"いいえ",     ko:"아니요"   },
  PLEASE: { de:"bitte",          ar:"من فضلك",    zh:"请",    ja:"お願い",     ko:"제발"     },
  THANKS: { de:"danke",          ar:"شكراً",      zh:"谢谢",  ja:"ありがとう",  ko:"감사합니다"},
  SORRY:  { de:"entschuldigung", ar:"آسف",        zh:"对不起", ja:"ごめんなさい", ko:"미안해요" },
  HELLO:  { de:"hallo",          ar:"مرحبا",      zh:"你好",  ja:"こんにちは",  ko:"안녕"     },
  BYE:    { de:"tschüss",        ar:"مع السلامة",  zh:"再见",  ja:"さようなら",  ko:"안녕히"   },
  OK:     { de:"ok",             ar:"حسناً",      zh:"好的",  ja:"わかった",   ko:"알겠어요"  },
};
for (const [id, t] of Object.entries(INTERJECTIONS)) {
  Object.assign(lex.concepts[id].labels, t);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. LEXICON — Operator labels
// ═══════════════════════════════════════════════════════════════════════
const OPERATORS = {
  PAST:     { de:"Vergangenheit", ar:"ماضي",   zh:"过去",  ja:"過去",    ko:"과거"   },
  FUTURE:   { de:"Zukunft",       ar:"مستقبل", zh:"将来",  ja:"未来",    ko:"미래"   },
  NOW:      { de:"jetzt",         ar:"الآن",   zh:"现在",  ja:"今",     ko:"지금"   },
  NOT:      { de:"nicht",         ar:"لا",     zh:"不",   ja:"ない",    ko:"안"     },
  WANT:     { de:"wollen",        ar:"أريد",   zh:"想要",  ja:"たい",    ko:"원하다"  },
  CAN:      { de:"können",        ar:"يستطيع", zh:"能",   ja:"できる",  ko:"할 수 있다"},
  MUST:     { de:"müssen",        ar:"يجب",   zh:"必须",  ja:"なければ", ko:"해야 하다"},
  VERY:     { de:"sehr",          ar:"جداً",   zh:"很",   ja:"とても",  ko:"매우"   },
  A_LITTLE: { de:"ein wenig",     ar:"قليلاً", zh:"一点",  ja:"少し",    ko:"조금"   },
  AGAIN:    { de:"wieder",        ar:"مرة أخرى",zh:"再次", ja:"また",    ko:"다시"   },
  QUESTION: { de:"?",             ar:"؟",     zh:"？",   ja:"？",     ko:"?"     },
};
for (const [id, t] of Object.entries(OPERATORS)) {
  Object.assign(lex.operators[id].labels, t);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. MORPHOLOGY TABLES — Verb conjugation forms
// ═══════════════════════════════════════════════════════════════════════
const VERB_FORMS = {
  GO: {
    de: { pres1s:"gehe",     past1s:"ging",       fut1s:"werde gehen",     ger:"gehend",     inf:"gehen",     pp:"gegangen"   },
    ar: { pres1s:"أذهب",     past1s:"ذهبت",       fut1s:"سأذهب",           ger:"ذاهب",       inf:"الذهاب",    pp:"ذهبت"       },
    zh: { pres1s:"去",       past1s:"去了",        fut1s:"会去",            ger:"在去",       inf:"去",        pp:"去了"        },
    ja: { pres1s:"行きます",  past1s:"行きました",   fut1s:"行きます",        ger:"行っている",  inf:"行く",      pp:"行った"      },
    ko: { pres1s:"가요",     past1s:"갔어요",      fut1s:"갈 거예요",       ger:"가고 있어요", inf:"가다",      pp:"갔어요"      },
  },
  COME: {
    de: { pres1s:"komme",    past1s:"kam",        fut1s:"werde kommen",    ger:"kommend",    inf:"kommen",    pp:"gekommen"   },
    ar: { pres1s:"آتي",     past1s:"أتيت",       fut1s:"سآتي",           ger:"آتٍ",        inf:"المجيء",    pp:"أتيت"       },
    zh: { pres1s:"来",       past1s:"来了",        fut1s:"会来",            ger:"在来",       inf:"来",        pp:"来了"        },
    ja: { pres1s:"来ます",   past1s:"来ました",    fut1s:"来ます",          ger:"来ている",   inf:"来る",      pp:"来た"        },
    ko: { pres1s:"와요",     past1s:"왔어요",      fut1s:"올 거예요",       ger:"오고 있어요", inf:"오다",      pp:"왔어요"      },
  },
  EAT: {
    de: { pres1s:"esse",     past1s:"aß",         fut1s:"werde essen",     ger:"essend",     inf:"essen",     pp:"gegessen"   },
    ar: { pres1s:"آكل",     past1s:"أكلت",       fut1s:"سآكل",           ger:"آكل",       inf:"الأكل",     pp:"أكلت"       },
    zh: { pres1s:"吃",       past1s:"吃了",        fut1s:"会吃",            ger:"在吃",       inf:"吃",        pp:"吃了"        },
    ja: { pres1s:"食べます",  past1s:"食べました",   fut1s:"食べます",        ger:"食べている",  inf:"食べる",    pp:"食べた"      },
    ko: { pres1s:"먹어요",   past1s:"먹었어요",    fut1s:"먹을 거예요",     ger:"먹고 있어요", inf:"먹다",      pp:"먹었어요"    },
  },
  DRINK: {
    de: { pres1s:"trinke",   past1s:"trank",      fut1s:"werde trinken",   ger:"trinkend",   inf:"trinken",   pp:"getrunken"  },
    ar: { pres1s:"أشرب",    past1s:"شربت",       fut1s:"سأشرب",          ger:"شارب",      inf:"الشرب",     pp:"شربت"       },
    zh: { pres1s:"喝",       past1s:"喝了",        fut1s:"会喝",            ger:"在喝",       inf:"喝",        pp:"喝了"        },
    ja: { pres1s:"飲みます",  past1s:"飲みました",   fut1s:"飲みます",        ger:"飲んでいる",  inf:"飲む",      pp:"飲んだ"      },
    ko: { pres1s:"마셔요",   past1s:"마셨어요",    fut1s:"마실 거예요",     ger:"마시고 있어요",inf:"마시다",    pp:"마셨어요"    },
  },
  SLEEP: {
    de: { pres1s:"schlafe",  past1s:"schlief",    fut1s:"werde schlafen",  ger:"schlafend",  inf:"schlafen",  pp:"geschlafen" },
    ar: { pres1s:"أنام",    past1s:"نمت",        fut1s:"سأنام",          ger:"نائم",      inf:"النوم",     pp:"نمت"        },
    zh: { pres1s:"睡",       past1s:"睡了",        fut1s:"会睡",            ger:"在睡",       inf:"睡觉",      pp:"睡了"        },
    ja: { pres1s:"寝ます",   past1s:"寝ました",    fut1s:"寝ます",          ger:"寝ている",   inf:"寝る",      pp:"寝た"        },
    ko: { pres1s:"자요",     past1s:"잤어요",      fut1s:"잘 거예요",       ger:"자고 있어요", inf:"자다",      pp:"잤어요"      },
  },
  PLAY: {
    de: { pres1s:"spiele",   past1s:"spielte",    fut1s:"werde spielen",   ger:"spielend",   inf:"spielen",   pp:"gespielt"   },
    ar: { pres1s:"ألعب",    past1s:"لعبت",       fut1s:"سألعب",          ger:"لاعب",      inf:"اللعب",     pp:"لعبت"       },
    zh: { pres1s:"玩",       past1s:"玩了",        fut1s:"会玩",            ger:"在玩",       inf:"玩",        pp:"玩了"        },
    ja: { pres1s:"遊びます",  past1s:"遊びました",   fut1s:"遊びます",        ger:"遊んでいる",  inf:"遊ぶ",      pp:"遊んだ"      },
    ko: { pres1s:"놀아요",   past1s:"놀았어요",    fut1s:"놀 거예요",       ger:"놀고 있어요", inf:"놀다",      pp:"놀았어요"    },
  },
  WANT: {
    de: { pres1s:"will",     past1s:"wollte",     fut1s:"werde wollen",    ger:"wollend",    inf:"wollen",    pp:"gewollt"    },
    ar: { pres1s:"أريد",    past1s:"أردت",       fut1s:"سأريد",          ger:"مريد",      inf:"الإرادة",   pp:"أردت"       },
    zh: { pres1s:"想要",     past1s:"想要了",      fut1s:"会想要",          ger:"在想",       inf:"想要",      pp:"想要了"      },
    ja: { pres1s:"欲しいです",past1s:"欲しかったです",fut1s:"欲しいです",     ger:"欲しい",     inf:"欲しい",    pp:"欲しかった"  },
    ko: { pres1s:"원해요",   past1s:"원했어요",    fut1s:"원할 거예요",     ger:"원하고 있어요",inf:"원하다",    pp:"원했어요"    },
  },
  LIKE: {
    de: { pres1s:"mag",      past1s:"mochte",     fut1s:"werde mögen",     ger:"mögend",     inf:"mögen",     pp:"gemocht"    },
    ar: { pres1s:"أحب",     past1s:"أحببت",      fut1s:"سأحب",           ger:"محب",       inf:"الحب",      pp:"أحببت"      },
    zh: { pres1s:"喜欢",     past1s:"喜欢了",      fut1s:"会喜欢",          ger:"在喜欢",     inf:"喜欢",      pp:"喜欢了"      },
    ja: { pres1s:"好きです",  past1s:"好きでした",   fut1s:"好きです",        ger:"好き",       inf:"好き",      pp:"好きだった"  },
    ko: { pres1s:"좋아해요", past1s:"좋아했어요",   fut1s:"좋아할 거예요",   ger:"좋아하고 있어요",inf:"좋아하다",  pp:"좋아했어요"  },
  },
  NEED: {
    de: { pres1s:"brauche",  past1s:"brauchte",   fut1s:"werde brauchen",  ger:"brauchend",  inf:"brauchen",  pp:"gebraucht"  },
    ar: { pres1s:"أحتاج",   past1s:"احتجت",      fut1s:"سأحتاج",         ger:"محتاج",     inf:"الاحتياج",  pp:"احتجت"      },
    zh: { pres1s:"需要",     past1s:"需要了",      fut1s:"会需要",          ger:"在需要",     inf:"需要",      pp:"需要了"      },
    ja: { pres1s:"必要です",  past1s:"必要でした",   fut1s:"必要です",        ger:"必要",       inf:"必要",      pp:"必要だった"  },
    ko: { pres1s:"필요해요", past1s:"필요했어요",   fut1s:"필요할 거예요",   ger:"필요하고 있어요",inf:"필요하다",  pp:"필요했어요"  },
  },
  GIVE: {
    de: { pres1s:"gebe",     past1s:"gab",        fut1s:"werde geben",     ger:"gebend",     inf:"geben",     pp:"gegeben"    },
    ar: { pres1s:"أعطي",    past1s:"أعطيت",      fut1s:"سأعطي",          ger:"معطٍ",      inf:"الإعطاء",   pp:"أعطيت"      },
    zh: { pres1s:"给",       past1s:"给了",        fut1s:"会给",            ger:"在给",       inf:"给",        pp:"给了"        },
    ja: { pres1s:"あげます",  past1s:"あげました",   fut1s:"あげます",        ger:"あげている",  inf:"あげる",    pp:"あげた"      },
    ko: { pres1s:"줘요",     past1s:"줬어요",      fut1s:"줄 거예요",       ger:"주고 있어요", inf:"주다",      pp:"줬어요"      },
  },
  HELP: {
    de: { pres1s:"helfe",    past1s:"half",       fut1s:"werde helfen",    ger:"helfend",    inf:"helfen",    pp:"geholfen"   },
    ar: { pres1s:"أساعد",   past1s:"ساعدت",      fut1s:"سأساعد",         ger:"مساعد",     inf:"المساعدة",  pp:"ساعدت"      },
    zh: { pres1s:"帮助",     past1s:"帮助了",      fut1s:"会帮助",          ger:"在帮助",     inf:"帮助",      pp:"帮助了"      },
    ja: { pres1s:"助けます",  past1s:"助けました",   fut1s:"助けます",        ger:"助けている",  inf:"助ける",    pp:"助けた"      },
    ko: { pres1s:"도와요",   past1s:"도왔어요",    fut1s:"도울 거예요",     ger:"돕고 있어요", inf:"돕다",      pp:"도왔어요"    },
  },
  LOOK: {
    de: { pres1s:"schaue",   past1s:"schaute",    fut1s:"werde schauen",   ger:"schauend",   inf:"schauen",   pp:"geschaut"   },
    ar: { pres1s:"أنظر",    past1s:"نظرت",       fut1s:"سأنظر",          ger:"ناظر",      inf:"النظر",     pp:"نظرت"       },
    zh: { pres1s:"看",       past1s:"看了",        fut1s:"会看",            ger:"在看",       inf:"看",        pp:"看了"        },
    ja: { pres1s:"見ます",   past1s:"見ました",    fut1s:"見ます",          ger:"見ている",   inf:"見る",      pp:"見た"        },
    ko: { pres1s:"봐요",     past1s:"봤어요",      fut1s:"볼 거예요",       ger:"보고 있어요", inf:"보다",      pp:"봤어요"      },
  },
  LISTEN: {
    de: { pres1s:"höre",     past1s:"hörte",      fut1s:"werde hören",     ger:"hörend",     inf:"hören",     pp:"gehört"     },
    ar: { pres1s:"أستمع",   past1s:"استمعت",     fut1s:"سأستمع",         ger:"مستمع",     inf:"الاستماع",  pp:"استمعت"     },
    zh: { pres1s:"听",       past1s:"听了",        fut1s:"会听",            ger:"在听",       inf:"听",        pp:"听了"        },
    ja: { pres1s:"聞きます",  past1s:"聞きました",   fut1s:"聞きます",        ger:"聞いている",  inf:"聞く",      pp:"聞いた"      },
    ko: { pres1s:"들어요",   past1s:"들었어요",    fut1s:"들을 거예요",     ger:"듣고 있어요", inf:"듣다",      pp:"들었어요"    },
  },
  READ: {
    de: { pres1s:"lese",     past1s:"las",        fut1s:"werde lesen",     ger:"lesend",     inf:"lesen",     pp:"gelesen"    },
    ar: { pres1s:"أقرأ",    past1s:"قرأت",       fut1s:"سأقرأ",          ger:"قارئ",      inf:"القراءة",   pp:"قرأت"       },
    zh: { pres1s:"读",       past1s:"读了",        fut1s:"会读",            ger:"在读",       inf:"读",        pp:"读了"        },
    ja: { pres1s:"読みます",  past1s:"読みました",   fut1s:"読みます",        ger:"読んでいる",  inf:"読む",      pp:"読んだ"      },
    ko: { pres1s:"읽어요",   past1s:"읽었어요",    fut1s:"읽을 거예요",     ger:"읽고 있어요", inf:"읽다",      pp:"읽었어요"    },
  },
  OPEN: {
    de: { pres1s:"öffne",    past1s:"öffnete",    fut1s:"werde öffnen",    ger:"öffnend",    inf:"öffnen",    pp:"geöffnet"   },
    ar: { pres1s:"أفتح",    past1s:"فتحت",       fut1s:"سأفتح",          ger:"فاتح",      inf:"الفتح",     pp:"فتحت"       },
    zh: { pres1s:"开",       past1s:"开了",        fut1s:"会开",            ger:"在开",       inf:"开",        pp:"开了"        },
    ja: { pres1s:"開けます",  past1s:"開けました",   fut1s:"開けます",        ger:"開けている",  inf:"開ける",    pp:"開けた"      },
    ko: { pres1s:"열어요",   past1s:"열었어요",    fut1s:"열 거예요",       ger:"열고 있어요", inf:"열다",      pp:"열었어요"    },
  },
  STOP: {
    de: { pres1s:"stoppe",   past1s:"stoppte",    fut1s:"werde stoppen",   ger:"stoppend",   inf:"stoppen",   pp:"gestoppt"   },
    ar: { pres1s:"أتوقف",   past1s:"توقفت",      fut1s:"سأتوقف",         ger:"متوقف",     inf:"التوقف",    pp:"توقفت"      },
    zh: { pres1s:"停",       past1s:"停了",        fut1s:"会停",            ger:"在停",       inf:"停",        pp:"停了"        },
    ja: { pres1s:"止めます",  past1s:"止めました",   fut1s:"止めます",        ger:"止めている",  inf:"止める",    pp:"止めた"      },
    ko: { pres1s:"멈춰요",   past1s:"멈췄어요",    fut1s:"멈출 거예요",     ger:"멈추고 있어요",inf:"멈추다",    pp:"멈췄어요"    },
  },
  WAIT: {
    de: { pres1s:"warte",    past1s:"wartete",    fut1s:"werde warten",    ger:"wartend",    inf:"warten",    pp:"gewartet"   },
    ar: { pres1s:"أنتظر",   past1s:"انتظرت",     fut1s:"سأنتظر",         ger:"منتظر",     inf:"الانتظار",  pp:"انتظرت"     },
    zh: { pres1s:"等",       past1s:"等了",        fut1s:"会等",            ger:"在等",       inf:"等",        pp:"等了"        },
    ja: { pres1s:"待ちます",  past1s:"待ちました",   fut1s:"待ちます",        ger:"待っている",  inf:"待つ",      pp:"待った"      },
    ko: { pres1s:"기다려요", past1s:"기다렸어요",   fut1s:"기다릴 거예요",   ger:"기다리고 있어요",inf:"기다리다",  pp:"기다렸어요"  },
  },
  FEEL: {
    de: { pres1s:"fühle",    past1s:"fühlte",     fut1s:"werde fühlen",    ger:"fühlend",    inf:"fühlen",    pp:"gefühlt"    },
    ar: { pres1s:"أشعر",    past1s:"شعرت",       fut1s:"سأشعر",          ger:"شاعر",      inf:"الشعور",    pp:"شعرت"       },
    zh: { pres1s:"感觉",     past1s:"感觉了",      fut1s:"会感觉",          ger:"在感觉",     inf:"感觉",      pp:"感觉了"      },
    ja: { pres1s:"感じます",  past1s:"感じました",   fut1s:"感じます",        ger:"感じている",  inf:"感じる",    pp:"感じた"      },
    ko: { pres1s:"느껴요",   past1s:"느꼈어요",    fut1s:"느낄 거예요",     ger:"느끼고 있어요",inf:"느끼다",    pp:"느꼈어요"    },
  },
};

for (const [verbId, langs] of Object.entries(VERB_FORMS)) {
  if (!morph.verbs[verbId]) morph.verbs[verbId] = {};
  for (const [lang, forms] of Object.entries(langs)) {
    morph.verbs[verbId][lang] = forms;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 10. MORPHOLOGY TABLES — Copulas
// ═══════════════════════════════════════════════════════════════════════
Object.assign(morph.copulas, {
  de: { pres1s:"bin",  past1s:"war",    fut1s:"werde sein"  },
  ar: { pres1s:"",     past1s:"كنت",    fut1s:"سأكون"       },
  zh: { pres1s:"",     past1s:"",       fut1s:""             },
  ja: { pres1s:"です",  past1s:"でした",  fut1s:"でしょう"     },
  ko: { pres1s:"",     past1s:"",       fut1s:""             },
});

// ═══════════════════════════════════════════════════════════════════════
// 11. MORPHOLOGY TABLES — Modals
// ═══════════════════════════════════════════════════════════════════════
const MODAL_ADDITIONS = {
  WANT: {
    de: { pres:"will",       past:"wollte",     fut:"werde wollen"      },
    ar: { pres:"أريد",      past:"أردت",       fut:"سأريد"             },
    zh: { pres:"想",         past:"想了",        fut:"会想"              },
    ja: { pres:"たい",       past:"たかった",     fut:"たい"              },
    ko: { pres:"원해요",     past:"원했어요",     fut:"원할 거예요"       },
  },
  CAN: {
    de: { pres:"kann",       past:"konnte",     fut:"werde können"      },
    ar: { pres:"أستطيع",    past:"استطعت",     fut:"سأستطيع"           },
    zh: { pres:"能",         past:"能了",        fut:"会能"              },
    ja: { pres:"できます",    past:"できました",   fut:"できます"           },
    ko: { pres:"할 수 있어요",past:"할 수 있었어요",fut:"할 수 있을 거예요" },
  },
  MUST: {
    de: { pres:"muss",       past:"musste",     fut:"werde müssen"      },
    ar: { pres:"يجب",       past:"كان يجب",    fut:"سيجب"              },
    zh: { pres:"必须",       past:"必须了",      fut:"会必须"            },
    ja: { pres:"なければなりません",past:"なければなりませんでした",fut:"なければなりません" },
    ko: { pres:"해야 해요",   past:"해야 했어요",  fut:"해야 할 거예요"    },
  },
};
for (const [modal, langs] of Object.entries(MODAL_ADDITIONS)) {
  for (const [lang, forms] of Object.entries(langs)) {
    morph.modals[modal][lang] = forms;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 12. MORPHOLOGY TABLES — Negation
// ═══════════════════════════════════════════════════════════════════════
Object.assign(morph.negation, {
  de: { pre:"",      post:"nicht",   example:"Ich gehe nicht"        },
  ar: { pre:"لا",    post:"",        example:"لا آكل"                },
  zh: { pre:"不",    post:"",        example:"我不吃"                },
  ja: { pre:"",      post:"ません",   example:"食べません"              },
  ko: { pre:"안",    post:"",        example:"안 먹어요"              },
});

// ═══════════════════════════════════════════════════════════════════════
// 13. MORPHOLOGY TABLES — Subject omission languages
// ═══════════════════════════════════════════════════════════════════════
// Add ja, ko, ar to subject-omission languages (pro-drop)
morph.subjectOmissionLanguages = ["it", "es", "pt", "ja", "ko", "ar", "zh"];

// ═══════════════════════════════════════════════════════════════════════
// 14. MORPHOLOGY TABLES — Pronouns
// ═══════════════════════════════════════════════════════════════════════
const PRONOUN_MORPH = {
  I:    { de:"ich",  ar:"أنا",  zh:"我",   ja:"私",    ko:"나"   },
  YOU:  { de:"du",   ar:"أنت",  zh:"你",   ja:"あなた", ko:"너"   },
  HE:   { de:"er",   ar:"هو",   zh:"他",   ja:"彼",    ko:"그"   },
  SHE:  { de:"sie",  ar:"هي",   zh:"她",   ja:"彼女",  ko:"그녀"  },
  WE:   { de:"wir",  ar:"نحن",  zh:"我们",  ja:"私たち", ko:"우리"  },
  THEY: { de:"sie",  ar:"هم",   zh:"他们",  ja:"彼ら",  ko:"그들"  },
};
for (const [id, langs] of Object.entries(PRONOUN_MORPH)) {
  Object.assign(morph.pronouns[id], langs);
}

// ═══════════════════════════════════════════════════════════════════════
// 15. Write files
// ═══════════════════════════════════════════════════════════════════════
fs.writeFileSync(LEX_PATH, JSON.stringify(lex, null, 2) + '\n');
fs.writeFileSync(MORPH_PATH, JSON.stringify(morph, null, 2) + '\n');

console.log('✅ lexicon.json updated — languages:', lex._meta.languages.join(', '));
console.log('✅ morphologyTables.json updated');
console.log('   Verbs:', Object.keys(morph.verbs).length);
console.log('   Copula langs:', Object.keys(morph.copulas).filter(k => k !== '_note').join(', '));
console.log('   Negation langs:', Object.keys(morph.negation).filter(k => k !== '_note').join(', '));
console.log('   Pronoun langs (I):', Object.keys(morph.pronouns.I).join(', '));
