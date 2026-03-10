/**
 * hierarchy.js — 3-level tap hierarchy for the AAC board.
 *
 * Design goals:
 *  1. Cover most simple sentences in 2–3 taps  (L1 + L2,  or  L1 + L2 + L3)
 *  2. Work across Latin languages (EN, IT, ES, FR, PT) — labels are
 *     base-form words the AI expands into grammatically correct sentences.
 *  3. Optional L3 adds nuance/context without cluttering the UI.
 *  4. Flexible for AI sentence prediction: L1+L2+L3 concatenation gives the
 *     LLM enough semantic signal to produce nearly any everyday sentence.
 *  5. Dynamically expandable: new L3 objects can be added per category.
 *
 * Rules:
 *   - 8 L1 categories  (feel, need, people, do, talk, place, question, describe)
 *   - 12–16 L2 items per category
 *   - Every L2 has 6–20 L3 options
 *   - Every item has an emoji + base-form English label
 *   - All IDs are unique (prefixed: f_, n_, pe_, d_, s_, lc_, q_, dc_, col_)
 *
 * Structure:
 *   Level 1 → CategoryGrid   (Feel, Need, People, Do, Talk, Place, Question, Describe)
 *   Level 2 → Core verb/adjective/noun for the domain
 *   Level 3 → Object · modifier · time · person · place  (optional)
 */

// ── Shared L3 palettes (reused across categories) ────────────────────────────

const TIME = [
  { id: "t_now",       emoji: "⚡",  label: "now" },
  { id: "t_today",     emoji: "📅",  label: "today" },
  { id: "t_tomorrow",  emoji: "🌅",  label: "tomorrow" },
  { id: "t_yesterday", emoji: "⏪",  label: "yesterday" },
  { id: "t_morning",   emoji: "🌄",  label: "morning" },
  { id: "t_afternoon", emoji: "🌤️",  label: "afternoon" },
  { id: "t_night",     emoji: "🌙",  label: "night" },
  { id: "t_later",     emoji: "🕐",  label: "later" },
  { id: "t_always",    emoji: "♾️",  label: "always" },
];

const PEOPLE = [
  { id: "p_mom",       emoji: "👩",  label: "mom" },
  { id: "p_dad",       emoji: "👨",  label: "dad" },
  { id: "p_friend",    emoji: "🤝",  label: "friend" },
  { id: "p_teacher",   emoji: "🧑‍🏫", label: "teacher" },
  { id: "p_doctor",    emoji: "🧑‍⚕️", label: "doctor" },
  { id: "p_caregiver", emoji: "💜",  label: "caregiver" },
  { id: "p_brother",   emoji: "👦",  label: "brother" },
  { id: "p_sister",    emoji: "👧",  label: "sister" },
  { id: "p_everyone",  emoji: "🌍",  label: "everyone" },
];

const PLACES = [
  { id: "pl_home",     emoji: "🏠",  label: "home" },
  { id: "pl_school",   emoji: "🏫",  label: "school" },
  { id: "pl_outside",  emoji: "🌳",  label: "outside" },
  { id: "pl_hospital", emoji: "🏥",  label: "hospital" },
  { id: "pl_park",     emoji: "🏞️",  label: "park" },
  { id: "pl_here",     emoji: "📍",  label: "here" },
  { id: "pl_there",    emoji: "👉",  label: "there" },
];

const POLARITY = [
  { id: "x_not",      emoji: "🚫",  label: "not" },
  { id: "x_very",     emoji: "💯",  label: "very" },
  { id: "x_little",   emoji: "🤏",  label: "a little" },
  { id: "x_please",   emoji: "🙏",  label: "please" },
  { id: "x_more",     emoji: "➕",  label: "more" },
  { id: "x_less",     emoji: "➖",  label: "less" },
  { id: "x_again",    emoji: "🔄",  label: "again" },
  { id: "x_maybe",    emoji: "🤔",  label: "maybe" },
];

