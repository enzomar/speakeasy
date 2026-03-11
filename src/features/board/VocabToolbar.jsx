/**
 * VocabToolbar — Replaces the CoreWordBar with a tabbed toolbar.
 *
 * The first tab shows the normal AAC category grid (default).
 * Other tabs swap the grid for themed vocabulary pages (objects, colours,
 * numbers, directions, countries, food, animals).  Each vocabulary cell
 * is spoken aloud on tap via TTS.
 *
 * Props:
 *   activeTab  — currently selected tab id (null or "grid" = default board)
 *   onTabChange — (tabId) => void
 *   langCode   — current symbol language code
 *   onSpeak    — (word: string) => void   (fires TTS)
 *   ui         — UI_STRINGS for the current language
 */

import { memo, useCallback } from "react";
import {
  Grid3X3, Package, Palette, Hash, Compass, Flag, UtensilsCrossed, PawPrint,
} from "lucide-react";

// ─── Tab definitions ──────────────────────────────────────────────────────────
export const VOCAB_TABS = [
  { id: "grid",       Icon: Grid3X3,          label: "Board",      color: "#495057" },
  { id: "objects",    Icon: Package,           label: "Objects",    color: "#E8590C" },
  { id: "colours",    Icon: Palette,           label: "Colours",    color: "#862E9C" },
  { id: "numbers",    Icon: Hash,              label: "Numbers",    color: "#1971C2" },
  { id: "directions", Icon: Compass,           label: "Directions", color: "#2F9E44" },
  { id: "countries",  Icon: Flag,              label: "Countries",  color: "#C92A2A" },
  { id: "food",       Icon: UtensilsCrossed,   label: "Food",       color: "#E67700" },
  { id: "animals",    Icon: PawPrint,          label: "Animals",    color: "#0C8599" },
];

// ─── Tab label translations ───────────────────────────────────────────────────
const TAB_LABELS = {
  en: { grid:"Board", objects:"Objects", colours:"Colours", numbers:"Numbers", directions:"Directions", countries:"Countries", food:"Food", animals:"Animals" },
  es: { grid:"Tablero", objects:"Objetos", colours:"Colores", numbers:"Números", directions:"Direcciones", countries:"Países", food:"Comida", animals:"Animales" },
  fr: { grid:"Tableau", objects:"Objets", colours:"Couleurs", numbers:"Nombres", directions:"Directions", countries:"Pays", food:"Nourriture", animals:"Animaux" },
  de: { grid:"Tafel", objects:"Objekte", colours:"Farben", numbers:"Zahlen", directions:"Richtungen", countries:"Länder", food:"Essen", animals:"Tiere" },
  it: { grid:"Tavola", objects:"Oggetti", colours:"Colori", numbers:"Numeri", directions:"Direzioni", countries:"Paesi", food:"Cibo", animals:"Animali" },
  pt: { grid:"Quadro", objects:"Objetos", colours:"Cores", numbers:"Números", directions:"Direções", countries:"Países", food:"Comida", animals:"Animais" },
  ar: { grid:"لوحة", objects:"أشياء", colours:"ألوان", numbers:"أرقام", directions:"اتجاهات", countries:"دول", food:"طعام", animals:"حيوانات" },
  zh: { grid:"面板", objects:"物品", colours:"颜色", numbers:"数字", directions:"方向", countries:"国家", food:"食物", animals:"动物" },
  ja: { grid:"ボード", objects:"物", colours:"色", numbers:"数字", directions:"方向", countries:"国", food:"食べ物", animals:"動物" },
  ko: { grid:"보드", objects:"물건", colours:"색상", numbers:"숫자", directions:"방향", countries:"나라", food:"음식", animals:"동물" },
};

// ─── Vocabulary data (all categories) ──────────────────────────────────────
// Each item: { id, emoji, en, es, fr, de, it, pt, ar, zh, ja, ko }

