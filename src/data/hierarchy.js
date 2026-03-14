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
 * Vocabulary principles (v2):
 *  - Every L2 slot earns its place: highest-frequency AAC words first
 *  - L1 labels are verbs/nouns, not abstract concepts — maps to motor patterns
 *  - L3 must meaningfully change the output sentence, not just pad options
 *  - POLARITY (not / very / a little) is the single most powerful L3 modifier
 *    — included in almost every L2 so the user can negate or intensify anything
 *  - Removed low-frequency or duplicated items (e.g. "hot/cold" appear in both
 *    NEED and DESCRIBE — kept only where semantically primary)
 *  - Added high-frequency gaps: "finish", "more", "different", "like", "come",
 *    "show", "choose", "same", "quiet", "space"
 *  - BODY palette extended with chest/ear/nose for medical context
 *  - TIME palette: added "soon", "every day", "in a minute"
 *  - PEOPLE palette: added "nurse", "therapist" for medical/school contexts
 *
 * Rules:
 *   - 8 L1 categories  (feel, need, people, do, talk, place, question, describe)
 *   - 12–16 L2 items per category
 *   - Every L2 has 6–20 L3 options
 *   - Every item has an emoji + base-form English label
 *   - All IDs are unique (prefixed: f_, n_, pe_, d_, s_, lc_, q_, dc_, col_, q3_)
 *
 * Structure:
 *   Level 1 → CategoryGrid   (Feel, Need, People, Do, Talk, Place, Question, Describe)
 *   Level 2 → Core verb/adjective/noun for the domain
 *   Level 3 → Object · action · modifier · time · person · place · detail  (optional)
 */

/**
 * @typedef {"time" | "person" | "place" | "intensity" | "object" | "body" | "color" | "specific-item" | "sub-place" | "action" | "detail"} HierarchyModifierType
 *
 * @typedef {{ id: string, emoji: string, label: string, type?: HierarchyModifierType }} HierarchyOption
 * @typedef {{ id: string, emoji: string, label: string, l3?: HierarchyOption[] }} HierarchyItem
 * @typedef {{ id: string, emoji: string, label: string, color: string, bg: string, mapTo: string, items: HierarchyItem[] }} HierarchyCategory
 */

// ── Shared L3 palettes (reused across categories) ────────────────────────────

function typed(type, items) { return items.map((item) => ({ ...item, type })); }

function pickOptions(options, ids) {
  const index = new Map(options.map((item) => [item.id, item]));
  return ids.map((id) => index.get(id)).filter(Boolean);
}

const TIME = typed("time", [
  { id: "t_now",       emoji: "⚡",  label: "now" },
  { id: "t_soon",      emoji: "🔜",  label: "soon" },          // ★ new — very common in AAC
  { id: "t_later",     emoji: "🕐",  label: "later" },
  { id: "t_today",     emoji: "📅",  label: "today" },
  { id: "t_tomorrow",  emoji: "🌅",  label: "tomorrow" },
  { id: "t_yesterday", emoji: "⏪",  label: "yesterday" },
  { id: "t_morning",   emoji: "🌄",  label: "morning" },
  { id: "t_afternoon", emoji: "🌤️",  label: "afternoon" },
  { id: "t_night",     emoji: "🌙",  label: "night" },
  { id: "t_always",    emoji: "♾️",  label: "always" },
  { id: "t_everyday",  emoji: "🗓️",  label: "every day" },     // ★ new — routine context
  { id: "t_minute",    emoji: "⏱️",  label: "in a minute" },   // ★ new — delay/wait
]);

const PEOPLE = typed("person", [
  { id: "p_mom",        emoji: "👩",   label: "mom" },
  { id: "p_dad",        emoji: "👨",   label: "dad" },
  { id: "p_friend",     emoji: "🤝",   label: "friend" },
  { id: "p_teacher",    emoji: "🧑‍🏫",  label: "teacher" },
  { id: "p_doctor",     emoji: "🧑‍⚕️",  label: "doctor" },
  { id: "p_nurse",      emoji: "💉",   label: "nurse" },        // ★ new — medical context
  { id: "p_therapist",  emoji: "🩺",   label: "therapist" },    // ★ new — school/therapy
  { id: "p_caregiver",  emoji: "💜",   label: "caregiver" },
  { id: "p_brother",    emoji: "👦",   label: "brother" },
  { id: "p_sister",     emoji: "👧",   label: "sister" },
  { id: "p_everyone",   emoji: "🌍",   label: "everyone" },
]);

const PLACES = typed("place", [
  { id: "pl_home",     emoji: "🏠",  label: "home" },
  { id: "pl_school",   emoji: "🏫",  label: "school" },
  { id: "pl_outside",  emoji: "🌳",  label: "outside" },
  { id: "pl_hospital", emoji: "🏥",  label: "hospital" },
  { id: "pl_park",     emoji: "🏞️",  label: "park" },
  { id: "pl_here",     emoji: "📍",  label: "here" },
  { id: "pl_there",    emoji: "👉",  label: "there" },
]);