const OBJECTS = [
  { id: "o_food",     emoji: "🍎",  label: "food" },
  { id: "o_water",    emoji: "💧",  label: "water" },
  { id: "o_book",     emoji: "📖",  label: "book" },
  { id: "o_phone",    emoji: "📱",  label: "phone" },
  { id: "o_toy",      emoji: "🧸",  label: "toy" },
  { id: "o_tv",       emoji: "📺",  label: "TV" },
  { id: "o_music",    emoji: "🎵",  label: "music" },
  { id: "o_game",     emoji: "🎮",  label: "game" },
  { id: "o_picture",  emoji: "🖼️",  label: "picture" },
  { id: "o_homework", emoji: "📚",  label: "homework" },
  { id: "o_door",     emoji: "🚪",  label: "door" },
  { id: "o_window",   emoji: "🪟",  label: "window" },
  { id: "o_light",    emoji: "💡",  label: "light" },
  { id: "o_bag",      emoji: "🎒",  label: "bag" },
  { id: "o_clothes",  emoji: "👕",  label: "clothes" },
  { id: "o_blanket",  emoji: "🛏️",  label: "blanket" },
  { id: "o_ball",     emoji: "⚽",  label: "ball" },
  { id: "o_medicine", emoji: "💊",  label: "medicine" },
];

const BODY = [
  { id: "b_head",     emoji: "🤕",  label: "head" },
  { id: "b_stomach",  emoji: "🤢",  label: "stomach" },
  { id: "b_throat",   emoji: "😮‍💨", label: "throat" },
  { id: "b_back",     emoji: "🔙",  label: "back" },
  { id: "b_leg",      emoji: "🦵",  label: "leg" },
  { id: "b_arm",      emoji: "💪",  label: "arm" },
  { id: "b_tooth",    emoji: "🦷",  label: "tooth" },
  { id: "b_eyes",     emoji: "👀",  label: "eyes" },
];

const COLOURS = [
  { id: "col_red",    emoji: "🔴",  label: "red" },
  { id: "col_blue",   emoji: "🔵",  label: "blue" },
  { id: "col_green",  emoji: "🟢",  label: "green" },
  { id: "col_yellow", emoji: "🟡",  label: "yellow" },
  { id: "col_black",  emoji: "⚫",  label: "black" },
  { id: "col_white",  emoji: "⚪",  label: "white" },
  { id: "col_pink",   emoji: "🩷",  label: "pink" },
  { id: "col_orange", emoji: "🟠",  label: "orange" },
];

/** Helper: merge shared palettes with category-specific extras */
function l3(...groups) { return groups.flat(); }

// ── HIERARCHY ─────────────────────────────────────────────────────────────────

