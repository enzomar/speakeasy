/**
 * languages.js — Supported TTS languages + symbol label translations.
 *
 * Each language has:
 *   code     — ISO 639-1 (used as key everywhere)
 *   name     — display name in that language
 *   flag     — emoji flag
 *   ttsLang  — BCP-47 tag passed to SpeechSynthesisUtterance.lang
 *   dir      — "ltr" | "rtl"
 *
 * TRANSLATIONS:
 *   Keys match the symbol `id` field in symbols.js.
 *   Missing keys fall back to the English label automatically.
 *   Category names are in `CATEGORY_NAMES[lang][categoryId]`.
 *
 * EXTENDING:
 *   Add a new language object to LANGUAGES, then add its translations to
 *   SYMBOL_TRANSLATIONS and CATEGORY_NAMES.  Nothing else needs to change.
 */

export const LANGUAGES = [
  { code: "en", name: "English",    flag: "🇬🇧", ttsLang: "en-US", dir: "ltr" },
  { code: "es", name: "Español",    flag: "🇪🇸", ttsLang: "es-ES", dir: "ltr" },
  { code: "fr", name: "Français",   flag: "🇫🇷", ttsLang: "fr-FR", dir: "ltr" },
  { code: "it", name: "Italiano",   flag: "🇮🇹", ttsLang: "it-IT", dir: "ltr" },
  { code: "pt", name: "Português",  flag: "🇧🇷", ttsLang: "pt-BR", dir: "ltr" },
];

export const LANG_MAP = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));

// ── Activation keyword choices (3 per language) ─────────────────────────────────

export const ACTIVATION_KEYWORDS = {
  en: ["Luma", "Nora", "SpeakEasy"],
  es: ["Luma", "Nora", "SpeakEasy"],
  fr: ["Luma", "Nora", "SpeakEasy"],
  it: ["Luma", "Nora", "SpeakEasy"],
  pt: ["Luma", "Nora", "SpeakEasy"],
};

// ── Category name translations ─────────────────────────────────────────────────

export const CATEGORY_NAMES = {
  en: { all:"All", social:"Social", people:"People", feelings:"Feelings", actions:"Actions", food:"Food", places:"Places", things:"Things", describe:"Describe", needs:"Needs", questions:"Questions", descriptors:"Describe" },
  es: { all:"Todo", social:"Social", people:"Personas", feelings:"Sentimientos", actions:"Acciones", food:"Comida", places:"Lugares", things:"Cosas", describe:"Describir", needs:"Necesidades", questions:"Preguntas", descriptors:"Describir" },
  fr: { all:"Tout", social:"Social", people:"Personnes", feelings:"Émotions", actions:"Actions", food:"Nourriture", places:"Lieux", things:"Objets", describe:"Décrire", needs:"Besoins", questions:"Questions", descriptors:"Décrire" },
  it: { all:"Tutto", social:"Sociale", people:"Persone", feelings:"Sentimenti", actions:"Azioni", food:"Cibo", places:"Luoghi", things:"Cose", describe:"Descrivere", needs:"Bisogni", questions:"Domande", descriptors:"Descrivere" },
  pt: { all:"Tudo", social:"Social", people:"Pessoas", feelings:"Sentimentos", actions:"Ações", food:"Comida", places:"Lugares", things:"Coisas", describe:"Descrever", needs:"Necessidades", questions:"Perguntas", descriptors:"Descrever" },
};

// ── Symbol label translations (id → translated label) ─────────────────────────
// Only the spoken/displayed label is translated; emoji stays universal.