const POLARITY = typed("intensity", [
  { id: "x_not",      emoji: "🚫",  label: "not" },
  { id: "x_very",     emoji: "💯",  label: "very" },
  { id: "x_little",   emoji: "🤏",  label: "a little" },
  { id: "x_please",   emoji: "🙏",  label: "please" },
  { id: "x_more",     emoji: "➕",  label: "more" },
  { id: "x_less",     emoji: "➖",  label: "less" },
  { id: "x_again",    emoji: "🔄",  label: "again" },
  { id: "x_maybe",    emoji: "🤔",  label: "maybe" },
  { id: "x_done",     emoji: "✅",  label: "done" },            // ★ new — "I'm done" is core AAC
  { id: "x_diff",     emoji: "🔀",  label: "different" },      // ★ new — "I want something different"
]);

const OBJECTS = typed("object", [
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
]);

const BODY = typed("body", [
  { id: "b_head",     emoji: "🤕",  label: "head" },
  { id: "b_stomach",  emoji: "🤢",  label: "stomach" },
  { id: "b_throat",   emoji: "😮‍💨", label: "throat" },
  { id: "b_chest",    emoji: "🫁",  label: "chest" },          // ★ new — pain / breathing
  { id: "b_back",     emoji: "🔙",  label: "back" },
  { id: "b_leg",      emoji: "🦵",  label: "leg" },
  { id: "b_arm",      emoji: "💪",  label: "arm" },
  { id: "b_tooth",    emoji: "🦷",  label: "tooth" },
  { id: "b_ear",      emoji: "👂",  label: "ear" },            // ★ new — infections / noise
  { id: "b_nose",     emoji: "👃",  label: "nose" },           // ★ new — illness / smell
  { id: "b_eyes",     emoji: "👀",  label: "eyes" },
  { id: "b_skin",     emoji: "🩹",  label: "skin" },           // ★ new — rash / itch
]);

const COLOURS = typed("color", [
  { id: "col_red",    emoji: "🔴",  label: "red" },
  { id: "col_blue",   emoji: "🔵",  label: "blue" },
  { id: "col_green",  emoji: "🟢",  label: "green" },
  { id: "col_yellow", emoji: "🟡",  label: "yellow" },
  { id: "col_black",  emoji: "⚫",  label: "black" },
  { id: "col_white",  emoji: "⚪",  label: "white" },
  { id: "col_pink",   emoji: "🩷",  label: "pink" },
  { id: "col_orange", emoji: "🟠",  label: "orange" },
]);

const NUMBERS = typed("number", [
  { id: "num_1",  emoji: "1️⃣",  label: "1" },
  { id: "num_2",  emoji: "2️⃣",  label: "2" },
  { id: "num_3",  emoji: "3️⃣",  label: "3" },
  { id: "num_4",  emoji: "4️⃣",  label: "4" },
  { id: "num_5",  emoji: "5️⃣",  label: "5" },
  { id: "num_6",  emoji: "6️⃣",  label: "6" },
  { id: "num_7",  emoji: "7️⃣",  label: "7" },
  { id: "num_8",  emoji: "8️⃣",  label: "8" },
  { id: "num_9",  emoji: "9️⃣",  label: "9" },
  { id: "num_10", emoji: "🔟",  label: "10" },
]);

// ── Predicate / state palettes (for PEOPLE category) ────────────────────────

const PREDICATES = typed("predicate", [
  { id: "pr_here",    emoji: "📍", label: "is here" },
  { id: "pr_coming",  emoji: "🚶", label: "is coming" },
  { id: "pr_gone",    emoji: "👋", label: "is gone" },
  { id: "pr_wants",   emoji: "🙋", label: "wants" },
  { id: "pr_needs",   emoji: "🆘", label: "needs" },
  { id: "pr_said",    emoji: "🗣️", label: "said" },
  { id: "pr_helps",   emoji: "🤝", label: "helps" },
  { id: "pr_happy",   emoji: "😊", label: "is happy" },
  { id: "pr_angry",   emoji: "😠", label: "is angry" },
  { id: "pr_sick",    emoji: "🤒", label: "is sick" },
  { id: "pr_where",   emoji: "❓", label: "where?" },
  { id: "pr_call",    emoji: "📞", label: "call" },
]);

const SELF_STATES = typed("state", [
  { id: "st_ready",   emoji: "✅", label: "am ready" },
  { id: "st_here",    emoji: "📍", label: "am here" },
  { id: "st_coming",  emoji: "🚶", label: "am coming" },
  { id: "st_leaving", emoji: "🚪", label: "am leaving" },
  { id: "st_hungry",  emoji: "🍽️", label: "am hungry" },
  { id: "st_thirsty", emoji: "💧", label: "am thirsty" },
  { id: "st_tired",   emoji: "😴", label: "am tired" },
  { id: "st_ok",      emoji: "👌", label: "am OK" },
  { id: "st_notok",   emoji: "❌", label: "am not OK" },
  { id: "st_busy",    emoji: "📵", label: "am busy" },
  { id: "st_waiting", emoji: "⏳", label: "am waiting" },
  { id: "st_lost",    emoji: "😰", label: "am lost" },
]);

// ── Category-specific L3 sets (named so L2 definitions stay readable) ───────

const FOOD_CHOICES = typed("specific-item", [
  { id: "n3_apple",  emoji: "🍎", label: "apple" },
  { id: "n3_bread",  emoji: "🍞", label: "bread" },
  { id: "n3_rice",   emoji: "🍚", label: "rice" },
  { id: "n3_pasta",  emoji: "🍝", label: "pasta" },
  { id: "n3_soup",   emoji: "🥣", label: "soup" },
  { id: "n3_snack",  emoji: "🍪", label: "snack" },
  { id: "n3_fruit",  emoji: "🍇", label: "fruit" },
  { id: "n3_meat",   emoji: "🍗", label: "meat" },
]);