export const VOCAB_DATA = {
  objects: [
    { id:"vo_book",   emoji:"📖", en:"book",     es:"libro",     fr:"livre",     de:"Buch",      it:"libro",     pt:"livro",     ar:"كتاب",   zh:"书",     ja:"本",       ko:"책" },
    { id:"vo_pen",    emoji:"🖊️", en:"pen",      es:"bolígrafo", fr:"stylo",     de:"Stift",     it:"penna",     pt:"caneta",    ar:"قلم",    zh:"笔",     ja:"ペン",     ko:"펜" },
    { id:"vo_phone",  emoji:"📱", en:"phone",    es:"teléfono",  fr:"téléphone", de:"Telefon",   it:"telefono",  pt:"telefone",  ar:"هاتف",   zh:"手机",   ja:"電話",     ko:"전화기" },
    { id:"vo_key",    emoji:"🔑", en:"key",      es:"llave",     fr:"clé",       de:"Schlüssel", it:"chiave",    pt:"chave",     ar:"مفتاح",  zh:"钥匙",   ja:"鍵",       ko:"열쇠" },
    { id:"vo_bag",    emoji:"🎒", en:"bag",      es:"bolsa",     fr:"sac",       de:"Tasche",    it:"borsa",     pt:"bolsa",     ar:"حقيبة",  zh:"包",     ja:"かばん",   ko:"가방" },
    { id:"vo_chair",  emoji:"🪑", en:"chair",    es:"silla",     fr:"chaise",    de:"Stuhl",     it:"sedia",     pt:"cadeira",   ar:"كرسي",   zh:"椅子",   ja:"椅子",     ko:"의자" },
    { id:"vo_table",  emoji:"🪵", en:"table",    es:"mesa",      fr:"table",     de:"Tisch",     it:"tavolo",    pt:"mesa",      ar:"طاولة",  zh:"桌子",   ja:"テーブル", ko:"탁자" },
    { id:"vo_cup",    emoji:"☕", en:"cup",      es:"taza",      fr:"tasse",     de:"Tasse",     it:"tazza",     pt:"xícara",    ar:"كوب",    zh:"杯子",   ja:"カップ",   ko:"컵" },
    { id:"vo_clock",  emoji:"🕐", en:"clock",    es:"reloj",     fr:"horloge",   de:"Uhr",       it:"orologio",  pt:"relógio",   ar:"ساعة",   zh:"时钟",   ja:"時計",     ko:"시계" },
    { id:"vo_ball",   emoji:"⚽", en:"ball",     es:"pelota",    fr:"ballon",    de:"Ball",      it:"palla",     pt:"bola",      ar:"كرة",    zh:"球",     ja:"ボール",   ko:"공" },
    { id:"vo_door",   emoji:"🚪", en:"door",     es:"puerta",    fr:"porte",     de:"Tür",       it:"porta",     pt:"porta",     ar:"باب",    zh:"门",     ja:"ドア",     ko:"문" },
    { id:"vo_window", emoji:"🪟", en:"window",   es:"ventana",   fr:"fenêtre",   de:"Fenster",   it:"finestra",  pt:"janela",    ar:"نافذة",  zh:"窗户",   ja:"窓",       ko:"창문" },
    { id:"vo_bed",    emoji:"🛏️", en:"bed",      es:"cama",      fr:"lit",       de:"Bett",      it:"letto",     pt:"cama",      ar:"سرير",   zh:"床",     ja:"ベッド",   ko:"침대" },
    { id:"vo_shoe",   emoji:"👟", en:"shoe",     es:"zapato",    fr:"chaussure", de:"Schuh",     it:"scarpa",    pt:"sapato",    ar:"حذاء",   zh:"鞋",     ja:"靴",       ko:"신발" },
    { id:"vo_hat",    emoji:"🧢", en:"hat",      es:"sombrero",  fr:"chapeau",   de:"Hut",       it:"cappello",  pt:"chapéu",    ar:"قبعة",   zh:"帽子",   ja:"帽子",     ko:"모자" },
    { id:"vo_toy",    emoji:"🧸", en:"toy",      es:"juguete",   fr:"jouet",     de:"Spielzeug", it:"giocattolo",pt:"brinquedo",  ar:"لعبة",   zh:"玩具",   ja:"おもちゃ", ko:"장난감" },
    { id:"vo_lamp", emoji:"🔦", en:"lamp", es:"lámpara", fr:"lampe", de:"Lampe", it:"lampada", pt:"lâmpada", ar:"مصباح", zh:"灯", ja:"ランプ", ko:"램프" },
    { id:"vo_mirror", emoji:"🪞", en:"mirror", es:"espejo", fr:"miroir", de:"Spiegel", it:"specchio", pt:"espelho", ar:"مرآة", zh:"镜子", ja:"鏡", ko:"거울" },
    { id:"vo_camera", emoji:"📷", en:"camera", es:"cámara", fr:"caméra", de:"Kamera", it:"fotocamera", pt:"câmera", ar:"كاميرا", zh:"相机", ja:"カメラ", ko:"카메라" },
    { id:"vo_computer", emoji:"💻", en:"computer", es:"computadora", fr:"ordinateur", de:"Computer", it:"computer", pt:"computador", ar:"كمبيوتر", zh:"电脑", ja:"パソコン", ko:"컴퓨터" },
    { id:"vo_tv", emoji:"📺", en:"television", es:"televisión", fr:"télévision", de:"Fernseher", it:"televisione", pt:"televisão", ar:"تلفاز", zh:"电视", ja:"テレビ", ko:"텔레비전" },
    { id:"vo_radio", emoji:"📻", en:"radio", es:"radio", fr:"radio", de:"Radio", it:"radio", pt:"rádio", ar:"راديو", zh:"收音机", ja:"ラジオ", ko:"라디오" },
    { id:"vo_umbrella", emoji:"☂️", en:"umbrella", es:"paraguas", fr:"parapluie", de:"Regenschirm", it:"ombrello", pt:"guarda-chuva", ar:"مظلة", zh:"伞", ja:"傘", ko:"우산" },
    { id:"vo_glasses", emoji:"👓", en:"glasses", es:"gafas", fr:"lunettes", de:"Brille", it:"occhiali", pt:"óculos", ar:"نظارات", zh:"眼镜", ja:"メガネ", ko:"안경" },
    { id:"vo_bottle", emoji:"🍼", en:"bottle", es:"botella", fr:"bouteille", de:"Flasche", it:"bottiglia", pt:"garrafa", ar:"زجاجة", zh:"瓶子", ja:"ボトル", ko:"병" },
    { id:"vo_towel", emoji:"🧖", en:"towel", es:"toalla", fr:"serviette", de:"Handtuch", it:"asciugamano", pt:"toalha", ar:"منشفة", zh:"毛巾", ja:"タオル", ko:"수건" },
    { id:"vo_blanket", emoji:"🛌", en:"blanket", es:"manta", fr:"couverture", de:"Decke", it:"coperta", pt:"cobertor", ar:"بطانية", zh:"毯子", ja:"毛布", ko:"담요" },
    { id:"vo_pillow", emoji:"🛏️", en:"pillow", es:"almohada", fr:"oreiller", de:"Kissen", it:"cuscino", pt:"travesseiro", ar:"وسادة", zh:"枕头", ja:"枕", ko:"베개" },
    { id:"vo_scissors", emoji:"✂️", en:"scissors", es:"tijeras", fr:"ciseaux", de:"Schere", it:"forbici", pt:"tesoura", ar:"مقص", zh:"剪刀", ja:"ハサミ", ko:"가위" },
    { id:"vo_brush", emoji:"🖌️", en:"brush", es:"cepillo", fr:"brosse", de:"Bürste", it:"spazzola", pt:"escova", ar:"فرشاة", zh:"刷子", ja:"ブラシ", ko:"솔" },
    { id:"vo_soap", emoji:"🧴", en:"soap", es:"jabón", fr:"savon", de:"Seife", it:"sapone", pt:"sabão", ar:"صابون", zh:"肥皂", ja:"石鹸", ko:"비누" },
    { id:"vo_toothbrush", emoji:"🪥", en:"toothbrush", es:"cepillo de dientes", fr:"brosse à dents", de:"Zahnbürste", it:"spazzolino", pt:"escova de dentes", ar:"فرشاة أسنان", zh:"牙刷", ja:"歯ブラシ", ko:"칫솔" },
    { id:"vo_basket", emoji:"🧺", en:"basket", es:"cesta", fr:"panier", de:"Korb", it:"cestino", pt:"cesta", ar:"سلة", zh:"篮子", ja:"かご", ko:"바구니" },
    { id:"vo_box", emoji:"📦", en:"box", es:"caja", fr:"boîte", de:"Kiste", it:"scatola", pt:"caixa", ar:"صندوق", zh:"盒子", ja:"箱", ko:"상자" },
    { id:"vo_candle", emoji:"🕯️", en:"candle", es:"vela", fr:"bougie", de:"Kerze", it:"candela", pt:"vela", ar:"شمعة", zh:"蜡烛", ja:"ろうそく", ko:"양초" },
    { id:"vo_toilet", emoji:"🚽", en:"toilet", es:"inodoro", fr:"toilettes", de:"Toilette", it:"toilette", pt:"banheiro", ar:"مرحاض", zh:"厕所", ja:"トイレ", ko:"화장실" },
    { id:"vo_knife", emoji:"🔪", en:"knife", es:"cuchillo", fr:"couteau", de:"Messer", it:"coltello", pt:"faca", ar:"سكين", zh:"刀", ja:"ナイフ", ko:"칼" },
    { id:"vo_fork", emoji:"🍴", en:"fork", es:"tenedor", fr:"fourchette", de:"Gabel", it:"forchetta", pt:"garfo", ar:"شوكة", zh:"叉子", ja:"フォーク", ko:"포크" },
    { id:"vo_spoon", emoji:"🥄", en:"spoon", es:"cuchara", fr:"cuillère", de:"Löffel", it:"cucchiaio", pt:"colher", ar:"ملعقة", zh:"勺子", ja:"スプーン", ko:"숟가락" },
    { id:"vo_plate", emoji:"🍽️", en:"plate", es:"plato", fr:"assiette", de:"Teller", it:"piatto", pt:"prato", ar:"طبق", zh:"盘子", ja:"皿", ko:"접시" },
  ],

  colours: [
    { id:"vc_red",    emoji:"🔴", en:"red",      es:"rojo",      fr:"rouge",     de:"rot",       it:"rosso",     pt:"vermelho",  ar:"أحمر",   zh:"红色",   ja:"赤",       ko:"빨간색" },
    { id:"vc_blue",   emoji:"🔵", en:"blue",     es:"azul",      fr:"bleu",      de:"blau",      it:"blu",       pt:"azul",      ar:"أزرق",   zh:"蓝色",   ja:"青",       ko:"파란색" },
    { id:"vc_green",  emoji:"🟢", en:"green",    es:"verde",     fr:"vert",      de:"grün",      it:"verde",     pt:"verde",     ar:"أخضر",   zh:"绿色",   ja:"緑",       ko:"초록색" },
    { id:"vc_yellow", emoji:"🟡", en:"yellow",   es:"amarillo",  fr:"jaune",     de:"gelb",      it:"giallo",    pt:"amarelo",   ar:"أصفر",   zh:"黄色",   ja:"黄色",     ko:"노란색" },
    { id:"vc_orange", emoji:"🟠", en:"orange",   es:"naranja",   fr:"orange",    de:"orange",    it:"arancione", pt:"laranja",   ar:"برتقالي", zh:"橙色",   ja:"オレンジ", ko:"주황색" },
    { id:"vc_purple", emoji:"🟣", en:"purple",   es:"morado",    fr:"violet",    de:"lila",      it:"viola",     pt:"roxo",      ar:"بنفسجي", zh:"紫色",   ja:"紫",       ko:"보라색" },
    { id:"vc_pink",   emoji:"🩷", en:"pink",     es:"rosa",      fr:"rose",      de:"rosa",      it:"rosa",      pt:"rosa",      ar:"وردي",   zh:"粉色",   ja:"ピンク",   ko:"분홍색" },
    { id:"vc_black",  emoji:"⚫", en:"black",    es:"negro",     fr:"noir",      de:"schwarz",   it:"nero",      pt:"preto",     ar:"أسود",   zh:"黑色",   ja:"黒",       ko:"검정" },
    { id:"vc_white",  emoji:"⚪", en:"white",    es:"blanco",    fr:"blanc",     de:"weiß",      it:"bianco",    pt:"branco",    ar:"أبيض",   zh:"白色",   ja:"白",       ko:"하얀색" },
    { id:"vc_brown",  emoji:"🟤", en:"brown",    es:"marrón",    fr:"marron",    de:"braun",     it:"marrone",   pt:"marrom",    ar:"بني",    zh:"棕色",   ja:"茶色",     ko:"갈색" },
    { id:"vc_grey",   emoji:"🩶", en:"grey",     es:"gris",      fr:"gris",      de:"grau",      it:"grigio",    pt:"cinza",     ar:"رمادي",  zh:"灰色",   ja:"灰色",     ko:"회색" },
    { id:"vc_gold",   emoji:"✨", en:"gold",     es:"dorado",    fr:"doré",      de:"gold",      it:"dorato",    pt:"dourado",   ar:"ذهبي",   zh:"金色",   ja:"金色",     ko:"금색" },
  ],

  numbers: [
    { id:"vn_0",  emoji:"0️⃣",  en:"zero",     es:"cero",      fr:"zéro",      de:"null",      it:"zero",      pt:"zero",      ar:"صفر",    zh:"零",     ja:"ゼロ",     ko:"영" },
    { id:"vn_1",  emoji:"1️⃣",  en:"one",      es:"uno",       fr:"un",        de:"eins",      it:"uno",       pt:"um",        ar:"واحد",   zh:"一",     ja:"一",       ko:"일" },
    { id:"vn_2",  emoji:"2️⃣",  en:"two",      es:"dos",       fr:"deux",      de:"zwei",      it:"due",       pt:"dois",      ar:"اثنان",  zh:"二",     ja:"二",       ko:"이" },
    { id:"vn_3",  emoji:"3️⃣",  en:"three",    es:"tres",      fr:"trois",     de:"drei",      it:"tre",       pt:"três",      ar:"ثلاثة",  zh:"三",     ja:"三",       ko:"삼" },
    { id:"vn_4",  emoji:"4️⃣",  en:"four",     es:"cuatro",    fr:"quatre",    de:"vier",      it:"quattro",   pt:"quatro",    ar:"أربعة",  zh:"四",     ja:"四",       ko:"사" },
    { id:"vn_5",  emoji:"5️⃣",  en:"five",     es:"cinco",     fr:"cinq",      de:"fünf",      it:"cinque",    pt:"cinco",     ar:"خمسة",   zh:"五",     ja:"五",       ko:"오" },
    { id:"vn_6",  emoji:"6️⃣",  en:"six",      es:"seis",      fr:"six",       de:"sechs",     it:"sei",       pt:"seis",      ar:"ستة",    zh:"六",     ja:"六",       ko:"육" },
    { id:"vn_7",  emoji:"7️⃣",  en:"seven",    es:"siete",     fr:"sept",      de:"sieben",    it:"sette",     pt:"sete",      ar:"سبعة",   zh:"七",     ja:"七",       ko:"칠" },
    { id:"vn_8",  emoji:"8️⃣",  en:"eight",    es:"ocho",      fr:"huit",      de:"acht",      it:"otto",      pt:"oito",      ar:"ثمانية", zh:"八",     ja:"八",       ko:"팔" },
    { id:"vn_9",  emoji:"9️⃣",  en:"nine",     es:"nueve",     fr:"neuf",      de:"neun",      it:"nove",      pt:"nove",      ar:"تسعة",   zh:"九",     ja:"九",       ko:"구" },
    { id:"vn_10", emoji:"🔟", en:"ten",      es:"diez",      fr:"dix",       de:"zehn",      it:"dieci",     pt:"dez",       ar:"عشرة",   zh:"十",     ja:"十",       ko:"십" },
    { id:"vn_20", emoji:"2️⃣", en:"twenty",   es:"veinte",    fr:"vingt",     de:"zwanzig",   it:"venti",     pt:"vinte",     ar:"عشرون",  zh:"二十",   ja:"二十",     ko:"이십" },
    { id:"vn_50", emoji:"5️⃣", en:"fifty",    es:"cincuenta", fr:"cinquante", de:"fünfzig",   it:"cinquanta", pt:"cinquenta", ar:"خمسون",  zh:"五十",   ja:"五十",     ko:"오십" },
    { id:"vn_60", emoji:"6️⃣", en:"sixty", es:"sesenta", fr:"soixante", de:"sechzig", it:"sessanta", pt:"sessenta", ar:"ستون", zh:"六十", ja:"六十", ko:"육십" },
    { id:"vn_70", emoji:"7️⃣", en:"seventy", es:"setenta", fr:"soixante-dix", de:"siebzig", it:"settanta", pt:"setenta", ar:"سبعون", zh:"七十", ja:"七十", ko:"칠십" },
    { id:"vn_80", emoji:"8️⃣", en:"eighty", es:"ochenta", fr:"quatre-vingts", de:"achtzig", it:"ottanta", pt:"oitenta", ar:"ثمانون", zh:"八十", ja:"八十", ko:"팔십" },
    { id:"vn_90", emoji:"9️⃣", en:"ninety", es:"noventa", fr:"quatre-vingt-dix", de:"neunzig", it:"novanta", pt:"noventa", ar:"تسعون", zh:"九十", ja:"九十", ko:"구십" },
    { id:"vn_100",emoji:"💯", en:"hundred",  es:"cien",      fr:"cent",      de:"hundert",   it:"cento",     pt:"cem",       ar:"مئة",    zh:"一百",   ja:"百",       ko:"백" },
    { id:"vn_11", emoji:"1️⃣", en:"eleven", es:"once", fr:"onze", de:"elf", it:"undici", pt:"onze", ar:"أحد عشر", zh:"十一", ja:"十一", ko:"십일" },
    { id:"vn_12", emoji:"1️⃣", en:"twelve", es:"doce", fr:"douze", de:"zwölf", it:"dodici", pt:"doze", ar:"اثنا عشر", zh:"十二", ja:"十二", ko:"십이" },
    { id:"vn_13", emoji:"1️⃣", en:"thirteen", es:"trece", fr:"treize", de:"dreizehn", it:"tredici", pt:"treze", ar:"ثلاثة عشر", zh:"十三", ja:"十三", ko:"십삼" },
    { id:"vn_14", emoji:"1️⃣", en:"fourteen", es:"catorce", fr:"quatorze", de:"vierzehn", it:"quattordici", pt:"catorze", ar:"أربعة عشر", zh:"十四", ja:"十四", ko:"십사" },
    { id:"vn_15", emoji:"1️⃣", en:"fifteen", es:"quince", fr:"quinze", de:"fünfzehn", it:"quindici", pt:"quinze", ar:"خمسة عشر", zh:"十五", ja:"十五", ko:"십오" },
    { id:"vn_16", emoji:"1️⃣", en:"sixteen", es:"dieciséis", fr:"seize", de:"sechzehn", it:"sedici", pt:"dezesseis", ar:"ستة عشر", zh:"十六", ja:"十六", ko:"십육" },
    { id:"vn_17", emoji:"1️⃣", en:"seventeen", es:"diecisiete", fr:"dix-sept", de:"siebzehn", it:"diciassette", pt:"dezessete", ar:"سبعة عشر", zh:"十七", ja:"十七", ko:"십칠" },
    { id:"vn_18", emoji:"1️⃣", en:"eighteen", es:"dieciocho", fr:"dix-huit", de:"achtzehn", it:"diciotto", pt:"dezoito", ar:"ثمانية عشر", zh:"十八", ja:"十八", ko:"십팔" },
    { id:"vn_19", emoji:"1️⃣", en:"nineteen", es:"diecinueve", fr:"dix-neuf", de:"neunzehn", it:"diciannove", pt:"dezenove", ar:"تسعة عشر", zh:"十九", ja:"十九", ko:"십구" },
    { id:"vn_25", emoji:"2️⃣", en:"twenty-five", es:"veinticinco", fr:"vingt-cinq", de:"fünfundzwanzig", it:"venticinque", pt:"vinte e cinco", ar:"خمسة وعشرون", zh:"二十五", ja:"二十五", ko:"이십오" },
    { id:"vn_30", emoji:"3️⃣", en:"thirty", es:"treinta", fr:"trente", de:"dreißig", it:"trenta", pt:"trinta", ar:"ثلاثون", zh:"三十", ja:"三十", ko:"삼십" },
    { id:"vn_40", emoji:"4️⃣", en:"forty", es:"cuarenta", fr:"quarante", de:"vierzig", it:"quaranta", pt:"quarenta", ar:"أربعون", zh:"四十", ja:"四十", ko:"사십" },
    { id:"vn_200", emoji:"💯", en:"two hundred", es:"doscientos", fr:"deux cents", de:"zweihundert", it:"duecento", pt:"duzentos", ar:"مئتان", zh:"二百", ja:"二百", ko:"이백" },
    { id:"vn_500", emoji:"💯", en:"five hundred", es:"quinientos", fr:"cinq cents", de:"fünfhundert", it:"cinquecento", pt:"quinhentos", ar:"خمسمئة", zh:"五百", ja:"五百", ko:"오백" },
    { id:"vn_1000", emoji:"🔢", en:"thousand", es:"mil", fr:"mille", de:"tausend", it:"mille", pt:"mil", ar:"ألف", zh:"一千", ja:"千", ko:"천" },
  ],

  directions: [
    { id:"vd_up",      emoji:"⬆️", en:"up",       es:"arriba",    fr:"haut",       de:"oben",      it:"su",        pt:"cima",      ar:"فوق",      zh:"上",   ja:"上",     ko:"위" },
    { id:"vd_down",    emoji:"⬇️", en:"down",     es:"abajo",     fr:"bas",        de:"unten",     it:"giù",       pt:"baixo",     ar:"تحت",      zh:"下",   ja:"下",     ko:"아래" },
    { id:"vd_left",    emoji:"⬅️", en:"left",     es:"izquierda", fr:"gauche",     de:"links",     it:"sinistra",  pt:"esquerda",  ar:"يسار",     zh:"左",   ja:"左",     ko:"왼쪽" },
    { id:"vd_right",   emoji:"➡️", en:"right",    es:"derecha",   fr:"droite",     de:"rechts",    it:"destra",    pt:"direita",   ar:"يمين",     zh:"右",   ja:"右",     ko:"오른쪽" },
    { id:"vd_front",   emoji:"🔼", en:"front",    es:"delante",   fr:"devant",     de:"vorne",     it:"davanti",   pt:"frente",    ar:"أمام",     zh:"前",   ja:"前",     ko:"앞" },
    { id:"vd_back",    emoji:"🔽", en:"back",     es:"detrás",    fr:"derrière",   de:"hinten",    it:"dietro",    pt:"atrás",     ar:"خلف",      zh:"后",   ja:"後ろ",   ko:"뒤" },
    { id:"vd_here",    emoji:"📍", en:"here",     es:"aquí",      fr:"ici",        de:"hier",      it:"qui",       pt:"aqui",      ar:"هنا",      zh:"这里", ja:"ここ",   ko:"여기" },
    { id:"vd_there",   emoji:"👉", en:"there",    es:"allí",      fr:"là-bas",     de:"dort",      it:"là",        pt:"ali",       ar:"هناك",     zh:"那里", ja:"あそこ", ko:"저기" },
    { id:"vd_inside",  emoji:"📥", en:"inside",   es:"dentro",    fr:"dedans",     de:"drinnen",   it:"dentro",    pt:"dentro",    ar:"داخل",     zh:"里面", ja:"中",     ko:"안" },
    { id:"vd_outside", emoji:"📤", en:"outside",  es:"fuera",     fr:"dehors",     de:"draußen",   it:"fuori",     pt:"fora",      ar:"خارج",     zh:"外面", ja:"外",     ko:"밖" },
    { id:"vd_near",    emoji:"🔹", en:"near",     es:"cerca",     fr:"près",       de:"nah",       it:"vicino",    pt:"perto",     ar:"قريب",     zh:"近",   ja:"近い",   ko:"가까이" },
    { id:"vd_far",     emoji:"🔸", en:"far",      es:"lejos",     fr:"loin",       de:"weit",      it:"lontano",   pt:"longe",     ar:"بعيد",     zh:"远",   ja:"遠い",   ko:"멀리" },
  ],

  countries: [
    { id:"vx_usa",     emoji:"🇺🇸", en:"USA",           es:"EE.UU.",       fr:"États-Unis",    de:"USA",          it:"USA",          pt:"EUA",            ar:"أمريكا",     zh:"美国",   ja:"アメリカ",   ko:"미국" },
    { id:"vx_uk",      emoji:"🇬🇧", en:"United Kingdom",es:"Reino Unido",  fr:"Royaume-Uni",   de:"Großbritannien",it:"Regno Unito", pt:"Reino Unido",    ar:"بريطانيا",   zh:"英国",   ja:"イギリス",   ko:"영국" },
    { id:"vx_spain",   emoji:"🇪🇸", en:"Spain",         es:"España",       fr:"Espagne",       de:"Spanien",      it:"Spagna",       pt:"Espanha",        ar:"إسبانيا",    zh:"西班牙", ja:"スペイン",   ko:"스페인" },
    { id:"vx_france",  emoji:"🇫🇷", en:"France",        es:"Francia",      fr:"France",        de:"Frankreich",   it:"Francia",      pt:"França",         ar:"فرنسا",      zh:"法国",   ja:"フランス",   ko:"프랑스" },
    { id:"vx_germany", emoji:"🇩🇪", en:"Germany",       es:"Alemania",     fr:"Allemagne",     de:"Deutschland",  it:"Germania",     pt:"Alemanha",       ar:"ألمانيا",    zh:"德国",   ja:"ドイツ",     ko:"독일" },
    { id:"vx_italy",   emoji:"🇮🇹", en:"Italy",         es:"Italia",       fr:"Italie",        de:"Italien",      it:"Italia",       pt:"Itália",         ar:"إيطاليا",    zh:"意大利", ja:"イタリア",   ko:"이탈리아" },
    { id:"vx_brazil",  emoji:"🇧🇷", en:"Brazil",        es:"Brasil",       fr:"Brésil",        de:"Brasilien",    it:"Brasile",      pt:"Brasil",         ar:"البرازيل",   zh:"巴西",   ja:"ブラジル",   ko:"브라질" },
    { id:"vx_japan",   emoji:"🇯🇵", en:"Japan",         es:"Japón",        fr:"Japon",         de:"Japan",        it:"Giappone",     pt:"Japão",          ar:"اليابان",    zh:"日本",   ja:"日本",       ko:"일본" },
    { id:"vx_china",   emoji:"🇨🇳", en:"China",         es:"China",        fr:"Chine",         de:"China",        it:"Cina",         pt:"China",          ar:"الصين",      zh:"中国",   ja:"中国",       ko:"중국" },
    { id:"vx_korea",   emoji:"🇰🇷", en:"South Korea",   es:"Corea del Sur",fr:"Corée du Sud",  de:"Südkorea",     it:"Corea del Sud",pt:"Coreia do Sul",  ar:"كوريا الجنوبية", zh:"韩国", ja:"韓国",     ko:"한국" },
    { id:"vx_india",   emoji:"🇮🇳", en:"India",         es:"India",        fr:"Inde",          de:"Indien",       it:"India",        pt:"Índia",          ar:"الهند",      zh:"印度",   ja:"インド",     ko:"인도" },
    { id:"vx_mexico",  emoji:"🇲🇽", en:"Mexico",        es:"México",       fr:"Mexique",       de:"Mexiko",       it:"Messico",      pt:"México",         ar:"المكسيك",    zh:"墨西哥", ja:"メキシコ",   ko:"멕시코" },
    { id:"vx_egypt",   emoji:"🇪🇬", en:"Egypt",         es:"Egipto",       fr:"Égypte",        de:"Ägypten",      it:"Egitto",       pt:"Egito",          ar:"مصر",        zh:"埃及",   ja:"エジプト",   ko:"이집트" },
    { id:"vx_australia",emoji:"🇦🇺",en:"Australia",     es:"Australia",    fr:"Australie",     de:"Australien",   it:"Australia",    pt:"Austrália",      ar:"أستراليا",   zh:"澳大利亚",ja:"オーストラリア",ko:"호주" },
    { id:"vx_canada",  emoji:"🇨🇦", en:"Canada",        es:"Canadá",       fr:"Canada",        de:"Kanada",       it:"Canada",       pt:"Canadá",         ar:"كندا",       zh:"加拿大", ja:"カナダ",     ko:"캐나다" },
    { id:"vx_argentina",emoji:"🇦🇷",en:"Argentina",     es:"Argentina",    fr:"Argentine",     de:"Argentinien",  it:"Argentina",    pt:"Argentina",      ar:"الأرجنتين",  zh:"阿根廷", ja:"アルゼンチン",ko:"아르헨티나" },
    { id:"vx_russia", emoji:"🇷🇺", en:"Russia", es:"Rusia", fr:"Russie", de:"Russland", it:"Russia", pt:"Rússia", ar:"روسيا", zh:"俄罗斯", ja:"ロシア", ko:"러시아" },
    { id:"vx_turkey", emoji:"🇹🇷", en:"Turkey", es:"Turquía", fr:"Turquie", de:"Türkei", it:"Turchia", pt:"Turquia", ar:"تركيا", zh:"土耳其", ja:"トルコ", ko:"터키" },
    { id:"vx_indonesia", emoji:"🇮🇩", en:"Indonesia", es:"Indonesia", fr:"Indonésie", de:"Indonesien", it:"Indonesia", pt:"Indonésia", ar:"إندونيسيا", zh:"印度尼西亚", ja:"インドネシア", ko:"인도네시아" },
    { id:"vx_thailand", emoji:"🇹🇭", en:"Thailand", es:"Tailandia", fr:"Thaïlande", de:"Thailand", it:"Tailandia", pt:"Tailândia", ar:"تايلاند", zh:"泰国", ja:"タイ", ko:"태국" },
    { id:"vx_vietnam", emoji:"🇻🇳", en:"Vietnam", es:"Vietnam", fr:"Viêt Nam", de:"Vietnam", it:"Vietnam", pt:"Vietnã", ar:"فيتنام", zh:"越南", ja:"ベトナム", ko:"베트남" },
    { id:"vx_philippines", emoji:"🇵🇭", en:"Philippines", es:"Filipinas", fr:"Philippines", de:"Philippinen", it:"Filippine", pt:"Filipinas", ar:"الفلبين", zh:"菲律宾", ja:"フィリピン", ko:"필리핀" },
    { id:"vx_saudi", emoji:"🇸🇦", en:"Saudi Arabia", es:"Arabia Saudita", fr:"Arabie saoudite", de:"Saudi-Arabien", it:"Arabia Saudita", pt:"Arábia Saudita", ar:"السعودية", zh:"沙特阿拉伯", ja:"サウジアラビア", ko:"사우디아라비아" },
    { id:"vx_uae", emoji:"🇦🇪", en:"UAE", es:"Emiratos Árabes", fr:"Émirats arabes unis", de:"VAE", it:"Emirati Arabi", pt:"Emirados Árabes", ar:"الإمارات", zh:"阿联酋", ja:"UAE", ko:"아랍에미리트" },
    { id:"vx_israel", emoji:"🇮🇱", en:"Israel", es:"Israel", fr:"Israël", de:"Israel", it:"Israele", pt:"Israel", ar:"إسرائيل", zh:"以色列", ja:"イスラエル", ko:"이스라엘" },
    { id:"vx_nigeria", emoji:"🇳🇬", en:"Nigeria", es:"Nigeria", fr:"Nigéria", de:"Nigeria", it:"Nigeria", pt:"Nigéria", ar:"نيجيريا", zh:"尼日利亚", ja:"ナイジェリア", ko:"나이지리아" },
    { id:"vx_south_africa", emoji:"🇿🇦", en:"South Africa", es:"Sudáfrica", fr:"Afrique du Sud", de:"Südafrika", it:"Sudafrica", pt:"África do Sul", ar:"جنوب أفريقيا", zh:"南非", ja:"南アフリカ", ko:"남아프리카" },
    { id:"vx_morocco", emoji:"🇲🇦", en:"Morocco", es:"Marruecos", fr:"Maroc", de:"Marokko", it:"Marocco", pt:"Marrocos", ar:"المغرب", zh:"摩洛哥", ja:"モロッコ", ko:"모로코" },
    { id:"vx_colombia", emoji:"🇨🇴", en:"Colombia", es:"Colombia", fr:"Colombie", de:"Kolumbien", it:"Colombia", pt:"Colômbia", ar:"كولومبيا", zh:"哥伦比亚", ja:"コロンビア", ko:"콜롬비아" },
    { id:"vx_peru", emoji:"🇵🇪", en:"Peru", es:"Perú", fr:"Pérou", de:"Peru", it:"Perù", pt:"Peru", ar:"بيرو", zh:"秘鲁", ja:"ペルー", ko:"페루" },
    { id:"vx_chile", emoji:"🇨🇱", en:"Chile", es:"Chile", fr:"Chili", de:"Chile", it:"Cile", pt:"Chile", ar:"تشيلي", zh:"智利", ja:"チリ", ko:"칠레" },
    { id:"vx_poland", emoji:"🇵🇱", en:"Poland", es:"Polonia", fr:"Pologne", de:"Polen", it:"Polonia", pt:"Polônia", ar:"بولندا", zh:"波兰", ja:"ポーランド", ko:"폴란드" },
    { id:"vx_netherlands", emoji:"🇳🇱", en:"Netherlands", es:"Países Bajos", fr:"Pays-Bas", de:"Niederlande", it:"Paesi Bassi", pt:"Países Baixos", ar:"هولندا", zh:"荷兰", ja:"オランダ", ko:"네덜란드" },
    { id:"vx_switzerland", emoji:"🇨🇭", en:"Switzerland", es:"Suiza", fr:"Suisse", de:"Schweiz", it:"Svizzera", pt:"Suíça", ar:"سويسرا", zh:"瑞士", ja:"スイス", ko:"스위스" },
    { id:"vx_sweden", emoji:"🇸🇪", en:"Sweden", es:"Suecia", fr:"Suède", de:"Schweden", it:"Svezia", pt:"Suécia", ar:"السويد", zh:"瑞典", ja:"スウェーデン", ko:"스웨덴" },
    { id:"vx_greece", emoji:"🇬🇷", en:"Greece", es:"Grecia", fr:"Grèce", de:"Griechenland", it:"Grecia", pt:"Grécia", ar:"اليونان", zh:"希腊", ja:"ギリシャ", ko:"그리스" },
    { id:"vx_portugal", emoji:"🇵🇹", en:"Portugal", es:"Portugal", fr:"Portugal", de:"Portugal", it:"Portogallo", pt:"Portugal", ar:"البرتغال", zh:"葡萄牙", ja:"ポルトガル", ko:"포르투갈" },
    { id:"vx_ireland", emoji:"🇮🇪", en:"Ireland", es:"Irlanda", fr:"Irlande", de:"Irland", it:"Irlanda", pt:"Irlanda", ar:"أيرلندا", zh:"爱尔兰", ja:"アイルランド", ko:"아일랜드" },
    { id:"vx_new_zealand", emoji:"🇳🇿", en:"New Zealand", es:"Nueva Zelanda", fr:"Nouvelle-Zélande", de:"Neuseeland", it:"Nuova Zelanda", pt:"Nova Zelândia", ar:"نيوزيلندا", zh:"新西兰", ja:"ニュージーランド", ko:"뉴질랜드" },
    { id:"vx_pakistan", emoji:"🇵🇰", en:"Pakistan", es:"Pakistán", fr:"Pakistan", de:"Pakistan", it:"Pakistan", pt:"Paquistão", ar:"باكستان", zh:"巴基斯坦", ja:"パキスタン", ko:"파키스탄" },
  ],

  food: [
    { id:"vf_apple",   emoji:"🍎", en:"apple",    es:"manzana",    fr:"pomme",      de:"Apfel",      it:"mela",       pt:"maçã",       ar:"تفاحة",  zh:"苹果",   ja:"りんご",     ko:"사과" },
    { id:"vf_bread",   emoji:"🍞", en:"bread",    es:"pan",        fr:"pain",       de:"Brot",       it:"pane",       pt:"pão",        ar:"خبز",    zh:"面包",   ja:"パン",       ko:"빵" },
    { id:"vf_rice",    emoji:"🍚", en:"rice",     es:"arroz",      fr:"riz",        de:"Reis",       it:"riso",       pt:"arroz",      ar:"أرز",    zh:"米饭",   ja:"ご飯",       ko:"밥" },
    { id:"vf_pasta",   emoji:"🍝", en:"pasta",    es:"pasta",      fr:"pâtes",      de:"Pasta",      it:"pasta",      pt:"massa",      ar:"معكرونة", zh:"面条",   ja:"パスタ",     ko:"파스타" },
    { id:"vf_meat",    emoji:"🥩", en:"meat",     es:"carne",      fr:"viande",     de:"Fleisch",    it:"carne",      pt:"carne",      ar:"لحم",    zh:"肉",     ja:"肉",         ko:"고기" },
    { id:"vf_fish",    emoji:"🐟", en:"fish",     es:"pescado",    fr:"poisson",    de:"Fisch",      it:"pesce",      pt:"peixe",      ar:"سمك",    zh:"鱼",     ja:"魚",         ko:"생선" },
    { id:"vf_egg",     emoji:"🥚", en:"egg",      es:"huevo",      fr:"œuf",        de:"Ei",         it:"uovo",       pt:"ovo",        ar:"بيضة",   zh:"蛋",     ja:"卵",         ko:"달걀" },
    { id:"vf_milk",    emoji:"🥛", en:"milk",     es:"leche",      fr:"lait",       de:"Milch",      it:"latte",      pt:"leite",      ar:"حليب",   zh:"牛奶",   ja:"牛乳",       ko:"우유" },
    { id:"vf_water",   emoji:"💧", en:"water",    es:"agua",       fr:"eau",        de:"Wasser",     it:"acqua",      pt:"água",       ar:"ماء",    zh:"水",     ja:"水",         ko:"물" },
    { id:"vf_juice",   emoji:"🧃", en:"juice",    es:"jugo",       fr:"jus",        de:"Saft",       it:"succo",      pt:"suco",       ar:"عصير",   zh:"果汁",   ja:"ジュース",   ko:"주스" },
    { id:"vf_cheese",  emoji:"🧀", en:"cheese",   es:"queso",      fr:"fromage",    de:"Käse",       it:"formaggio",  pt:"queijo",     ar:"جبن",    zh:"奶酪",   ja:"チーズ",     ko:"치즈" },
    { id:"vf_cake",    emoji:"🍰", en:"cake",     es:"pastel",     fr:"gâteau",     de:"Kuchen",     it:"torta",      pt:"bolo",       ar:"كعكة",   zh:"蛋糕",   ja:"ケーキ",     ko:"케이크" },
    { id:"vf_soup",    emoji:"🍲", en:"soup",     es:"sopa",       fr:"soupe",      de:"Suppe",      it:"zuppa",      pt:"sopa",       ar:"حساء",   zh:"汤",     ja:"スープ",     ko:"국" },
    { id:"vf_pizza",   emoji:"🍕", en:"pizza",    es:"pizza",      fr:"pizza",      de:"Pizza",      it:"pizza",      pt:"pizza",      ar:"بيتزا",  zh:"披萨",   ja:"ピザ",       ko:"피자" },
    { id:"vf_icecream",emoji:"🍦", en:"ice cream",es:"helado",     fr:"glace",      de:"Eis",        it:"gelato",     pt:"sorvete",    ar:"آيس كريم", zh:"冰淇淋", ja:"アイス",   ko:"아이스크림" },
    { id:"vf_banana",  emoji:"🍌", en:"banana",   es:"plátano",    fr:"banane",     de:"Banane",     it:"banana",     pt:"banana",     ar:"موز",    zh:"香蕉",   ja:"バナナ",     ko:"바나나" },
    { id:"vf_chicken", emoji:"🍗", en:"chicken", es:"pollo", fr:"poulet", de:"Huhn", it:"pollo", pt:"frango", ar:"دجاج", zh:"鸡肉", ja:"鶏肉", ko:"닭고기" },
    { id:"vf_salad", emoji:"🥗", en:"salad", es:"ensalada", fr:"salade", de:"Salat", it:"insalata", pt:"salada", ar:"سلطة", zh:"沙拉", ja:"サラダ", ko:"샐러드" },
    { id:"vf_vegetable", emoji:"🥦", en:"vegetable", es:"verdura", fr:"légume", de:"Gemüse", it:"verdura", pt:"vegetal", ar:"خضار", zh:"蔬菜", ja:"野菜", ko:"채소" },
    { id:"vf_fruit", emoji:"🍏", en:"fruit", es:"fruta", fr:"fruit", de:"Obst", it:"frutta", pt:"fruta", ar:"فاكهة", zh:"水果", ja:"果物", ko:"과일" },
    { id:"vf_potato", emoji:"🥔", en:"potato", es:"patata", fr:"pomme de terre", de:"Kartoffel", it:"patata", pt:"batata", ar:"بطاطس", zh:"土豆", ja:"じゃがいも", ko:"감자" },
    { id:"vf_tomato", emoji:"🍅", en:"tomato", es:"tomate", fr:"tomate", de:"Tomate", it:"pomodoro", pt:"tomate", ar:"طماطم", zh:"番茄", ja:"トマト", ko:"토마토" },
    { id:"vf_carrot", emoji:"🥕", en:"carrot", es:"zanahoria", fr:"carotte", de:"Karotte", it:"carota", pt:"cenoura", ar:"جزر", zh:"胡萝卜", ja:"にんじん", ko:"당근" },
    { id:"vf_chocolate", emoji:"🍫", en:"chocolate", es:"chocolate", fr:"chocolat", de:"Schokolade", it:"cioccolato", pt:"chocolate", ar:"شوكولاتة", zh:"巧克力", ja:"チョコレート", ko:"초콜릿" },
    { id:"vf_cookie", emoji:"🍪", en:"cookie", es:"galleta", fr:"biscuit", de:"Keks", it:"biscotto", pt:"biscoito", ar:"بسكويت", zh:"饼干", ja:"クッキー", ko:"쿠키" },
    { id:"vf_sandwich", emoji:"🥪", en:"sandwich", es:"sándwich", fr:"sandwich", de:"Sandwich", it:"panino", pt:"sanduíche", ar:"شطيرة", zh:"三明治", ja:"サンドイッチ", ko:"샌드위치" },
    { id:"vf_hamburger", emoji:"🍔", en:"hamburger", es:"hamburguesa", fr:"hamburger", de:"Hamburger", it:"hamburger", pt:"hambúrguer", ar:"همبرغر", zh:"汉堡", ja:"ハンバーガー", ko:"햄버거" },
    { id:"vf_sushi", emoji:"🍣", en:"sushi", es:"sushi", fr:"sushi", de:"Sushi", it:"sushi", pt:"sushi", ar:"سوشي", zh:"寿司", ja:"寿司", ko:"초밥" },
    { id:"vf_yogurt", emoji:"🥛", en:"yogurt", es:"yogur", fr:"yaourt", de:"Joghurt", it:"yogurt", pt:"iogurte", ar:"زبادي", zh:"酸奶", ja:"ヨーグルト", ko:"요거트" },
    { id:"vf_butter", emoji:"🧈", en:"butter", es:"mantequilla", fr:"beurre", de:"Butter", it:"burro", pt:"manteiga", ar:"زبدة", zh:"黄油", ja:"バター", ko:"버터" },
    { id:"vf_honey", emoji:"🍯", en:"honey", es:"miel", fr:"miel", de:"Honig", it:"miele", pt:"mel", ar:"عسل", zh:"蜂蜜", ja:"はちみつ", ko:"꿀" },
    { id:"vf_salt", emoji:"🧂", en:"salt", es:"sal", fr:"sel", de:"Salz", it:"sale", pt:"sal", ar:"ملح", zh:"盐", ja:"塩", ko:"소금" },
    { id:"vf_sugar", emoji:"🍬", en:"sugar", es:"azúcar", fr:"sucre", de:"Zucker", it:"zucchero", pt:"açúcar", ar:"سكر", zh:"糖", ja:"砂糖", ko:"설탕" },
    { id:"vf_tea", emoji:"🍵", en:"tea", es:"té", fr:"thé", de:"Tee", it:"tè", pt:"chá", ar:"شاي", zh:"茶", ja:"お茶", ko:"차" },
    { id:"vf_coffee", emoji:"☕", en:"coffee", es:"café", fr:"café", de:"Kaffee", it:"caffè", pt:"café", ar:"قهوة", zh:"咖啡", ja:"コーヒー", ko:"커피" },
    { id:"vf_soda", emoji:"🥤", en:"soda", es:"refresco", fr:"soda", de:"Limonade", it:"bibita", pt:"refrigerante", ar:"مشروب غازي", zh:"汽水", ja:"ソーダ", ko:"탄산음료" },
    { id:"vf_beer", emoji:"🍺", en:"beer", es:"cerveza", fr:"bière", de:"Bier", it:"birra", pt:"cerveja", ar:"بيرة", zh:"啤酒", ja:"ビール", ko:"맥주" },
    { id:"vf_wine", emoji:"🍷", en:"wine", es:"vino", fr:"vin", de:"Wein", it:"vino", pt:"vinho", ar:"نبيذ", zh:"葡萄酒", ja:"ワイン", ko:"와인" },
    { id:"vf_orange", emoji:"🍊", en:"orange", es:"naranja", fr:"orange", de:"Orange", it:"arancia", pt:"laranja", ar:"برتقال", zh:"橙子", ja:"オレンジ", ko:"오렌지" },
    { id:"vf_grape", emoji:"🍇", en:"grape", es:"uva", fr:"raisin", de:"Traube", it:"uva", pt:"uva", ar:"عنب", zh:"葡萄", ja:"ぶどう", ko:"포도" },
    { id:"vf_strawberry", emoji:"🍓", en:"strawberry", es:"fresa", fr:"fraise", de:"Erdbeere", it:"fragola", pt:"morango", ar:"فراولة", zh:"草莓", ja:"いちご", ko:"딸기" },
    { id:"vf_watermelon", emoji:"🍉", en:"watermelon", es:"sandía", fr:"pastèque", de:"Wassermelone", it:"anguria", pt:"melancia", ar:"بطيخ", zh:"西瓜", ja:"スイカ", ko:"수박" },
    { id:"vf_mango", emoji:"🥭", en:"mango", es:"mango", fr:"mangue", de:"Mango", it:"mango", pt:"manga", ar:"مانجو", zh:"芒果", ja:"マンゴー", ko:"망고" },
    { id:"vf_pineapple", emoji:"🍍", en:"pineapple", es:"piña", fr:"ananas", de:"Ananas", it:"ananas", pt:"abacaxi", ar:"أناناس", zh:"菠萝", ja:"パイナップル", ko:"파인애플" },
    { id:"vf_lemon", emoji:"🍋", en:"lemon", es:"limón", fr:"citron", de:"Zitrone", it:"limone", pt:"limão", ar:"ليمون", zh:"柠檬", ja:"レモン", ko:"레몬" },
    { id:"vf_cherry", emoji:"🍒", en:"cherry", es:"cereza", fr:"cerise", de:"Kirsche", it:"ciliegia", pt:"cereja", ar:"كرز", zh:"樱桃", ja:"さくらんぼ", ko:"체리" },
  ],

  animals: [
    { id:"va_dog",      emoji:"🐕", en:"dog",       es:"perro",     fr:"chien",      de:"Hund",       it:"cane",       pt:"cachorro",   ar:"كلب",    zh:"狗",     ja:"犬",         ko:"개" },
    { id:"va_cat",      emoji:"🐈", en:"cat",       es:"gato",      fr:"chat",       de:"Katze",      it:"gatto",      pt:"gato",       ar:"قطة",    zh:"猫",     ja:"猫",         ko:"고양이" },
    { id:"va_bird",     emoji:"🐦", en:"bird",      es:"pájaro",    fr:"oiseau",     de:"Vogel",      it:"uccello",    pt:"pássaro",    ar:"عصفور",  zh:"鸟",     ja:"鳥",         ko:"새" },
    { id:"va_fish",     emoji:"🐠", en:"fish",      es:"pez",       fr:"poisson",    de:"Fisch",      it:"pesce",      pt:"peixe",      ar:"سمكة",   zh:"鱼",     ja:"魚",         ko:"물고기" },
    { id:"va_horse",    emoji:"🐎", en:"horse",     es:"caballo",   fr:"cheval",     de:"Pferd",      it:"cavallo",    pt:"cavalo",     ar:"حصان",   zh:"马",     ja:"馬",         ko:"말" },
    { id:"va_cow",      emoji:"🐄", en:"cow",       es:"vaca",      fr:"vache",      de:"Kuh",        it:"mucca",      pt:"vaca",       ar:"بقرة",   zh:"牛",     ja:"牛",         ko:"소" },
    { id:"va_pig",      emoji:"🐖", en:"pig",       es:"cerdo",     fr:"cochon",     de:"Schwein",    it:"maiale",     pt:"porco",      ar:"خنزير",  zh:"猪",     ja:"豚",         ko:"돼지" },
    { id:"va_sheep",    emoji:"🐑", en:"sheep",     es:"oveja",     fr:"mouton",     de:"Schaf",      it:"pecora",     pt:"ovelha",     ar:"خروف",   zh:"羊",     ja:"羊",         ko:"양" },
    { id:"va_rabbit",   emoji:"🐇", en:"rabbit",    es:"conejo",    fr:"lapin",      de:"Kaninchen",  it:"coniglio",   pt:"coelho",     ar:"أرنب",   zh:"兔子",   ja:"うさぎ",     ko:"토끼" },
    { id:"va_lion",     emoji:"🦁", en:"lion",      es:"león",      fr:"lion",       de:"Löwe",       it:"leone",      pt:"leão",       ar:"أسد",    zh:"狮子",   ja:"ライオン",   ko:"사자" },
    { id:"va_elephant", emoji:"🐘", en:"elephant",  es:"elefante",  fr:"éléphant",   de:"Elefant",    it:"elefante",   pt:"elefante",   ar:"فيل",    zh:"大象",   ja:"象",         ko:"코끼리" },
    { id:"va_monkey",   emoji:"🐒", en:"monkey",    es:"mono",      fr:"singe",      de:"Affe",       it:"scimmia",    pt:"macaco",     ar:"قرد",    zh:"猴子",   ja:"猿",         ko:"원숭이" },
    { id:"va_bear",     emoji:"🐻", en:"bear",      es:"oso",       fr:"ours",       de:"Bär",        it:"orso",       pt:"urso",       ar:"دب",     zh:"熊",     ja:"熊",         ko:"곰" },
    { id:"va_butterfly",emoji:"🦋", en:"butterfly", es:"mariposa",  fr:"papillon",   de:"Schmetterling",it:"farfalla", pt:"borboleta",  ar:"فراشة",  zh:"蝴蝶",   ja:"蝶",         ko:"나비" },
    { id:"va_turtle",   emoji:"🐢", en:"turtle",    es:"tortuga",   fr:"tortue",     de:"Schildkröte",it:"tartaruga", pt:"tartaruga",  ar:"سلحفاة", zh:"乌龟",   ja:"亀",         ko:"거북이" },
    { id:"va_duck",     emoji:"🦆", en:"duck",      es:"pato",      fr:"canard",     de:"Ente",       it:"anatra",     pt:"pato",       ar:"بطة",    zh:"鸭子",   ja:"アヒル",     ko:"오리" },
  ],
};