export const SYMBOL_TRANSLATIONS = {
  es: {
    yes:"Sí", no:"No", please:"Por favor", thankyou:"Gracias", sorry:"Lo siento",
    hi:"Hola", bye:"Adiós", wait:"Espera", help:"Ayuda", stop:"Para",
    more:"Más", done:"Listo", i:"Yo", you:"Tú", we:"Nosotros", he:"Él",
    she:"Ella", they:"Ellos", mom:"Mamá", dad:"Papá", friend:"Amigo",
    doctor:"Doctor", teacher:"Maestro", everyone:"Todos",
    happy:"Feliz", sad:"Triste", angry:"Enojado", scared:"Asustado",
    tired:"Cansado", sick:"Enfermo", hurt:"Duele", excited:"Emocionado",
    love:"Amor", bored:"Aburrido", confused:"Confundido", fine:"Bien",
    want:"Quiero", need:"Necesito", go:"Ir", eat:"Comer", drink:"Beber",
    sleep:"Dormir", play:"Jugar", come:"Ven", give:"Da", like:"Me gusta",
    look:"Mira", listen:"Escucha", read:"Leer", open:"Abrir", close:"Cerrar",
    "turn on":"Encender", water:"Agua", food:"Comida", milk:"Leche",
    juice:"Jugo", snack:"Merienda", bread:"Pan", fruit:"Fruta", cookie:"Galleta",
    pizza:"Pizza", rice:"Arroz", soup:"Sopa", yogurt:"Yogur",
    home:"Casa", school:"Escuela", bathroom:"Baño", outside:"Afuera",
    bedroom:"Dormitorio", park:"Parque", store:"Tienda", hospital:"Hospital",
    car:"Carro", bus:"Autobús", medicine:"Medicina", phone:"Teléfono",
    book:"Libro", music:"Música", tv:"Tele", ball:"Pelota", toy:"Juguete",
    blanket:"Manta", clothes:"Ropa", money:"Dinero", chair:"Silla", light:"Luz",
    big:"Grande", small:"Pequeño", hot:"Caliente", cold:"Frío", now:"Ahora",
    later:"Después", again:"Otra vez", different:"Diferente", same:"Igual",
    good:"Bueno", bad:"Malo", quiet:"Silencio",
  },
  fr: {
    yes:"Oui", no:"Non", please:"S'il vous plaît", thankyou:"Merci", sorry:"Désolé",
    hi:"Bonjour", bye:"Au revoir", wait:"Attends", help:"Aide", stop:"Arrête",
    more:"Plus", done:"Terminé", i:"Je", you:"Tu", we:"Nous", he:"Il",
    she:"Elle", they:"Ils", mom:"Maman", dad:"Papa", friend:"Ami",
    doctor:"Docteur", teacher:"Professeur", everyone:"Tout le monde",
    happy:"Heureux", sad:"Triste", angry:"Fâché", scared:"Effrayé",
    tired:"Fatigué", sick:"Malade", hurt:"Mal", excited:"Excité",
    love:"Amour", bored:"Ennuyé", confused:"Confus", fine:"Bien",
    want:"Je veux", need:"J'ai besoin", go:"Aller", eat:"Manger", drink:"Boire",
    sleep:"Dormir", play:"Jouer", come:"Viens", give:"Donne", like:"J'aime",
    look:"Regarde", listen:"Écoute", read:"Lire", open:"Ouvrir", close:"Fermer",
    "turn on":"Allumer", water:"Eau", food:"Nourriture", milk:"Lait",
    juice:"Jus", snack:"Goûter", bread:"Pain", fruit:"Fruit", cookie:"Biscuit",
    pizza:"Pizza", rice:"Riz", soup:"Soupe", yogurt:"Yaourt",
    home:"Maison", school:"École", bathroom:"Toilettes", outside:"Dehors",
    bedroom:"Chambre", park:"Parc", store:"Magasin", hospital:"Hôpital",
    car:"Voiture", bus:"Bus", medicine:"Médicament", phone:"Téléphone",
    book:"Livre", music:"Musique", tv:"Télé", ball:"Ballon", toy:"Jouet",
    blanket:"Couverture", clothes:"Vêtements", money:"Argent", chair:"Chaise", light:"Lumière",
    big:"Grand", small:"Petit", hot:"Chaud", cold:"Froid", now:"Maintenant",
    later:"Plus tard", again:"Encore", different:"Différent", same:"Pareil",
    good:"Bon", bad:"Mauvais", quiet:"Silence",
  },
  it: {
    yes:"Sì", no:"No", please:"Per favore", thankyou:"Grazie", sorry:"Scusa",
    hi:"Ciao", bye:"Arrivederci", wait:"Aspetta", help:"Aiuto", stop:"Fermati",
    more:"Di più", done:"Fatto", i:"Io", you:"Tu", we:"Noi", he:"Lui",
    she:"Lei", they:"Loro", mom:"Mamma", dad:"Papà", friend:"Amico",
    doctor:"Dottore", teacher:"Insegnante", everyone:"Tutti",
    happy:"Felice", sad:"Triste", angry:"Arrabbiato", scared:"Spaventato",
    tired:"Stanco", sick:"Malato", hurt:"Fa male", excited:"Emozionato",
    love:"Amore", bored:"Annoiato", confused:"Confuso", fine:"Bene",
    want:"Voglio", need:"Ho bisogno", go:"Andare", eat:"Mangiare", drink:"Bere",
    sleep:"Dormire", play:"Giocare", come:"Vieni", give:"Dai", like:"Mi piace",
    look:"Guarda", listen:"Ascolta", read:"Leggere", open:"Aprire", close:"Chiudere",
    "turn on":"Accendere", water:"Acqua", food:"Cibo", milk:"Latte",
    juice:"Succo", snack:"Merenda", bread:"Pane", fruit:"Frutta", cookie:"Biscotto",
    pizza:"Pizza", rice:"Riso", soup:"Zuppa", yogurt:"Yogurt",
    home:"Casa", school:"Scuola", bathroom:"Bagno", outside:"Fuori",
    bedroom:"Camera", park:"Parco", store:"Negozio", hospital:"Ospedale",
    car:"Macchina", bus:"Autobus", medicine:"Medicina", phone:"Telefono",
    book:"Libro", music:"Musica", tv:"Tele", ball:"Palla", toy:"Giocattolo",
    blanket:"Coperta", clothes:"Vestiti", money:"Soldi", chair:"Sedia", light:"Luce",
    big:"Grande", small:"Piccolo", hot:"Caldo", cold:"Freddo", now:"Adesso",
    later:"Dopo", again:"Ancora", different:"Diverso", same:"Uguale",
    good:"Bene", bad:"Male", quiet:"Silenzio",
  },
  pt: {
    yes:"Sim", no:"Não", please:"Por favor", thankyou:"Obrigado", sorry:"Desculpe",
    hi:"Olá", bye:"Tchau", wait:"Espera", help:"Ajuda", stop:"Para",
    more:"Mais", done:"Pronto", i:"Eu", you:"Você", we:"Nós", he:"Ele",
    she:"Ela", they:"Eles", mom:"Mamãe", dad:"Papai", friend:"Amigo",
    doctor:"Médico", teacher:"Professor", everyone:"Todos",
    happy:"Feliz", sad:"Triste", angry:"Bravo", scared:"Assustado",
    tired:"Cansado", sick:"Doente", hurt:"Dói", excited:"Animado",
    love:"Amor", bored:"Entediado", confused:"Confuso", fine:"Bem",
    want:"Quero", need:"Preciso", go:"Ir", eat:"Comer", drink:"Beber",
    sleep:"Dormir", play:"Brincar", come:"Vem", give:"Dá", like:"Gosto",
    look:"Olha", listen:"Escuta", read:"Ler", open:"Abrir", close:"Fechar",
    "turn on":"Ligar", water:"Água", food:"Comida", milk:"Leite",
    juice:"Suco", snack:"Lanche", bread:"Pão", fruit:"Fruta", cookie:"Biscoito",
    pizza:"Pizza", rice:"Arroz", soup:"Sopa", yogurt:"Iogurte",
    home:"Casa", school:"Escola", bathroom:"Banheiro", outside:"Fora",
    bedroom:"Quarto", park:"Parque", store:"Loja", hospital:"Hospital",
    car:"Carro", bus:"Ônibus", medicine:"Remédio", phone:"Telefone",
    book:"Livro", music:"Música", tv:"Tele", ball:"Bola", toy:"Brinquedo",
    blanket:"Cobertor", clothes:"Roupa", money:"Dinheiro", chair:"Cadeira", light:"Luz",
    big:"Grande", small:"Pequeno", hot:"Quente", cold:"Frio", now:"Agora",
    later:"Depois", again:"De novo", different:"Diferente", same:"Igual",
    good:"Bom", bad:"Ruim", quiet:"Silêncio",
  },
};