const DRINK_CHOICES = typed("specific-item", [
  { id: "n3_juice",  emoji: "🧃", label: "juice" },
  { id: "n3_milk",   emoji: "🥛", label: "milk" },
  { id: "n3_tea",    emoji: "🍵", label: "tea" },
  { id: "n3_coffee", emoji: "☕", label: "coffee" },
]);

const HOME_AREAS = typed("sub-place", [
  { id: "lc3_kitchen",  emoji: "🍳", label: "kitchen" },
  { id: "lc3_bedroom",  emoji: "🛏️", label: "bedroom" },
  { id: "lc3_bathroom", emoji: "🚿", label: "bathroom" },
  { id: "lc3_living",   emoji: "🛋️", label: "living room" },
  { id: "lc3_garden",   emoji: "🌸", label: "garden" },
]);

const SCHOOL_AREAS = typed("sub-place", [
  { id: "lc3_class",      emoji: "📖", label: "classroom" },
  { id: "lc3_gym",        emoji: "🏋️", label: "gym" },
  { id: "lc3_library",    emoji: "📚", label: "library" },
  { id: "lc3_cafet",      emoji: "🍽️", label: "cafeteria" },
  { id: "lc3_playground", emoji: "🛝", label: "playground" },
  { id: "lc3_therapy",    emoji: "🩺", label: "therapy room" },
]);

const HOSPITAL_AREAS = typed("sub-place", [
  { id: "lc3_room",     emoji: "🏨", label: "room" },
  { id: "lc3_clinic",   emoji: "🩺", label: "clinic" },
  { id: "lc3_waiting",  emoji: "⏳", label: "waiting room" },
  { id: "lc3_pharmacy", emoji: "💊", label: "pharmacy" },
  { id: "lc3_xray",     emoji: "🩻", label: "x-ray" },
]);

const OUTDOOR_AREAS = typed("sub-place", [
  { id: "lc3_park",   emoji: "🏞️", label: "park" },
  { id: "lc3_street", emoji: "🛣️", label: "street" },
  { id: "lc3_beach",  emoji: "🏖️", label: "beach" },
  { id: "lc3_pool",   emoji: "🏊", label: "pool" },
  { id: "lc3_field",  emoji: "⚽", label: "field" },
]);

const STORE_TYPES = typed("sub-place", [
  { id: "lc3_supermarket", emoji: "🛒", label: "supermarket" },
  { id: "lc3_pharmacy2",   emoji: "💊", label: "pharmacy" },
  { id: "lc3_bakery",      emoji: "🥖", label: "bakery" },
]);

const CAR_SPOTS = typed("sub-place", [
  { id: "lc3_seat",    emoji: "💺", label: "seat" },
  { id: "lc3_window2", emoji: "🪟", label: "window" },
]);

const PARK_SPOTS = typed("sub-place", [
  { id: "lc3_swing", emoji: "🎠", label: "swing" },
  { id: "lc3_slide", emoji: "🛝", label: "slide" },
  { id: "lc3_bench", emoji: "🪑", label: "bench" },
  { id: "lc3_sand",  emoji: "⏳", label: "sandbox" },
]);

const QUESTION_OBJECTS = pickOptions(OBJECTS, [
  "o_food",
  "o_water",
  "o_phone",
  "o_book",
  "o_medicine",
  "o_tv",
  "o_homework",
  "o_toy",
]);

const QUESTION_PEOPLE = pickOptions(PEOPLE, [
  "p_mom",
  "p_dad",
  "p_friend",
  "p_teacher",
  "p_doctor",
  "p_nurse",
]);

const QUESTION_PLACES = pickOptions(PLACES, [
  "pl_home",
  "pl_school",
  "pl_hospital",
  "pl_park",
  "pl_here",
  "pl_there",
]);

const QUESTION_POLARITY = pickOptions(POLARITY, [
  "x_not",
  "x_more",
  "x_less",
  "x_diff",
]);

const QUESTION_WHAT_TOPICS = typed("detail", [
  { id: "q3_this",      emoji: "👉", label: "this" },
  { id: "q3_that",      emoji: "👈", label: "that" },
  { id: "q3_happened",  emoji: "💥", label: "happened" },
  { id: "q3_wrong",     emoji: "⚠️", label: "wrong" },
  { id: "q3_forlunch",  emoji: "🍽️", label: "for lunch" },
  { id: "q3_fordinner", emoji: "🍝", label: "for dinner" },
  { id: "q3_next",      emoji: "⏭️", label: "next" },
  { id: "q3_name",      emoji: "🏷️", label: "your name" },
]);

const QUESTION_HOW_TOPICS = typed("action", [
  { id: "q3_do",       emoji: "👉", label: "do this" },
  { id: "q3_say",      emoji: "🗣️", label: "say it" },
  { id: "q3_spell",    emoji: "🔤", label: "spell it" },
  { id: "q3_use",      emoji: "🛠️", label: "use it" },
  { id: "q3_getthere", emoji: "📍", label: "get there" },
  { id: "q3_feel",     emoji: "❤️", label: "you feel" },
  { id: "q3_fix",      emoji: "🔧", label: "fix it" },
  { id: "q3_open",     emoji: "🚪", label: "open it" },
]);