/** Get the translated word for a vocab item */
export function getVocabLabel(item, langCode) {
  if (!item) return "";
  return item[langCode] ?? item.en ?? "";
}

/** Get tab label for a language */
export function getTabLabel(tabId, langCode) {
  return TAB_LABELS[langCode]?.[tabId] ?? TAB_LABELS.en[tabId] ?? tabId;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default memo(function VocabToolbar({
  activeTab = "grid",
  onTabChange,
  langCode = "en",
}) {
  const handleTab = useCallback((id) => {
    onTabChange?.(id);
  }, [onTabChange]);

  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--bg)",
        borderBottom: "0.5px solid var(--sep)",
        padding: "4px 4px 6px",
      }}
      aria-label="Vocabulary toolbar"
    >
      <div style={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        padding: "2px 0",
      }}>
        {VOCAB_TABS.map(tab => {
          const isActive = tab.id === activeTab;
          const Icon = tab.Icon;
          const label = getTabLabel(tab.id, langCode);
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              aria-label={label}
              aria-pressed={isActive}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "6px 6px 4px",
                borderRadius: 12,
                background: isActive ? `${tab.color}18` : "transparent",
                border: isActive ? `1.5px solid ${tab.color}` : "1.5px solid transparent",
                cursor: "pointer",
                transition: "all 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                minHeight: 44,
                minWidth: 50,
                flex: "1 0 auto",
              }}
              onPointerDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
              onPointerUp={e => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.6}
                style={{ color: isActive ? tab.color : "var(--text-3)", flexShrink: 0 }}
              />
              <span style={{
                fontSize: 9,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? tab.color : "var(--text-3)",
                textAlign: "center",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 56,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