/**
 * Get the translated label for a symbol.
 * Falls back to the English label if no translation exists.
 */
export function getSymbolLabel(symbol, langCode) {
  if (langCode === "en") return symbol.label;
  const t = SYMBOL_TRANSLATIONS[langCode];
  return t?.[symbol.id] ?? symbol.label;
}

/**
 * Get a translated category name.
 */
export function getCategoryName(categoryId, langCode) {
  return CATEGORY_NAMES[langCode]?.[categoryId] ?? CATEGORY_NAMES.en[categoryId] ?? categoryId;
}

// ── Hierarchy translations (keyed by hierarchy item id) ────────────────────────
// Covers L1 category labels, L2 core words, shared L3 palettes, and
// category-specific L3 items.  English is the fallback (uses item.label).

export const HIERARCHY_TRANSLATIONS = {
  es: {
    // L1 categories
    feel:"SENTIR", need:"NECESITAR", people:"PERSONAS", do:"HACER", talk:"HABLAR", place:"LUGAR",
    // ── Shared L3: TIME ──
    t_now:"ahora", t_today:"hoy", t_tomorrow:"mañana", t_yesterday:"ayer",
    t_morning:"mañana", t_afternoon:"tarde", t_night:"noche", t_later:"después", t_always:"siempre",
    // ── Shared L3: PEOPLE ──
    p_mom:"mamá", p_dad:"papá", p_friend:"amigo", p_teacher:"maestro",
    p_doctor:"doctor", p_caregiver:"cuidador", p_brother:"hermano", p_sister:"hermana", p_everyone:"todos",
    // ── Shared L3: PLACES ──
    pl_home:"casa", pl_school:"escuela", pl_outside:"afuera", pl_hospital:"hospital",
    pl_park:"parque", pl_here:"aquí", pl_there:"allá",
    // ── Shared L3: POLARITY ──
    x_not:"no", x_very:"muy", x_little:"un poco", x_please:"por favor",
    x_more:"más", x_less:"menos", x_again:"otra vez", x_maybe:"quizás",
    // ── Shared L3: OBJECTS ──
    o_food:"comida", o_water:"agua", o_book:"libro", o_phone:"teléfono",
    o_toy:"juguete", o_tv:"tele", o_music:"música", o_game:"juego",
    o_picture:"imagen", o_homework:"tarea", o_door:"puerta", o_window:"ventana",
    o_light:"luz", o_bag:"mochila", o_clothes:"ropa", o_blanket:"manta",
    o_ball:"pelota", o_medicine:"medicina",
    // ── Shared L3: BODY ──
    b_head:"cabeza", b_stomach:"estómago", b_throat:"garganta", b_back:"espalda",
    b_leg:"pierna", b_arm:"brazo", b_tooth:"diente", b_eyes:"ojos",
    // ── FEEL L2 ──
    f_happy:"feliz", f_excited:"emocionado", f_calm:"tranquilo", f_proud:"orgulloso",
    f_grateful:"agradecido", f_safe:"seguro", f_sad:"triste", f_angry:"enojado",
    f_scared:"asustado", f_tired:"cansado", f_sick:"enfermo", f_hurt:"duele",
    f_bored:"aburrido", f_lonely:"solo", f_confused:"confundido", f_nervous:"nervioso",
    f_frustrated:"frustrado", f_shy:"tímido", f_like:"me gusta", f_dislike:"no me gusta",
    f_love:"amor", f_hate:"odio", f_miss:"extraño", f_worry:"preocupado",
    // ── NEED L2 ──
    n_water:"agua", n_food:"comida", n_drink:"beber", n_toilet:"baño",
    n_medicine:"medicina", n_sleep:"dormir", n_rest:"descansar", n_help:"ayuda",
    n_hug:"abrazo", n_hot:"calor", n_cold:"frío", n_blanket:"manta",
    n_clothes:"ropa", n_clean:"limpio", n_quiet:"silencio", n_space:"espacio", n_break:"descanso",
    // NEED L3 specifics
    n3_apple:"manzana", n3_bread:"pan", n3_rice:"arroz", n3_pasta:"pasta",
    n3_soup:"sopa", n3_snack:"merienda", n3_lunch:"almuerzo", n3_dinner:"cena", n3_bkfast:"desayuno",
    n3_juice:"jugo", n3_milk:"leche", n3_tea:"té",
    n3_jacket:"chaqueta", n3_shoes:"zapatos", n3_hat:"gorro",
    // ── PEOPLE L2 ──
    pe_i:"yo", pe_you:"tú", pe_we:"nosotros", pe_they:"ellos",
    pe_mom:"mamá", pe_dad:"papá", pe_brother:"hermano", pe_sister:"hermana",
    pe_grandma:"abuela", pe_grandpa:"abuelo", pe_baby:"bebé", pe_family:"familia",
    pe_friend:"amigo", pe_teacher:"maestro", pe_doctor:"doctor", pe_caregiver:"cuidador",
    pe_classmate:"compañero", pe_neighbor:"vecino", pe_everyone:"todos", pe_nobody:"nadie",
    // ── DO L2 ──
    d_go:"ir", d_come:"venir", d_sit:"sentarse", d_stand:"pararse", d_walk:"caminar", d_run:"correr",
    d_give:"dar", d_take:"tomar", d_show:"mostrar", d_share:"compartir",
    d_help:"ayudar", d_wait:"esperar", d_stop:"parar",
    d_eat:"comer", d_drink:"beber", d_play:"jugar", d_read:"leer",
    d_write:"escribir", d_draw:"dibujar", d_watch:"mirar", d_listen:"escuchar",
    d_sing:"cantar", d_dance:"bailar", d_cook:"cocinar", d_clean:"limpiar",
    d_open:"abrir", d_close:"cerrar", d_turn_on:"encender", d_turn_off:"apagar",
    d_pick_up:"recoger", d_put_down:"dejar", d_push:"empujar", d_pull:"jalar",
    d_think:"pensar", d_know:"saber", d_learn:"aprender", d_try:"intentar",
    d_choose:"elegir", d_find:"encontrar", d_look:"mirar",
    d_want:"quiero", d_need:"necesito", d_can:"puedo",
    // ── TALK L2 ──
    s_hello:"hola", s_bye:"adiós", s_goodmorn:"buenos días", s_goodnight:"buenas noches",
    s_yes:"sí", s_no:"no", s_maybe:"quizás", s_ok:"vale", s_idk:"no sé",
    s_please:"por favor", s_thanks:"gracias", s_sorry:"lo siento", s_excuse:"disculpa", s_welcome:"de nada",
    s_question:"pregunta", s_tell:"decir", s_ask:"preguntar", s_say:"decir", s_talk:"hablar",
    s_explain:"explicar", s_repeat:"repetir", s_slower:"más lento", s_louder:"más fuerte",
    s_agree:"de acuerdo", s_disagree:"no estoy de acuerdo", s_joke:"es broma",
    s_congrats:"felicidades", s_wellDone:"bien hecho",
    // ── PLACE L2 ──
    lc_home:"casa", lc_school:"escuela", lc_hospital:"hospital", lc_outside:"afuera",
    lc_park:"parque", lc_store:"tienda", lc_restau:"restaurante", lc_car:"carro",
    lc_bus:"autobús", lc_bathroom:"baño", lc_church:"iglesia",
    lc_here:"aquí", lc_there:"allá", lc_inside:"adentro",
    lc_upstairs:"arriba", lc_downstr:"abajo", lc_far:"lejos", lc_close:"cerca",
    // PLACE L3 specifics
    lc3_kitchen:"cocina", lc3_bedroom:"dormitorio", lc3_bathroom:"baño",
    lc3_living:"sala", lc3_garden:"jardín",
    lc3_class:"aula", lc3_gym:"gimnasio", lc3_library:"biblioteca",
    lc3_cafet:"cafetería", lc3_office:"oficina", lc3_playground:"patio",
    lc3_room:"habitación", lc3_clinic:"clínica", lc3_waiting:"sala de espera", lc3_pharmacy:"farmacia",
    lc3_park:"parque", lc3_street:"calle", lc3_garden2:"jardín", lc3_beach:"playa", lc3_pool:"piscina", lc3_field:"campo",
    lc3_swing:"columpio", lc3_slide:"tobogán", lc3_bench:"banco", lc3_sand:"arenero",
    // ── QUESTION L2 ──
    question:"PREGUNTA",
    q_what:"qué", q_where:"dónde", q_when:"cuándo", q_who:"quién",
    q_why:"por qué", q_how:"cómo", q_howmuch:"cuánto", q_howmany:"cuántos",
    q_canI:"puedo", q_doYou:"tú", q_isIt:"es", q_whatTime:"qué hora",
    // ── DESCRIBE L2 ──
    describe:"DESCRIBIR",
    dc_big:"grande", dc_small:"pequeño", dc_fast:"rápido", dc_slow:"lento",
    dc_hot:"caliente", dc_cold:"frío", dc_clean:"limpio", dc_dirty:"sucio",
    dc_loud:"fuerte", dc_quiet:"silencioso", dc_new:"nuevo", dc_old:"viejo",
    dc_good:"bueno", dc_bad:"malo",
    // ── COLOURS L3 ──
    col_red:"rojo", col_blue:"azul", col_green:"verde", col_yellow:"amarillo",
    col_black:"negro", col_white:"blanco", col_pink:"rosa", col_orange:"naranja",
  },
  fr: {
    feel:"RESSENTIR", need:"BESOIN", people:"PERSONNES", do:"FAIRE", talk:"PARLER", place:"LIEU",
    t_now:"maintenant", t_today:"aujourd'hui", t_tomorrow:"demain", t_yesterday:"hier",
    t_morning:"matin", t_afternoon:"après-midi", t_night:"nuit", t_later:"plus tard", t_always:"toujours",
    p_mom:"maman", p_dad:"papa", p_friend:"ami", p_teacher:"professeur",
    p_doctor:"docteur", p_caregiver:"aidant", p_brother:"frère", p_sister:"sœur", p_everyone:"tout le monde",
    pl_home:"maison", pl_school:"école", pl_outside:"dehors", pl_hospital:"hôpital",
    pl_park:"parc", pl_here:"ici", pl_there:"là-bas",
    x_not:"pas", x_very:"très", x_little:"un peu", x_please:"s'il te plaît",
    x_more:"plus", x_less:"moins", x_again:"encore", x_maybe:"peut-être",
    o_food:"nourriture", o_water:"eau", o_book:"livre", o_phone:"téléphone",
    o_toy:"jouet", o_tv:"télé", o_music:"musique", o_game:"jeu",
    o_picture:"image", o_homework:"devoirs", o_door:"porte", o_window:"fenêtre",
    o_light:"lumière", o_bag:"sac", o_clothes:"vêtements", o_blanket:"couverture",
    o_ball:"ballon", o_medicine:"médicament",
    b_head:"tête", b_stomach:"ventre", b_throat:"gorge", b_back:"dos",
    b_leg:"jambe", b_arm:"bras", b_tooth:"dent", b_eyes:"yeux",
    f_happy:"heureux", f_excited:"excité", f_calm:"calme", f_proud:"fier",
    f_grateful:"reconnaissant", f_safe:"en sécurité", f_sad:"triste", f_angry:"fâché",
    f_scared:"effrayé", f_tired:"fatigué", f_sick:"malade", f_hurt:"mal",
    f_bored:"ennuyé", f_lonely:"seul", f_confused:"confus", f_nervous:"nerveux",
    f_frustrated:"frustré", f_shy:"timide", f_like:"j'aime", f_dislike:"je n'aime pas",
    f_love:"amour", f_hate:"déteste", f_miss:"manque", f_worry:"inquiet",
    n_water:"eau", n_food:"nourriture", n_drink:"boire", n_toilet:"toilettes",
    n_medicine:"médicament", n_sleep:"dormir", n_rest:"repos", n_help:"aide",
    n_hug:"câlin", n_hot:"chaud", n_cold:"froid", n_blanket:"couverture",
    n_clothes:"vêtements", n_clean:"propre", n_quiet:"silence", n_space:"espace", n_break:"pause",
    n3_apple:"pomme", n3_bread:"pain", n3_rice:"riz", n3_pasta:"pâtes",
    n3_soup:"soupe", n3_snack:"goûter", n3_lunch:"déjeuner", n3_dinner:"dîner", n3_bkfast:"petit-déjeuner",
    n3_juice:"jus", n3_milk:"lait", n3_tea:"thé",
    n3_jacket:"veste", n3_shoes:"chaussures", n3_hat:"chapeau",
    pe_i:"je", pe_you:"tu", pe_we:"nous", pe_they:"ils",
    pe_mom:"maman", pe_dad:"papa", pe_brother:"frère", pe_sister:"sœur",
    pe_grandma:"grand-mère", pe_grandpa:"grand-père", pe_baby:"bébé", pe_family:"famille",
    pe_friend:"ami", pe_teacher:"professeur", pe_doctor:"docteur", pe_caregiver:"aidant",
    pe_classmate:"camarade", pe_neighbor:"voisin", pe_everyone:"tout le monde", pe_nobody:"personne",
    d_go:"aller", d_come:"venir", d_sit:"s'asseoir", d_stand:"se lever", d_walk:"marcher", d_run:"courir",
    d_give:"donner", d_take:"prendre", d_show:"montrer", d_share:"partager",
    d_help:"aider", d_wait:"attendre", d_stop:"arrêter",
    d_eat:"manger", d_drink:"boire", d_play:"jouer", d_read:"lire",
    d_write:"écrire", d_draw:"dessiner", d_watch:"regarder", d_listen:"écouter",
    d_sing:"chanter", d_dance:"danser", d_cook:"cuisiner", d_clean:"nettoyer",
    d_open:"ouvrir", d_close:"fermer", d_turn_on:"allumer", d_turn_off:"éteindre",
    d_pick_up:"ramasser", d_put_down:"poser", d_push:"pousser", d_pull:"tirer",
    d_think:"penser", d_know:"savoir", d_learn:"apprendre", d_try:"essayer",
    d_choose:"choisir", d_find:"trouver", d_look:"regarder",
    d_want:"je veux", d_need:"j'ai besoin", d_can:"je peux",
    s_hello:"bonjour", s_bye:"au revoir", s_goodmorn:"bonjour", s_goodnight:"bonne nuit",
    s_yes:"oui", s_no:"non", s_maybe:"peut-être", s_ok:"d'accord", s_idk:"je ne sais pas",
    s_please:"s'il te plaît", s_thanks:"merci", s_sorry:"désolé", s_excuse:"excusez-moi", s_welcome:"de rien",
    s_question:"question", s_tell:"dire", s_ask:"demander", s_say:"dire", s_talk:"parler",
    s_explain:"expliquer", s_repeat:"répéter", s_slower:"plus lent", s_louder:"plus fort",
    s_agree:"d'accord", s_disagree:"pas d'accord", s_joke:"je plaisante",
    s_congrats:"félicitations", s_wellDone:"bravo",
    lc_home:"maison", lc_school:"école", lc_hospital:"hôpital", lc_outside:"dehors",
    lc_park:"parc", lc_store:"magasin", lc_restau:"restaurant", lc_car:"voiture",
    lc_bus:"bus", lc_bathroom:"toilettes", lc_church:"église",
    lc_here:"ici", lc_there:"là-bas", lc_inside:"dedans",
    lc_upstairs:"en haut", lc_downstr:"en bas", lc_far:"loin", lc_close:"près",
    lc3_kitchen:"cuisine", lc3_bedroom:"chambre", lc3_bathroom:"salle de bain",
    lc3_living:"salon", lc3_garden:"jardin",
    lc3_class:"salle de classe", lc3_gym:"gymnase", lc3_library:"bibliothèque",
    lc3_cafet:"cantine", lc3_office:"bureau", lc3_playground:"cour",
    lc3_room:"chambre", lc3_clinic:"clinique", lc3_waiting:"salle d'attente", lc3_pharmacy:"pharmacie",
    lc3_park:"parc", lc3_street:"rue", lc3_garden2:"jardin", lc3_beach:"plage", lc3_pool:"piscine", lc3_field:"terrain",
    lc3_swing:"balançoire", lc3_slide:"toboggan", lc3_bench:"banc", lc3_sand:"bac à sable",
    // ── QUESTION L2 ──
    question:"QUESTION",
    q_what:"quoi", q_where:"où", q_when:"quand", q_who:"qui",
    q_why:"pourquoi", q_how:"comment", q_howmuch:"combien", q_howmany:"combien",
    q_canI:"est-ce que je peux", q_doYou:"est-ce que tu", q_isIt:"est-ce que c'est", q_whatTime:"quelle heure",
    // ── DESCRIBE L2 ──
    describe:"DÉCRIRE",
    dc_big:"grand", dc_small:"petit", dc_fast:"rapide", dc_slow:"lent",
    dc_hot:"chaud", dc_cold:"froid", dc_clean:"propre", dc_dirty:"sale",
    dc_loud:"fort", dc_quiet:"silencieux", dc_new:"nouveau", dc_old:"vieux",
    dc_good:"bon", dc_bad:"mauvais",
    // ── COLOURS L3 ──
    col_red:"rouge", col_blue:"bleu", col_green:"vert", col_yellow:"jaune",
    col_black:"noir", col_white:"blanc", col_pink:"rose", col_orange:"orange",
  },
  it: {
    feel:"SENTIRE", need:"BISOGNO", people:"PERSONE", do:"FARE", talk:"PARLARE", place:"LUOGO",
    t_now:"adesso", t_today:"oggi", t_tomorrow:"domani", t_yesterday:"ieri",
    t_morning:"mattina", t_afternoon:"pomeriggio", t_night:"notte", t_later:"dopo", t_always:"sempre",
    p_mom:"mamma", p_dad:"papà", p_friend:"amico", p_teacher:"insegnante",
    p_doctor:"dottore", p_caregiver:"assistente", p_brother:"fratello", p_sister:"sorella", p_everyone:"tutti",
    pl_home:"casa", pl_school:"scuola", pl_outside:"fuori", pl_hospital:"ospedale",
    pl_park:"parco", pl_here:"qui", pl_there:"là",
    x_not:"non", x_very:"molto", x_little:"un po'", x_please:"per favore",
    x_more:"di più", x_less:"meno", x_again:"ancora", x_maybe:"forse",
    o_food:"cibo", o_water:"acqua", o_book:"libro", o_phone:"telefono",
    o_toy:"giocattolo", o_tv:"tele", o_music:"musica", o_game:"gioco",
    o_picture:"immagine", o_homework:"compiti", o_door:"porta", o_window:"finestra",
    o_light:"luce", o_bag:"zaino", o_clothes:"vestiti", o_blanket:"coperta",
    o_ball:"palla", o_medicine:"medicina",
    b_head:"testa", b_stomach:"stomaco", b_throat:"gola", b_back:"schiena",
    b_leg:"gamba", b_arm:"braccio", b_tooth:"dente", b_eyes:"occhi",
    f_happy:"felice", f_excited:"emozionato", f_calm:"calmo", f_proud:"orgoglioso",
    f_grateful:"grato", f_safe:"al sicuro", f_sad:"triste", f_angry:"arrabbiato",
    f_scared:"spaventato", f_tired:"stanco", f_sick:"malato", f_hurt:"fa male",
    f_bored:"annoiato", f_lonely:"solo", f_confused:"confuso", f_nervous:"nervoso",
    f_frustrated:"frustrato", f_shy:"timido", f_like:"mi piace", f_dislike:"non mi piace",
    f_love:"amore", f_hate:"odio", f_miss:"mi manca", f_worry:"preoccupato",
    n_water:"acqua", n_food:"cibo", n_drink:"bere", n_toilet:"bagno",
    n_medicine:"medicina", n_sleep:"dormire", n_rest:"riposo", n_help:"aiuto",
    n_hug:"abbraccio", n_hot:"caldo", n_cold:"freddo", n_blanket:"coperta",
    n_clothes:"vestiti", n_clean:"pulito", n_quiet:"silenzio", n_space:"spazio", n_break:"pausa",
    n3_apple:"mela", n3_bread:"pane", n3_rice:"riso", n3_pasta:"pasta",
    n3_soup:"zuppa", n3_snack:"merenda", n3_lunch:"pranzo", n3_dinner:"cena", n3_bkfast:"colazione",
    n3_juice:"succo", n3_milk:"latte", n3_tea:"tè",
    n3_jacket:"giacca", n3_shoes:"scarpe", n3_hat:"cappello",
    pe_i:"io", pe_you:"tu", pe_we:"noi", pe_they:"loro",
    pe_mom:"mamma", pe_dad:"papà", pe_brother:"fratello", pe_sister:"sorella",
    pe_grandma:"nonna", pe_grandpa:"nonno", pe_baby:"bambino", pe_family:"famiglia",
    pe_friend:"amico", pe_teacher:"insegnante", pe_doctor:"dottore", pe_caregiver:"assistente",
    pe_classmate:"compagno", pe_neighbor:"vicino", pe_everyone:"tutti", pe_nobody:"nessuno",
    d_go:"andare", d_come:"venire", d_sit:"sedersi", d_stand:"alzarsi", d_walk:"camminare", d_run:"correre",
    d_give:"dare", d_take:"prendere", d_show:"mostrare", d_share:"condividere",
    d_help:"aiutare", d_wait:"aspettare", d_stop:"fermare",
    d_eat:"mangiare", d_drink:"bere", d_play:"giocare", d_read:"leggere",
    d_write:"scrivere", d_draw:"disegnare", d_watch:"guardare", d_listen:"ascoltare",
    d_sing:"cantare", d_dance:"ballare", d_cook:"cucinare", d_clean:"pulire",
    d_open:"aprire", d_close:"chiudere", d_turn_on:"accendere", d_turn_off:"spegnere",
    d_pick_up:"raccogliere", d_put_down:"posare", d_push:"spingere", d_pull:"tirare",
    d_think:"pensare", d_know:"sapere", d_learn:"imparare", d_try:"provare",
    d_choose:"scegliere", d_find:"trovare", d_look:"guardare",
    d_want:"voglio", d_need:"ho bisogno", d_can:"posso",
    s_hello:"ciao", s_bye:"arrivederci", s_goodmorn:"buongiorno", s_goodnight:"buonanotte",
    s_yes:"sì", s_no:"no", s_maybe:"forse", s_ok:"va bene", s_idk:"non lo so",
    s_please:"per favore", s_thanks:"grazie", s_sorry:"scusa", s_excuse:"scusa", s_welcome:"prego",
    s_question:"domanda", s_tell:"dire", s_ask:"chiedere", s_say:"dire", s_talk:"parlare",
    s_explain:"spiegare", s_repeat:"ripetere", s_slower:"più lento", s_louder:"più forte",
    s_agree:"d'accordo", s_disagree:"non sono d'accordo", s_joke:"scherzo",
    s_congrats:"congratulazioni", s_wellDone:"bravo",
    lc_home:"casa", lc_school:"scuola", lc_hospital:"ospedale", lc_outside:"fuori",
    lc_park:"parco", lc_store:"negozio", lc_restau:"ristorante", lc_car:"macchina",
    lc_bus:"autobus", lc_bathroom:"bagno", lc_church:"chiesa",
    lc_here:"qui", lc_there:"là", lc_inside:"dentro",
    lc_upstairs:"di sopra", lc_downstr:"di sotto", lc_far:"lontano", lc_close:"vicino",
    lc3_kitchen:"cucina", lc3_bedroom:"camera", lc3_bathroom:"bagno",
    lc3_living:"soggiorno", lc3_garden:"giardino",
    lc3_class:"aula", lc3_gym:"palestra", lc3_library:"biblioteca",
    lc3_cafet:"mensa", lc3_office:"ufficio", lc3_playground:"cortile",
    lc3_room:"stanza", lc3_clinic:"clinica", lc3_waiting:"sala d'attesa", lc3_pharmacy:"farmacia",
    lc3_park:"parco", lc3_street:"strada", lc3_garden2:"giardino", lc3_beach:"spiaggia", lc3_pool:"piscina", lc3_field:"campo",
    lc3_swing:"altalena", lc3_slide:"scivolo", lc3_bench:"panchina", lc3_sand:"sabbiera",
    // ── QUESTION L2 ──
    question:"DOMANDA",
    q_what:"cosa", q_where:"dove", q_when:"quando", q_who:"chi",
    q_why:"perché", q_how:"come", q_howmuch:"quanto", q_howmany:"quanti",
    q_canI:"posso", q_doYou:"tu", q_isIt:"è", q_whatTime:"che ora",
    // ── DESCRIBE L2 ──
    describe:"DESCRIVERE",
    dc_big:"grande", dc_small:"piccolo", dc_fast:"veloce", dc_slow:"lento",
    dc_hot:"caldo", dc_cold:"freddo", dc_clean:"pulito", dc_dirty:"sporco",
    dc_loud:"forte", dc_quiet:"silenzioso", dc_new:"nuovo", dc_old:"vecchio",
    dc_good:"buono", dc_bad:"cattivo",
    // ── COLOURS L3 ──
    col_red:"rosso", col_blue:"blu", col_green:"verde", col_yellow:"giallo",
    col_black:"nero", col_white:"bianco", col_pink:"rosa", col_orange:"arancione",
  },
  pt: {
    feel:"SENTIR", need:"PRECISAR", people:"PESSOAS", do:"FAZER", talk:"FALAR", place:"LUGAR",
    t_now:"agora", t_today:"hoje", t_tomorrow:"amanhã", t_yesterday:"ontem",
    t_morning:"manhã", t_afternoon:"tarde", t_night:"noite", t_later:"depois", t_always:"sempre",
    p_mom:"mamãe", p_dad:"papai", p_friend:"amigo", p_teacher:"professor",
    p_doctor:"médico", p_caregiver:"cuidador", p_brother:"irmão", p_sister:"irmã", p_everyone:"todos",
    pl_home:"casa", pl_school:"escola", pl_outside:"fora", pl_hospital:"hospital",
    pl_park:"parque", pl_here:"aqui", pl_there:"lá",
    x_not:"não", x_very:"muito", x_little:"um pouco", x_please:"por favor",
    x_more:"mais", x_less:"menos", x_again:"de novo", x_maybe:"talvez",
    o_food:"comida", o_water:"água", o_book:"livro", o_phone:"telefone",
    o_toy:"brinquedo", o_tv:"tele", o_music:"música", o_game:"jogo",
    o_picture:"imagem", o_homework:"dever", o_door:"porta", o_window:"janela",
    o_light:"luz", o_bag:"mochila", o_clothes:"roupa", o_blanket:"cobertor",
    o_ball:"bola", o_medicine:"remédio",
    b_head:"cabeça", b_stomach:"estômago", b_throat:"garganta", b_back:"costas",
    b_leg:"perna", b_arm:"braço", b_tooth:"dente", b_eyes:"olhos",
    f_happy:"feliz", f_excited:"animado", f_calm:"calmo", f_proud:"orgulhoso",
    f_grateful:"grato", f_safe:"seguro", f_sad:"triste", f_angry:"bravo",
    f_scared:"assustado", f_tired:"cansado", f_sick:"doente", f_hurt:"dói",
    f_bored:"entediado", f_lonely:"sozinho", f_confused:"confuso", f_nervous:"nervoso",
    f_frustrated:"frustrado", f_shy:"tímido", f_like:"gosto", f_dislike:"não gosto",
    f_love:"amor", f_hate:"odeio", f_miss:"saudade", f_worry:"preocupado",
    n_water:"água", n_food:"comida", n_drink:"beber", n_toilet:"banheiro",
    n_medicine:"remédio", n_sleep:"dormir", n_rest:"descanso", n_help:"ajuda",
    n_hug:"abraço", n_hot:"calor", n_cold:"frio", n_blanket:"cobertor",
    n_clothes:"roupa", n_clean:"limpo", n_quiet:"silêncio", n_space:"espaço", n_break:"intervalo",
    n3_apple:"maçã", n3_bread:"pão", n3_rice:"arroz", n3_pasta:"massa",
    n3_soup:"sopa", n3_snack:"lanche", n3_lunch:"almoço", n3_dinner:"jantar", n3_bkfast:"café da manhã",
    n3_juice:"suco", n3_milk:"leite", n3_tea:"chá",
    n3_jacket:"jaqueta", n3_shoes:"sapatos", n3_hat:"chapéu",
    pe_i:"eu", pe_you:"você", pe_we:"nós", pe_they:"eles",
    pe_mom:"mamãe", pe_dad:"papai", pe_brother:"irmão", pe_sister:"irmã",
    pe_grandma:"avó", pe_grandpa:"avô", pe_baby:"bebê", pe_family:"família",
    pe_friend:"amigo", pe_teacher:"professor", pe_doctor:"médico", pe_caregiver:"cuidador",
    pe_classmate:"colega", pe_neighbor:"vizinho", pe_everyone:"todos", pe_nobody:"ninguém",
    d_go:"ir", d_come:"vir", d_sit:"sentar", d_stand:"levantar", d_walk:"andar", d_run:"correr",
    d_give:"dar", d_take:"pegar", d_show:"mostrar", d_share:"dividir",
    d_help:"ajudar", d_wait:"esperar", d_stop:"parar",
    d_eat:"comer", d_drink:"beber", d_play:"brincar", d_read:"ler",
    d_write:"escrever", d_draw:"desenhar", d_watch:"assistir", d_listen:"escutar",
    d_sing:"cantar", d_dance:"dançar", d_cook:"cozinhar", d_clean:"limpar",
    d_open:"abrir", d_close:"fechar", d_turn_on:"ligar", d_turn_off:"desligar",
    d_pick_up:"pegar", d_put_down:"colocar", d_push:"empurrar", d_pull:"puxar",
    d_think:"pensar", d_know:"saber", d_learn:"aprender", d_try:"tentar",
    d_choose:"escolher", d_find:"encontrar", d_look:"olhar",
    d_want:"quero", d_need:"preciso", d_can:"posso",
    s_hello:"olá", s_bye:"tchau", s_goodmorn:"bom dia", s_goodnight:"boa noite",
    s_yes:"sim", s_no:"não", s_maybe:"talvez", s_ok:"tá bom", s_idk:"não sei",
    s_please:"por favor", s_thanks:"obrigado", s_sorry:"desculpa", s_excuse:"com licença", s_welcome:"de nada",
    s_question:"pergunta", s_tell:"contar", s_ask:"perguntar", s_say:"dizer", s_talk:"falar",
    s_explain:"explicar", s_repeat:"repetir", s_slower:"mais devagar", s_louder:"mais alto",
    s_agree:"concordo", s_disagree:"discordo", s_joke:"brincadeira",
    s_congrats:"parabéns", s_wellDone:"muito bem",
    lc_home:"casa", lc_school:"escola", lc_hospital:"hospital", lc_outside:"fora",
    lc_park:"parque", lc_store:"loja", lc_restau:"restaurante", lc_car:"carro",
    lc_bus:"ônibus", lc_bathroom:"banheiro", lc_church:"igreja",
    lc_here:"aqui", lc_there:"lá", lc_inside:"dentro",
    lc_upstairs:"lá em cima", lc_downstr:"lá embaixo", lc_far:"longe", lc_close:"perto",
    lc3_kitchen:"cozinha", lc3_bedroom:"quarto", lc3_bathroom:"banheiro",
    lc3_living:"sala", lc3_garden:"jardim",
    lc3_class:"sala de aula", lc3_gym:"ginásio", lc3_library:"biblioteca",
    lc3_cafet:"cantina", lc3_office:"escritório", lc3_playground:"parquinho",
    lc3_room:"quarto", lc3_clinic:"clínica", lc3_waiting:"sala de espera", lc3_pharmacy:"farmácia",
    lc3_park:"parque", lc3_street:"rua", lc3_garden2:"jardim", lc3_beach:"praia", lc3_pool:"piscina", lc3_field:"campo",
    lc3_swing:"balanço", lc3_slide:"escorregador", lc3_bench:"banco", lc3_sand:"caixa de areia",
    // ── QUESTION L2 ──
    question:"PERGUNTA",
    q_what:"o quê", q_where:"onde", q_when:"quando", q_who:"quem",
    q_why:"por quê", q_how:"como", q_howmuch:"quanto", q_howmany:"quantos",
    q_canI:"posso", q_doYou:"você", q_isIt:"é", q_whatTime:"que horas",
    // ── DESCRIBE L2 ──
    describe:"DESCREVER",
    dc_big:"grande", dc_small:"pequeno", dc_fast:"rápido", dc_slow:"lento",
    dc_hot:"quente", dc_cold:"frio", dc_clean:"limpo", dc_dirty:"sujo",
    dc_loud:"alto", dc_quiet:"silencioso", dc_new:"novo", dc_old:"velho",
    dc_good:"bom", dc_bad:"mau",
    // ── COLOURS L3 ──
    col_red:"vermelho", col_blue:"azul", col_green:"verde", col_yellow:"amarelo",
    col_black:"preto", col_white:"branco", col_pink:"rosa", col_orange:"laranja",
  },
};

/**
 * Get the translated label for a hierarchy item (L1, L2, or L3).
 * Falls back to the item's English label.
 *
 * @param {{ id: string, label: string }} item — hierarchy item with id and label
 * @param {string} langCode — ISO 639-1 code
 * @returns {string} translated label, or English fallback
 */
export function getHierarchyLabel(item, langCode) {
  if (langCode === "en" || !item?.id) return item?.label ?? "";
  return HIERARCHY_TRANSLATIONS[langCode]?.[item.id] ?? item.label;
}