const QUESTION_ACTIONS = typed("action", [
  { id: "d_go",      emoji: "🚶", label: "go" },
  { id: "d_come",    emoji: "🫴", label: "come" },
  { id: "d_help",    emoji: "🆘", label: "help" },
  { id: "d_show",    emoji: "👁️", label: "show" },
  { id: "s_repeat",  emoji: "🔄", label: "repeat" },
  { id: "s_wait",    emoji: "⏸️", label: "wait" },
  { id: "s_tell",    emoji: "🗣️", label: "tell" },
  { id: "d_stop",    emoji: "✋", label: "stop" },
]);

const WHEN_CONTEXT = typed("detail", [
  { id: "q3_lunch",    emoji: "🍽️", label: "lunch" },
  { id: "q3_gohome",   emoji: "🏠", label: "go home" },
  { id: "q3_gobed",    emoji: "🛏️", label: "bedtime" },
  { id: "q3_doctor2",  emoji: "🩺", label: "the doctor" },
  { id: "q3_recess",   emoji: "🛝", label: "recess" },
  { id: "q3_over",     emoji: "🏁", label: "is this over" },
  { id: "q3_start",    emoji: "▶️", label: "does it start" },
]);

const WHO_CONTEXT = typed("detail", [
  { id: "q3_didthis",  emoji: "👉", label: "did this" },
  { id: "q3_talking",  emoji: "🗣️", label: "is talking" },
  { id: "q3_iscoming", emoji: "🚶", label: "is coming" },
  { id: "q3_isthat",   emoji: "👈", label: "is that" },
  { id: "q3_canhelp",  emoji: "🆘", label: "can help" },
  { id: "q3_isitfor",  emoji: "❓", label: "is it for" },
]);

const WHY_CONTEXT = typed("detail", [
  { id: "q3_whynot",    emoji: "🚫", label: "not" },
  { id: "q3_cantI",     emoji: "❌", label: "can't I" },
  { id: "q3_whyangry",  emoji: "😠", label: "angry" },
  { id: "q3_whycrying", emoji: "😢", label: "crying" },
  { id: "q3_whyleave",  emoji: "🚪", label: "leaving" },
  { id: "q3_whyhere",   emoji: "📍", label: "here" },
]);

const CAN_I_ACTIONS = typed("action", [
  { id: "q3_cigo",     emoji: "🚶", label: "go" },
  { id: "q3_cihave",   emoji: "🤲", label: "have" },
  { id: "q3_ciplay",   emoji: "🎮", label: "play" },
  { id: "q3_cieat",    emoji: "🍴", label: "eat" },
  { id: "q3_ciwatch",  emoji: "📺", label: "watch" },
  { id: "q3_cihelp",   emoji: "🆘", label: "help" },
  { id: "q3_cidrink",  emoji: "🥤", label: "drink" },
  { id: "q3_cisit",    emoji: "💺", label: "sit here" },
]);

const CAN_YOU_ACTIONS = typed("action", [
  { id: "q3_cyhelp",   emoji: "🆘", label: "help me" },
  { id: "q3_cycome",   emoji: "🫴", label: "come" },
  { id: "q3_cyshow",   emoji: "👁️", label: "show me" },
  { id: "q3_cytell",   emoji: "🗣️", label: "tell me" },
  { id: "q3_cygive",   emoji: "🤲", label: "give me" },
  { id: "q3_cyrepeat", emoji: "🔄", label: "repeat" },
  { id: "q3_cyopen",   emoji: "🚪", label: "open" },
  { id: "q3_cywait",   emoji: "⏸️", label: "wait" },
]);

const QUESTION_FEELINGS = typed("detail", [
  { id: "f_sad",       emoji: "😢", label: "sad" },
  { id: "f_angry",     emoji: "😠", label: "angry" },
  { id: "f_hurt",      emoji: "🤕", label: "hurt" },
  { id: "f_sick",      emoji: "🤒", label: "sick" },
  { id: "f_confused",  emoji: "😕", label: "confused" },
]);

/** Helper: merge shared palettes with category-specific extras. */
function l3(...groups) { return groups.flat(); }

// ── HIERARCHY ─────────────────────────────────────────────────────────────────

/** @type {Record<string, HierarchyCategory>} */