export const HIERARCHY = {

  // ━━ FEEL (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  feel: {
    id: "feel", emoji: "❤️", label: "FEEL", color: "#E03131", bg: "#FFF5F5",
    mapTo: "feelings",
    items: [
      { id: "f_happy",     emoji: "😊", label: "happy",     l3: l3(TIME, POLARITY) },
      { id: "f_sad",       emoji: "😢", label: "sad",       l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_angry",     emoji: "😠", label: "angry",     l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_scared",    emoji: "😨", label: "scared",    l3: l3(TIME, POLARITY, PLACES) },
      { id: "f_tired",     emoji: "😴", label: "tired",     l3: l3(TIME, POLARITY) },
      { id: "f_sick",      emoji: "🤒", label: "sick",      l3: l3(TIME, BODY) },
      { id: "f_hurt",      emoji: "🤕", label: "hurt",      l3: l3(BODY, POLARITY) },
      { id: "f_excited",   emoji: "🤩", label: "excited",   l3: l3(TIME, POLARITY) },
      { id: "f_calm",      emoji: "😌", label: "calm",      l3: l3(TIME, POLARITY) },
      { id: "f_nervous",   emoji: "😰", label: "nervous",   l3: l3(TIME, POLARITY) },
      { id: "f_bored",     emoji: "😑", label: "bored",     l3: l3(TIME, POLARITY) },
      { id: "f_lonely",    emoji: "😞", label: "lonely",    l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_love",      emoji: "❤️", label: "love",      l3: l3(PEOPLE, OBJECTS, POLARITY) },
      { id: "f_worry",     emoji: "😟", label: "worry",     l3: l3(PEOPLE, TIME) },
    ],
  },

  // ━━ NEED (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  need: {
    id: "need", emoji: "🍎", label: "NEED", color: "#2F9E44", bg: "#EBFBEE",
    mapTo: "needs",
    items: [
      { id: "n_water",     emoji: "💧", label: "water",     l3: l3(TIME, POLARITY) },
      { id: "n_food",      emoji: "🍎", label: "food",      l3: l3([
          { id: "n3_apple",   emoji: "🍎", label: "apple" },
          { id: "n3_bread",   emoji: "🍞", label: "bread" },
          { id: "n3_rice",    emoji: "🍚", label: "rice" },
          { id: "n3_pasta",   emoji: "🍝", label: "pasta" },
          { id: "n3_soup",    emoji: "🥣", label: "soup" },
          { id: "n3_snack",   emoji: "🍪", label: "snack" },
        ], POLARITY),
      },
      { id: "n_drink",    emoji: "🥤", label: "drink",     l3: l3([
          { id: "n3_juice",   emoji: "🧃", label: "juice" },
          { id: "n3_milk",    emoji: "🥛", label: "milk" },
          { id: "n3_tea",     emoji: "🍵", label: "tea" },
        ], POLARITY),
      },
      { id: "n_toilet",   emoji: "🚻", label: "toilet",    l3: l3(TIME, POLARITY) },
      { id: "n_medicine", emoji: "💊", label: "medicine",   l3: l3(BODY, TIME) },
      { id: "n_sleep",    emoji: "💤", label: "sleep",      l3: l3(TIME, POLARITY) },
      { id: "n_rest",     emoji: "🛋️", label: "rest",       l3: l3(TIME, POLARITY) },
      { id: "n_help",     emoji: "🆘", label: "help",       l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "n_hug",      emoji: "🤗", label: "hug",        l3: l3(PEOPLE, TIME) },
      { id: "n_hot",      emoji: "🥵", label: "hot",        l3: l3(TIME, POLARITY) },
      { id: "n_cold",     emoji: "🥶", label: "cold",       l3: l3(TIME, POLARITY) },
      { id: "n_blanket",  emoji: "🛏️", label: "blanket",    l3: l3(TIME, POLARITY) },
      { id: "n_clean",    emoji: "🧼", label: "clean",      l3: l3(BODY, TIME) },
      { id: "n_break",    emoji: "⏸️", label: "break",      l3: l3(TIME, POLARITY) },
    ],
  },

  // ━━ PEOPLE (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  people: {
    id: "people", emoji: "👥", label: "PEOPLE", color: "#1971C2", bg: "#E7F5FF",
    mapTo: "people",
    items: [
      { id: "pe_i",        emoji: "👤", label: "I",         l3: l3(TIME, POLARITY, PLACES) },
      { id: "pe_you",      emoji: "👆", label: "you",       l3: l3(TIME, POLARITY, PLACES) },
      { id: "pe_we",       emoji: "👫", label: "we",        l3: l3(TIME, POLARITY, PLACES) },
      { id: "pe_they",     emoji: "👥", label: "they",      l3: l3(TIME, POLARITY, PLACES) },
      { id: "pe_mom",      emoji: "👩", label: "mom",       l3: l3(PLACES, TIME, POLARITY) },
      { id: "pe_dad",      emoji: "👨", label: "dad",       l3: l3(PLACES, TIME, POLARITY) },
      { id: "pe_brother",  emoji: "👦", label: "brother",   l3: l3(PLACES, TIME) },
      { id: "pe_sister",   emoji: "👧", label: "sister",    l3: l3(PLACES, TIME) },
      { id: "pe_grandma",  emoji: "👵", label: "grandma",   l3: l3(PLACES, TIME) },
      { id: "pe_grandpa",  emoji: "👴", label: "grandpa",   l3: l3(PLACES, TIME) },
      { id: "pe_baby",     emoji: "👶", label: "baby",      l3: l3(PLACES, TIME) },
      { id: "pe_friend",   emoji: "🤝", label: "friend",    l3: l3(PLACES, TIME) },
      { id: "pe_teacher",  emoji: "🧑‍🏫", label: "teacher",  l3: l3(PLACES, TIME) },
      { id: "pe_family",   emoji: "👨‍👩‍👧‍👦", label: "family",  l3: l3(PLACES, TIME) },
    ],
  },

  // ━━ DO (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  do: {
    id: "do", emoji: "👉", label: "DO", color: "#E8590C", bg: "#FFF4E6",
    mapTo: "actions",
    items: [
      { id: "d_go",       emoji: "🚶", label: "go",         l3: l3(PLACES, TIME, POLARITY) },
      { id: "d_eat",      emoji: "🍴", label: "eat",        l3: l3(OBJECTS, TIME) },
      { id: "d_drink",    emoji: "🥤", label: "drink",      l3: l3(OBJECTS, TIME) },
      { id: "d_play",     emoji: "🎮", label: "play",       l3: l3(OBJECTS, PEOPLE, PLACES) },
      { id: "d_read",     emoji: "📖", label: "read",       l3: l3(OBJECTS, TIME) },
      { id: "d_watch",    emoji: "📺", label: "watch",      l3: l3(OBJECTS, TIME) },
      { id: "d_give",     emoji: "🤲", label: "give",       l3: l3(OBJECTS, PEOPLE) },
      { id: "d_take",     emoji: "🫳", label: "take",       l3: l3(OBJECTS, PEOPLE) },
      { id: "d_help",     emoji: "🆘", label: "help",       l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "d_stop",     emoji: "✋", label: "stop",       l3: l3(TIME, POLARITY) },
      { id: "d_wait",     emoji: "⏸️", label: "wait",       l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "d_open",     emoji: "🔓", label: "open",       l3: l3(OBJECTS, POLARITY) },
      { id: "d_want",     emoji: "⭐", label: "want",       l3: l3(OBJECTS, PEOPLE, PLACES, TIME) },
      { id: "d_try",      emoji: "💪", label: "try",        l3: l3(OBJECTS, TIME, POLARITY) },
    ],
  },

  // ━━ TALK (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  talk: {
    id: "talk", emoji: "💬", label: "TALK", color: "#0C8599", bg: "#E6FCF5",
    mapTo: "social",
    items: [
      { id: "s_hello",     emoji: "👋", label: "hello",      l3: l3(PEOPLE, TIME) },
      { id: "s_bye",       emoji: "🫡", label: "goodbye",    l3: l3(PEOPLE, TIME) },
      { id: "s_yes",       emoji: "✅", label: "yes",        l3: l3(POLARITY, TIME) },
      { id: "s_no",        emoji: "❌", label: "no",         l3: l3(POLARITY, TIME) },
      { id: "s_please",    emoji: "🙏", label: "please",     l3: l3(OBJECTS, PEOPLE, TIME) },
      { id: "s_thanks",    emoji: "💛", label: "thank you",   l3: l3(PEOPLE, POLARITY) },
      { id: "s_sorry",     emoji: "😔", label: "sorry",       l3: l3(PEOPLE, POLARITY) },
      { id: "s_ok",        emoji: "👌", label: "ok",          l3: l3(TIME, POLARITY) },
      { id: "s_idk",       emoji: "🤷", label: "I don't know", l3: l3(TIME, POLARITY) },
      { id: "s_tell",      emoji: "🗣️", label: "tell",        l3: l3(PEOPLE, OBJECTS) },
      { id: "s_ask",       emoji: "✋", label: "ask",          l3: l3(PEOPLE, OBJECTS) },
      { id: "s_repeat",    emoji: "🔄", label: "repeat",       l3: l3(POLARITY, TIME) },
      { id: "s_agree",     emoji: "🤝", label: "agree",       l3: l3(POLARITY, TIME) },
      { id: "s_disagree",  emoji: "🙅", label: "disagree",    l3: l3(POLARITY, TIME) },
    ],
  },

  // ━━ PLACE (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  place: {
    id: "place", emoji: "📍", label: "PLACE", color: "#7048E8", bg: "#F3F0FF",
    mapTo: "places",
    items: [
      { id: "lc_home",     emoji: "🏠", label: "home",      l3: l3([
          { id: "lc3_kitchen",  emoji: "🍳", label: "kitchen" },
          { id: "lc3_bedroom",  emoji: "🛏️", label: "bedroom" },
          { id: "lc3_bathroom", emoji: "🚿", label: "bathroom" },
          { id: "lc3_living",   emoji: "🛋️", label: "living room" },
          { id: "lc3_garden",   emoji: "🌸", label: "garden" },
        ], TIME, POLARITY),
      },
      { id: "lc_school",   emoji: "🏫", label: "school",    l3: l3([
          { id: "lc3_class",    emoji: "📖", label: "classroom" },
          { id: "lc3_gym",      emoji: "🏋️", label: "gym" },
          { id: "lc3_library",  emoji: "📚", label: "library" },
          { id: "lc3_cafet",    emoji: "🍽️", label: "cafeteria" },
          { id: "lc3_playground",emoji: "🛝", label: "playground" },
        ], TIME, POLARITY),
      },
      { id: "lc_hospital", emoji: "🏥", label: "hospital",  l3: l3([
          { id: "lc3_room",     emoji: "🏨", label: "room" },
          { id: "lc3_clinic",   emoji: "🩺", label: "clinic" },
          { id: "lc3_waiting",  emoji: "⏳", label: "waiting room" },
          { id: "lc3_pharmacy", emoji: "💊", label: "pharmacy" },
        ], TIME, POLARITY),
      },
      { id: "lc_outside",  emoji: "🌳", label: "outside",   l3: l3([
          { id: "lc3_park",     emoji: "🏞️", label: "park" },
          { id: "lc3_street",   emoji: "🛣️", label: "street" },
          { id: "lc3_beach",    emoji: "🏖️", label: "beach" },
          { id: "lc3_pool",     emoji: "🏊", label: "pool" },
          { id: "lc3_field",    emoji: "⚽", label: "field" },
        ], TIME, POLARITY),
      },
      { id: "lc_store",    emoji: "🏪", label: "store",     l3: l3(TIME, POLARITY, OBJECTS) },
      { id: "lc_restau",   emoji: "🍽️", label: "restaurant",l3: l3(TIME, POLARITY) },
      { id: "lc_car",      emoji: "🚗", label: "car",       l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "lc_bus",      emoji: "🚌", label: "bus",       l3: l3(TIME, POLARITY) },
      { id: "lc_bathroom", emoji: "🚻", label: "bathroom",  l3: l3(TIME, POLARITY) },
      { id: "lc_park",     emoji: "🏞️", label: "park",      l3: l3([
          { id: "lc3_swing",    emoji: "🎠", label: "swing" },
          { id: "lc3_slide",    emoji: "🛝", label: "slide" },
          { id: "lc3_bench",    emoji: "🪑", label: "bench" },
          { id: "lc3_sand",     emoji: "⏳", label: "sandbox" },
        ], TIME),
      },
      { id: "lc_here",     emoji: "📍", label: "here",      l3: l3(TIME, POLARITY) },
      { id: "lc_there",    emoji: "👉", label: "there",     l3: l3(TIME, POLARITY) },
      { id: "lc_inside",   emoji: "🏠", label: "inside",    l3: l3(TIME, POLARITY) },
    ],
  },

  // ━━ QUESTION (12 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  question: {
    id: "question", emoji: "❓", label: "QUESTION", color: "#5C940D", bg: "#F4FCE3",
    mapTo: "questions",
    items: [
      { id: "q_what",      emoji: "❓", label: "what",       l3: l3(OBJECTS, PEOPLE, POLARITY) },
      { id: "q_where",     emoji: "📍", label: "where",      l3: l3(PLACES, PEOPLE, TIME) },
      { id: "q_when",      emoji: "🕐", label: "when",       l3: l3(TIME, PEOPLE, POLARITY) },
      { id: "q_who",       emoji: "👤", label: "who",        l3: l3(PEOPLE, PLACES, TIME) },
      { id: "q_why",       emoji: "🤔", label: "why",        l3: l3(POLARITY, TIME, PEOPLE) },
      { id: "q_how",       emoji: "🔧", label: "how",        l3: l3(POLARITY, OBJECTS, TIME) },
      { id: "q_howmuch",   emoji: "💰", label: "how much",   l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "q_howmany",   emoji: "🔢", label: "how many",   l3: l3(OBJECTS, PEOPLE, TIME) },
      { id: "q_canI",      emoji: "🙋", label: "can I",      l3: l3(OBJECTS, PLACES, POLARITY) },
      { id: "q_doYou",     emoji: "👆", label: "do you",     l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "q_isIt",      emoji: "🤷", label: "is it",      l3: l3(PLACES, TIME, POLARITY) },
      { id: "q_whatTime",  emoji: "⏰", label: "what time",  l3: l3(TIME, PLACES, PEOPLE) },
    ],
  },

  // ━━ DESCRIBE (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe: {
    id: "describe", emoji: "🎨", label: "DESCRIBE", color: "#862E9C", bg: "#F8F0FC",
    mapTo: "descriptors",
    items: [
      { id: "dc_big",      emoji: "🐘", label: "big",        l3: l3(OBJECTS, POLARITY) },
      { id: "dc_small",    emoji: "🐜", label: "small",      l3: l3(OBJECTS, POLARITY) },
      { id: "dc_fast",     emoji: "⚡", label: "fast",       l3: l3(POLARITY, TIME) },
      { id: "dc_slow",     emoji: "🐢", label: "slow",       l3: l3(POLARITY, TIME) },
      { id: "dc_hot",      emoji: "🔥", label: "hot",        l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "dc_cold",     emoji: "❄️", label: "cold",       l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "dc_clean",    emoji: "✨", label: "clean",      l3: l3(OBJECTS, PLACES, POLARITY) },
      { id: "dc_dirty",    emoji: "🦠", label: "dirty",      l3: l3(OBJECTS, PLACES, POLARITY) },
      { id: "dc_loud",     emoji: "🔊", label: "loud",       l3: l3(POLARITY, TIME) },
      { id: "dc_quiet",    emoji: "🤫", label: "quiet",      l3: l3(POLARITY, TIME) },
      { id: "dc_new",      emoji: "🆕", label: "new",        l3: l3(OBJECTS, POLARITY) },
      { id: "dc_old",      emoji: "🏚️", label: "old",        l3: l3(OBJECTS, POLARITY) },
      { id: "dc_good",     emoji: "👍", label: "good",       l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "dc_bad",      emoji: "👎", label: "bad",        l3: l3(OBJECTS, POLARITY, TIME) },
    ],
  },
};

/** Returns the hierarchy config for the given L1 category id, or null if not found. */
export function getHierarchy(categoryId) {
  return HIERARCHY[categoryId] ?? null;
}

/** Count total L2 items across all categories. */
export function totalL2Items() {
  return Object.values(HIERARCHY).reduce((n, cat) => n + cat.items.length, 0);
}

/** Count total L3 options across all L2 items. */
export function totalL3Options() {
  return Object.values(HIERARCHY).reduce(
    (n, cat) => n + cat.items.reduce((m, item) => m + (item.l3?.length ?? 0), 0), 0
  );
}
