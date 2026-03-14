/**
 * boards/index.js — Contextual board registry for SpeakEasy AAC.
 *
 * Each board defines:
 *   id          — unique identifier
 *   emoji       — visual icon for the selector
 *   label       — English display name (translated via UI_STRINGS)
 *   categories  — ordered list of HOME_CATEGORIES to show on this board
 *   priorityL2  — per-category L2 item IDs to promote to the top of the grid
 *
 * Architecture:
 *   • The engine is NEVER modified — boards only control which L1 categories
 *     appear and in what order, and which L2 items are promoted.
 *   • The existing HIERARCHY data (L2/L3) is reused as-is.
 *   • `priorityL2` reorders L2 items within a category — promoted items
 *     appear first, the rest follow in their default order.
 *   • Adding a new board = adding one object to BOARDS. No engine changes.
 *
 * The "generic" board shows the default full set (same as before this feature).
 */

import { getHierarchy } from "../hierarchy.js";

// ── Board definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} BoardDef
 * @property {string}   id         — unique board identifier
 * @property {string}   emoji      — icon for the selector
 * @property {string}   label      — English display name
 * @property {string[]} categories — ordered L1 category ids to show
 * @property {Object<string, string[]>} [priorityL2] — per-category L2 ids to promote
 */

const BOARDS = [
  {
    id: "generic",
    emoji: "🌐",
    label: "Generic",
    categories: ["feel", "need", "people", "do", "talk", "place", "question", "describe", "quick", "favorites"],
    // No priorityL2 — default order
  },
  {
    id: "home",
    emoji: "🏠",
    label: "Home",
    categories: ["feel", "need", "do", "people", "talk", "place", "describe", "quick", "favorites"],
    priorityL2: {
      feel:     ["f_happy", "f_tired", "f_bored", "f_hungry", "f_sad"],
      need:     ["n_food", "n_water", "n_sleep", "n_rest", "n_clean", "n_quiet"],
      do:       ["d_eat", "d_drink", "d_play", "d_watch", "d_open", "d_make"],
      people:   ["pe_mom", "pe_dad", "pe_brother", "pe_sister", "pe_grandma"],
      talk:     ["s_hello", "s_bye", "s_please", "s_thanks", "s_ok"],
      place:    ["lc_home", "lc_bedroom", "lc_bathroom", "lc_outside"],
      describe: ["dc_good", "dc_hot", "dc_cold", "dc_loud", "dc_quiet"],
    },
  },
  {
    id: "school",
    emoji: "🏫",
    label: "School",
    categories: ["do", "talk", "need", "feel", "people", "question", "describe", "quick", "favorites"],
    priorityL2: {
      feel:     ["f_confused", "f_frustrated", "f_bored", "f_nervous", "f_tired"],
      need:     ["n_help", "n_toilet", "n_break", "n_quiet", "n_water"],
      do:       ["d_read", "d_help", "d_finish", "d_give", "d_play", "d_make"],
      people:   ["pe_teacher", "pe_friend", "pe_i", "pe_you", "pe_we"],
      talk:     ["s_ask", "s_tell", "s_understand", "s_please", "s_sorry", "s_idk"],
      question: ["q_what", "q_how", "q_canI", "q_when", "q_where"],
      place:    ["lc_school", "lc_bathroom", "lc_outside", "lc_here"],
    },
  },
  {
    id: "doctor",
    emoji: "🏥",
    label: "Doctor",
    categories: ["feel", "need", "people", "do", "question", "place", "talk", "quick", "favorites"],
    priorityL2: {
      feel:     ["f_hurt", "f_sick", "f_scared", "f_nervous", "f_tired"],
      need:     ["n_medicine", "n_help", "n_toilet", "n_water", "n_rest"],
      do:       ["d_stop", "d_help", "d_give", "d_go"],
      people:   ["pe_doctor", "pe_nurse", "pe_mom", "pe_dad", "pe_therapist"],
      talk:     ["s_yes", "s_no", "s_please", "s_thanks", "s_wait"],
      question: ["q_what", "q_when", "q_how", "q_why", "q_isIt"],
      place:    ["lc_hospital", "lc_bathroom", "lc_here"],
      describe: ["dc_bad", "dc_hot", "dc_cold", "dc_big", "dc_small"],
    },
  },
  {
    id: "restaurant",
    emoji: "🍽️",
    label: "Restaurant",
    categories: ["need", "do", "talk", "feel", "question", "describe", "people", "quick", "favorites"],
    priorityL2: {
      need:     ["n_food", "n_drink", "n_water", "n_toilet", "n_help"],
      do:       ["d_eat", "d_drink", "d_like", "d_give", "d_go"],
      talk:     ["s_please", "s_thanks", "s_yes", "s_no", "s_wait"],
      question: ["q_what", "q_howmuch", "q_canI", "q_doYouHave", "q_where"],
      describe: ["dc_good", "dc_hot", "dc_cold", "dc_big", "dc_small"],
      feel:     ["f_happy", "f_sick", "f_hurt"],
    },
  },
  {
    id: "shopping",
    emoji: "🛒",
    label: "Shopping",
    categories: ["need", "do", "question", "describe", "talk", "feel", "place", "quick", "favorites"],
    priorityL2: {
      need:     ["n_help", "n_change", "n_toilet", "n_water"],
      do:       ["d_like", "d_give", "d_open", "d_go", "d_stop"],
      question: ["q_howmuch", "q_what", "q_where", "q_canI", "q_doYouHave"],
      describe: ["dc_big", "dc_small", "dc_new", "dc_old", "dc_good", "dc_bad"],
      talk:     ["s_please", "s_thanks", "s_yes", "s_no"],
      place:    ["lc_store", "lc_bathroom", "lc_here", "lc_there"],
    },
  },
  {
    id: "transport",
    emoji: "🚌",
    label: "Transport",
    categories: ["place", "need", "do", "talk", "feel", "question", "people", "quick", "favorites"],
    priorityL2: {
      place:    ["lc_car", "lc_bus", "lc_here", "lc_there", "lc_home", "lc_school"],
      need:     ["n_toilet", "n_help", "n_rest", "n_quiet", "n_water"],
      do:       ["d_go", "d_stop", "d_come", "d_open", "d_watch"],
      talk:     ["s_wait", "s_please", "s_yes", "s_no"],
      feel:     ["f_sick", "f_scared", "f_tired", "f_bored"],
    },
  },
  {
    id: "emergency",
    emoji: "🚨",
    label: "Emergency",
    categories: ["need", "feel", "people", "do", "place", "talk", "question", "quick", "favorites"],
    priorityL2: {
      need:     ["n_help", "n_medicine", "n_toilet", "n_water"],
      feel:     ["f_hurt", "f_sick", "f_scared"],
      people:   ["pe_mom", "pe_dad", "pe_doctor", "pe_nurse"],
      do:       ["d_stop", "d_help", "d_go", "d_come"],
      place:    ["lc_here", "lc_hospital", "lc_home"],
      talk:     ["s_yes", "s_no", "s_please", "s_sorry"],
    },
  },
  {
    id: "work",
    emoji: "💼",
    label: "Work",
    categories: ["do", "talk", "need", "people", "question", "place", "feel", "quick", "favorites"],
    priorityL2: {
      do:       ["d_help", "d_finish", "d_give", "d_make", "d_read", "d_go"],
      talk:     ["s_yes", "s_no", "s_please", "s_thanks", "s_understand", "s_ask"],
      need:     ["n_help", "n_break", "n_quiet", "n_water"],
      people:   ["pe_i", "pe_you", "pe_we", "pe_they"],
      question: ["q_what", "q_how", "q_when", "q_where", "q_canYou"],
      place:    ["lc_here", "lc_there", "lc_bathroom"],
    },
  },
  {
    id: "social",
    emoji: "🎉",
    label: "Social",
    categories: ["talk", "feel", "people", "do", "need", "place", "question", "quick", "favorites"],
    priorityL2: {
      talk:     ["s_hello", "s_bye", "s_thanks", "s_sorry", "s_please", "s_yes", "s_no"],
      feel:     ["f_happy", "f_excited", "f_nervous", "f_calm"],
      people:   ["pe_friend", "pe_i", "pe_you", "pe_we"],
      do:       ["d_play", "d_like", "d_come", "d_go", "d_eat", "d_drink"],
      need:     ["n_food", "n_drink", "n_hug", "n_toilet"],
    },
  },
];