export const HIERARCHY = {

  // ━━ FEEL (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Empathy-driven reorder (v3):
  //  - TOP 4: pain/illness/fear first — when a non-verbal user feels sick,
  //    hurt, or scared, they cannot afford 10 seconds of scanning
  //  - MID: daily high-frequency emotions (happy/sad/angry/tired)
  //  - "frustrated" replaces "embarrassed": frustration is THE most frequent
  //    emotion for AAC users (communication breakdowns, waiting, being
  //    misunderstood). "Embarrassed" is low daily frequency.
  //  - "calm" kept as both a self-report and a request target
  //  - Positive emotions grouped last — they are important but less urgent
  // ─────────────────────────────────────────────────────────────────────────
  feel: {
    id: "feel", emoji: "❤️", label: "FEEL", color: "#E03131", bg: "#FFF5F5",
    mapTo: "feelings",
    items: [
      // ── Urgent / medical (need immediate attention) ──
      { id: "f_hurt",       emoji: "🤕", label: "hurt",        l3: l3(BODY, POLARITY, TIME) },
      { id: "f_sick",       emoji: "🤒", label: "sick",        l3: l3(BODY, TIME, POLARITY) },
      { id: "f_scared",     emoji: "😨", label: "scared",      l3: l3(TIME, POLARITY, PLACES) },
      // ── High-frequency daily emotions ──
      { id: "f_sad",        emoji: "😢", label: "sad",         l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_angry",      emoji: "😠", label: "angry",       l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_tired",      emoji: "😴", label: "tired",       l3: l3(TIME, POLARITY) },
      { id: "f_frustrated", emoji: "😤", label: "frustrated",  l3: l3(TIME, POLARITY, PEOPLE) }, // ★ replaces "embarrassed"
      { id: "f_confused",   emoji: "😕", label: "confused",    l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_nervous",    emoji: "😰", label: "nervous",     l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "f_bored",      emoji: "😑", label: "bored",       l3: l3(TIME, POLARITY) },
      { id: "f_lonely",     emoji: "😞", label: "lonely",      l3: l3(TIME, POLARITY, PEOPLE) },
      // ── Positive & regulation ──
      { id: "f_happy",      emoji: "😊", label: "happy",       l3: l3(TIME, POLARITY) },
      { id: "f_excited",    emoji: "🤩", label: "excited",     l3: l3(TIME, POLARITY) },
      { id: "f_calm",       emoji: "😌", label: "calm",        l3: l3(TIME, POLARITY) },
    ],
  },

  // ━━ NEED (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Empathy-driven reorder (v3):
  //  - TOP 4 (urgency): toilet + help promoted — a non-verbal person
  //    who needs the bathroom or is in trouble cannot wait while scanning
  //    past food and drink items. Water/food remain top for frequency.
  //  - MID: medicine, sleep, rest, hug — daily care needs
  //  - BOT: sensory/environment needs (quiet, space, change, clean, break)
  //  - "change" (diaper/clothes/position) is critical for care contexts
  //  - "quiet" and "space" address sensory needs common in neurodiverse users
  // ─────────────────────────────────────────────────────────────────────────
  need: {
    id: "need", emoji: "🍎", label: "NEED", color: "#2F9E44", bg: "#EBFBEE",
    mapTo: "needs",
    items: [
      // ── Frequent + urgent (top of grid, always visible) ──
      { id: "n_water",    emoji: "💧", label: "water",    l3: l3(TIME, POLARITY) },
      { id: "n_food",     emoji: "🍎", label: "food",     l3: l3(FOOD_CHOICES, NUMBERS, POLARITY) },
      { id: "n_toilet",   emoji: "🚻", label: "toilet",   l3: l3(TIME, POLARITY) },           // ★ promoted from #4 → #3
      { id: "n_help",     emoji: "🆘", label: "help",      l3: l3(PEOPLE, TIME, POLARITY) },   // ★ promoted from #8 → #4
      { id: "n_drink",    emoji: "🥤", label: "drink",    l3: l3(DRINK_CHOICES, NUMBERS, POLARITY) },
      { id: "n_medicine", emoji: "💊", label: "medicine",  l3: l3(BODY, TIME, POLARITY) },
      // ── Daily care needs ──
      { id: "n_sleep",    emoji: "💤", label: "sleep",     l3: l3(TIME, POLARITY) },
      { id: "n_rest",     emoji: "🛋️", label: "rest",      l3: l3(TIME, POLARITY) },
      { id: "n_hug",      emoji: "🤗", label: "hug",       l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "n_change",   emoji: "🔄", label: "change",    l3: l3(OBJECTS, BODY, TIME) },      // ★ promoted
      // ── Sensory / environment needs ──
      { id: "n_quiet",    emoji: "🤫", label: "quiet",     l3: l3(TIME, POLARITY) },
      { id: "n_space",    emoji: "🫧", label: "space",     l3: l3(TIME, POLARITY, PEOPLE) },
      { id: "n_clean",    emoji: "🧼", label: "clean",     l3: l3(BODY, TIME, POLARITY) },
      { id: "n_break",    emoji: "⏸️", label: "break",     l3: l3(TIME, POLARITY, PLACES) },
    ],
  },

  // ━━ PEOPLE (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Restructured (v4) for sentence completion:
  //  - Pronouns (I/you/we/they) get SELF_STATES so every tap produces a real
  //    sentence: "I am ready", "I am here", "You are hungry", "We are leaving"
  //  - Named people get PREDICATES — actions/states about them:
  //    "Mom is here", "Dad wants", "Where friend?", "Call nurse"
  //  - This eliminates the old broken output ("I now!", "mom later")
  // ─────────────────────────────────────────────────────────────────────────
  people: {
    id: "people", emoji: "👥", label: "PEOPLE", color: "#1971C2", bg: "#E7F5FF",
    mapTo: "people",
    items: [
      // ── Pronouns (self-states — "I am ready", "You are tired") ──
      { id: "pe_i",          emoji: "👤",   label: "I",          l3: l3(SELF_STATES) },
      { id: "pe_you",        emoji: "👆",   label: "you",        l3: l3(SELF_STATES) },
      { id: "pe_we",         emoji: "👫",   label: "we",         l3: l3(SELF_STATES) },
      { id: "pe_they",       emoji: "👥",   label: "they",       l3: l3(SELF_STATES) },
      // ── Named people (predicates — "Mom is here", "Dad wants") ──
      { id: "pe_mom",        emoji: "👩",   label: "mom",        l3: l3(PREDICATES, TIME) },
      { id: "pe_dad",        emoji: "👨",   label: "dad",        l3: l3(PREDICATES, TIME) },
      { id: "pe_brother",    emoji: "👦",   label: "brother",    l3: l3(PREDICATES, TIME) },
      { id: "pe_sister",     emoji: "👧",   label: "sister",     l3: l3(PREDICATES, TIME) },
      { id: "pe_grandma",    emoji: "👵",   label: "grandma",    l3: l3(PREDICATES, TIME) },
      { id: "pe_grandpa",    emoji: "👴",   label: "grandpa",    l3: l3(PREDICATES, TIME) },
      { id: "pe_friend",     emoji: "🤝",   label: "friend",     l3: l3(PREDICATES, TIME) },
      { id: "pe_teacher",    emoji: "🧑‍🏫",  label: "teacher",    l3: l3(PREDICATES, TIME) },
      { id: "pe_nurse",      emoji: "💉",   label: "nurse",      l3: l3(PREDICATES, TIME) },
      { id: "pe_therapist",  emoji: "🩺",   label: "therapist",  l3: l3(PREDICATES, TIME) },
    ],
  },

  // ━━ DO (15 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Restructured (v4):
  //  - Added "open", "make", "read" — high-frequency daily verbs
  //  - "open" covers door/window/bag/light contexts
  //  - "make" covers crafts, requests ("make it stop", "make food")
  //  - "read" restored — "read book", "read to me" is a core school/therapy verb
  //  - Reordered: agency & safety verbs first (stop/help), then daily
  //    activity verbs, then social/preference verbs
  //  - L3 for "go" puts PLACES first (most natural: "go home", "go school")
  // ─────────────────────────────────────────────────────────────────────────
  do: {
    id: "do", emoji: "👉", label: "DO", color: "#E8590C", bg: "#FFF4E6",
    mapTo: "actions",
    items: [
      // ── Agency & safety verbs (most urgent) ──
      { id: "d_stop",     emoji: "✋", label: "stop",     l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "d_help",     emoji: "🆘", label: "help",     l3: l3(PEOPLE, TIME, POLARITY) },
      { id: "d_go",       emoji: "🚶", label: "go",       l3: l3(PLACES, PEOPLE, TIME) },
      { id: "d_come",     emoji: "🫴", label: "come",     l3: l3(PLACES, PEOPLE, TIME) },
      { id: "d_give",     emoji: "🤲", label: "give",     l3: l3(OBJECTS, PEOPLE, POLARITY) },
      { id: "d_turn",     emoji: "🔄", label: "turn",     l3: l3(PEOPLE, TIME, POLARITY) },
      // ── Daily activity verbs ──
      { id: "d_eat",      emoji: "🍴", label: "eat",      l3: l3(FOOD_CHOICES, POLARITY, TIME) },
      { id: "d_drink",    emoji: "🥤", label: "drink",    l3: l3(DRINK_CHOICES, POLARITY, TIME) },
      { id: "d_play",     emoji: "🎮", label: "play",     l3: l3(OBJECTS, PEOPLE, PLACES) },
      { id: "d_watch",    emoji: "📺", label: "watch",    l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "d_open",     emoji: "🚪", label: "open",     l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "d_make",     emoji: "🛠️", label: "make",     l3: l3(OBJECTS, FOOD_CHOICES, POLARITY) },
      { id: "d_read",     emoji: "📖", label: "read",     l3: l3(OBJECTS, PEOPLE, TIME) },
      // ── Social / preference verbs ──
      { id: "d_like",     emoji: "👍", label: "like",     l3: l3(OBJECTS, FOOD_CHOICES, PEOPLE, POLARITY) },
      { id: "d_finish",   emoji: "🏁", label: "finish",   l3: l3(OBJECTS, TIME, POLARITY) },
    ],
  },

  // ━━ TALK (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Changes:
  //  - "agree" / "disagree" removed — rare as L2 taps; covered by yes/no + POLARITY
  //  - Added "wait" — "please wait", "wait for me" — extremely high frequency
  //  - Added "louder" / "quieter" implicit via "more"/"less" in POLARITY, so:
  //  - Added "understand" — "I don't understand", "do you understand?"
  //  - Kept repair-oriented verbs like "tell", "ask", and "repeat" for conversation support
  //  - L3 for "yes"/"no" includes TIME ("not yet", "yes now") and POLARITY
  // ─────────────────────────────────────────────────────────────────────────
  talk: {
    id: "talk", emoji: "💬", label: "TALK", color: "#0C8599", bg: "#E6FCF5",
    mapTo: "social",
    items: [
      { id: "s_hello",      emoji: "👋", label: "hello",       l3: l3(PEOPLE) },
      { id: "s_bye",        emoji: "🫡", label: "goodbye",     l3: l3(PEOPLE) },
      { id: "s_yes",        emoji: "✅", label: "yes",         l3: l3(POLARITY, TIME) },
      { id: "s_no",         emoji: "❌", label: "no",          l3: l3(POLARITY, TIME) },
      { id: "s_please",     emoji: "🙏", label: "please",      l3: l3(OBJECTS, PEOPLE, TIME) },
      { id: "s_thanks",     emoji: "💛", label: "thank you",   l3: l3(PEOPLE, POLARITY) },
      { id: "s_sorry",      emoji: "😔", label: "sorry",       l3: l3(PEOPLE, POLARITY) },
      { id: "s_ok",         emoji: "👌", label: "ok",          l3: l3(TIME, POLARITY) },
      { id: "s_idk",        emoji: "🤷", label: "I don't know", l3: l3(POLARITY, OBJECTS, PEOPLE) },  // what/who you don't know about
      { id: "s_wait",       emoji: "⏸️", label: "wait",        l3: l3(PEOPLE, TIME, POLARITY) }, // ★ new
      { id: "s_understand", emoji: "💡", label: "understand",  l3: l3(POLARITY, PEOPLE, OBJECTS) }, // OBJECTS lets user specify WHAT: "don't understand the homework"
      { id: "s_tell",       emoji: "🗣️", label: "tell",        l3: l3(PEOPLE, OBJECTS, TIME) },
      { id: "s_ask",        emoji: "✋", label: "ask",          l3: l3(PEOPLE, OBJECTS, TIME) },
      { id: "s_repeat",     emoji: "🔄", label: "repeat",      l3: l3(POLARITY, TIME) },
    ],
  },

  // ━━ PLACE (13 items) — trimmed 1 duplicate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Changes:
  //  - "inside" removed — covered by "home" L3 and low standalone frequency
  //  - "here" / "there" kept — deictic pointing is crucial
  //  - Added "therapy room" as L3 under school (not a separate L2)
  //  - "store" L3 gains specific shop types
  //  - "car" L3 adds "seat" and "window" for journey communication
  // ─────────────────────────────────────────────────────────────────────────
  place: {
    id: "place", emoji: "📍", label: "PLACE", color: "#7048E8", bg: "#F3F0FF",
    mapTo: "places",
    items: [
      { id: "lc_home",     emoji: "🏠", label: "home",       l3: l3(HOME_AREAS, TIME, POLARITY) },
      { id: "lc_school",   emoji: "🏫", label: "school",     l3: l3(SCHOOL_AREAS, TIME, POLARITY) },
      { id: "lc_hospital", emoji: "🏥", label: "hospital",   l3: l3(HOSPITAL_AREAS, TIME, POLARITY) },
      { id: "lc_outside",  emoji: "🌳", label: "outside",    l3: l3(OUTDOOR_AREAS, TIME, POLARITY) },
      { id: "lc_store",    emoji: "🏪", label: "store",      l3: l3(STORE_TYPES, TIME, POLARITY, OBJECTS) },
      { id: "lc_restau",   emoji: "🍽️", label: "restaurant", l3: l3(TIME, POLARITY) },
      { id: "lc_car",      emoji: "🚗", label: "car",         l3: l3(CAR_SPOTS, TIME, POLARITY, PEOPLE) },
      { id: "lc_bus",      emoji: "🚌", label: "bus",         l3: l3(TIME, POLARITY) },
      { id: "lc_bathroom", emoji: "🚻", label: "bathroom",    l3: l3(TIME, POLARITY) },
      { id: "lc_park",     emoji: "🏞️", label: "park",        l3: l3(PARK_SPOTS, TIME) },
      { id: "lc_here",     emoji: "📍", label: "here",        l3: l3(TIME, POLARITY) },
      { id: "lc_there",    emoji: "👉", label: "there",       l3: l3(TIME, POLARITY) },
      { id: "lc_bedroom",  emoji: "🛏️", label: "bedroom",     l3: l3(TIME, POLARITY) },       // ★ replaces "inside"
    ],
  },

  // ━━ QUESTION (12 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Restructured (v4) for real question completion:
  //  - Each L2 question word now has context-specific L3s that form
  //    complete, natural questions in 2-3 taps
  //  - "what" → "What is this?", "What happened?", "What's for lunch?"
  //  - "where" → "Where is mom?", "Where is the bathroom?"
  //  - "when" → "When is lunch?", "When do we go home?"
  //  - "who" → "Who did this?", "Who is coming?", "Who can help?"
  //  - "why" → "Why not?", "Why can't I?", "Why are you angry?"
  //  - "can I" → "Can I go?", "Can I have?", "Can I play?"
  //  - "can you" → "Can you help me?", "Can you show me?"
  //  - "do you have" NEW → "Do you have water?", "Do you have my phone?"
  //  - "is it" NEW → "Is it ready?", "Is it time?"
  // ─────────────────────────────────────────────────────────────────────────
  question: {
    id: "question", emoji: "❓", label: "QUESTION", color: "#5C940D", bg: "#F4FCE3",
    mapTo: "questions",
    items: [
      { id: "q_what",      emoji: "❓", label: "what",        l3: l3(QUESTION_WHAT_TOPICS, QUESTION_OBJECTS) },
      { id: "q_where",     emoji: "📍", label: "where",       l3: l3(QUESTION_PEOPLE, QUESTION_OBJECTS, QUESTION_PLACES) },
      { id: "q_when",      emoji: "🕐", label: "when",        l3: l3(WHEN_CONTEXT, QUESTION_PLACES) },
      { id: "q_who",       emoji: "👤", label: "who",         l3: l3(WHO_CONTEXT, QUESTION_PEOPLE) },
      { id: "q_why",       emoji: "🤔", label: "why",         l3: l3(WHY_CONTEXT, QUESTION_FEELINGS) },
      { id: "q_how",       emoji: "🔧", label: "how",         l3: l3(QUESTION_HOW_TOPICS) },
      { id: "q_howmuch",   emoji: "💰", label: "how much",    l3: l3(NUMBERS, QUESTION_OBJECTS, QUESTION_POLARITY) },
      { id: "q_howmany",   emoji: "🔢", label: "how many",    l3: l3(NUMBERS, QUESTION_OBJECTS, QUESTION_PEOPLE) },
      { id: "q_canI",      emoji: "🙋", label: "can I",       l3: l3(CAN_I_ACTIONS, QUESTION_PLACES) },
      { id: "q_canYou",    emoji: "🤝", label: "can you",     l3: l3(CAN_YOU_ACTIONS, QUESTION_OBJECTS) },
      { id: "q_doYouHave", emoji: "🤲", label: "do you have", l3: l3(QUESTION_OBJECTS, FOOD_CHOICES, DRINK_CHOICES) },
      { id: "q_isIt",      emoji: "🔍", label: "is it",       l3: l3(QUESTION_WHAT_TOPICS, QUESTION_POLARITY, TIME) },
    ],
  },

  // ━━ DESCRIBE (14 items) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // Restructured (v4):
  //  - Removed "color" and "number" meta-categories (just redirected to
  //    palette sub-grids with no sentence value; colors/numbers appear
  //    as L3 under objects where they actually modify something)
  //  - Added "new" and "old" — very common daily descriptors
  //    ("new shoes", "old phone", "that's new")
  //  - Added "nice" — positive evaluator used constantly in AAC
  //    ("nice job", "that's nice", "nice person")
  //  - Optimal 14 items = 2 rows × 7 or 3-col layout
  // ─────────────────────────────────────────────────────────────────────────
  describe: {
    id: "describe", emoji: "🎨", label: "DESCRIBE", color: "#862E9C", bg: "#F8F0FC",
    mapTo: "descriptors",
    items: [
      // ── Most frequent daily judgments ──
      { id: "dc_good",      emoji: "👍", label: "good",      l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "dc_bad",       emoji: "👎", label: "bad",       l3: l3(OBJECTS, POLARITY, TIME) },
      { id: "dc_ready",     emoji: "✅", label: "ready",     l3: l3(POLARITY, TIME, PEOPLE) },
      { id: "dc_nice",      emoji: "😊", label: "nice",      l3: l3(OBJECTS, PEOPLE, POLARITY) },
      // ── Physical properties ──
      { id: "dc_big",       emoji: "🐘", label: "big",       l3: l3(OBJECTS, POLARITY) },
      { id: "dc_small",     emoji: "🐜", label: "small",     l3: l3(OBJECTS, POLARITY) },
      { id: "dc_hot",       emoji: "🔥", label: "hot",       l3: l3(OBJECTS, BODY, POLARITY) },
      { id: "dc_cold",      emoji: "❄️", label: "cold",      l3: l3(OBJECTS, BODY, POLARITY) },
      { id: "dc_new",       emoji: "✨", label: "new",       l3: l3(OBJECTS, POLARITY) },
      { id: "dc_old",       emoji: "📦", label: "old",       l3: l3(OBJECTS, POLARITY) },
      // ── Sensory ──
      { id: "dc_loud",      emoji: "🔊", label: "loud",      l3: l3(POLARITY, TIME, PLACES) },
      { id: "dc_quiet",     emoji: "🤫", label: "quiet",     l3: l3(POLARITY, TIME, PLACES) },
      // ── State ──
      { id: "dc_broken",    emoji: "🔧", label: "broken",    l3: l3(OBJECTS, PLACES, POLARITY) },
      { id: "dc_same",      emoji: "🔁", label: "the same",  l3: l3(OBJECTS, POLARITY) },
    ],
  },
};

const MODIFIER_TYPE_BY_PREFIX = [
  ["t_", "time"],
  ["p_", "person"],
  ["pl_", "place"],
  ["x_", "intensity"],
  ["o_", "object"],
  ["b_", "body"],
  ["col_", "color"],
  ["num_", "number"],
  ["n3_", "specific-item"],
  ["lc3_", "sub-place"],
  ["pr_", "predicate"],
  ["st_", "state"],
  ["q3_", "detail"],
];

/**
 * Resolve the semantic role for an L3 modifier.
 * Prefers explicit modifier metadata and falls back to legacy id prefixes.
 *
 * @param {HierarchyOption | string | null | undefined} modifierOrId
 * @returns {HierarchyModifierType}
 */
export function getHierarchyModifierType(modifierOrId) {
  if (!modifierOrId) return "detail";
  if (typeof modifierOrId === "object" && modifierOrId.type) return modifierOrId.type;

  const id = typeof modifierOrId === "string" ? modifierOrId : modifierOrId.id;
  const match = MODIFIER_TYPE_BY_PREFIX.find(([prefix]) => id?.startsWith(prefix));
  return match?.[1] ?? "detail";
}

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