// ── Contextualized hierarchy helper ───────────────────────────────────────────

const BOARD_MAP = new Map(BOARDS.map(b => [b.id, b]));

/**
 * Returns the hierarchy for a category with L2 items reordered
 * according to the board's priorityL2. Promoted items come first,
 * then the rest in their original order. Returns null if category
 * has no hierarchy data.
 *
 * @param {string} categoryId — L1 category id (e.g. "feel")
 * @param {string} [boardId]  — board id (e.g. "doctor"); defaults to "generic"
 * @returns {import('../hierarchy.js').HierarchyCategory | null}
 */
export function getContextualHierarchy(categoryId, boardId) {
  const base = getHierarchy(categoryId);
  if (!base) return null;

  const board = BOARD_MAP.get(boardId);
  const priorities = board?.priorityL2?.[categoryId];
  if (!priorities?.length) return base;

  const prioritySet = new Set(priorities);
  const promoted = [];
  const rest = [];

  for (const item of base.items) {
    if (prioritySet.has(item.id)) {
      promoted.push(item);
    } else {
      rest.push(item);
    }
  }

  // Sort promoted items to match the priority order
  promoted.sort((a, b) => priorities.indexOf(a.id) - priorities.indexOf(b.id));

  return { ...base, items: [...promoted, ...rest] };
}

export default BOARDS;
