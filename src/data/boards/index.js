/**
 * boards/index.js — Contextual board registry for SpeakEasy AAC.
 *
 * Each board defines:
 *   id                — unique identifier
 *   emoji             — visual icon for the selector
 *   label             — English display name
 *   categories        — ordered L1 category ids to show on the home grid
 *   priorityL2        — per-category: promote L2 ids to the top, show rest after
 *   onlyL2            — per-category: restrict to ONLY these L2 ids (focused boards)
 *   l3Filter          — per-L2-item: restrict L3 to ONLY these L3 ids
 *   sentenceOverrides — (optional) per-path sentence suggestions that override
 *                       the global templates in sentenceTemplates.js.
 *                       Key format: "L1:L2" or "L1:L2:L3" → string[]
 *
 * Three layers of contextualisation:
 *   Layer 1 (categories) → which L1 categories appear & in what order
 *   Layer 2 (onlyL2/priorityL2) → which L2 items appear in each category
 *   Layer 3 (l3Filter) → which L3 modifiers appear for each L2 item
 *
 * Pictogram resolution:
 *   Icons are resolved at render-time via getArasaacPictogramUrl(item)
 *   from src/data/arasaac.js.  Each hierarchy item's `id` is used as the
 *   lookup key into the ARASAAC manifest (arasaac-pictograms.json).
 *   No `icon` field is needed on the board or hierarchy objects.
 *
 * Architecture:
 *   • The engine is NEVER modified.
 *   • getContextualHierarchy(categoryId, boardId) applies all 3 layers.
 *   • getSentenceOverrides(boardId) returns the board's sentence overrides.
 *   • Generic board is always untouched — full hierarchy as-is.
 *   • Adding a new board requires NO engine changes — just add an entry
 *     to the BOARDS array with the fields above.
 *
 * Design philosophy (AAC-expert):
 *   • Every L2→L3 path should produce a sentence the user would actually
 *     say in that board's context.
 *   • l3Filter removes L3 options that produce absurd or irrelevant sentences
 *     (e.g. "hurt + park" at the doctor, "give + toy" at a restaurant).
 *   • Fewer options = less scanning = faster communication.
 *   • Emergency board = absolute minimum for crisis speed.
 *
 * How to add a new board:
 *   1. Add an object to the BOARDS array with at minimum:
 *      { id, emoji, label, categories }
 *   2. Optionally add priorityL2/onlyL2/l3Filter/sentenceOverrides.
 *   3. Run: node scripts/audit-pictogram-coverage.mjs to verify coverage.
 *   4. No engine or UI code changes needed — the board auto-appears in the
 *      board selector and works with the existing SymbolPicker component.
 */

import { getHierarchy } from "../hierarchy.js";

// ── L3 ID shorthand groups (for compact l3Filter definitions) ─────────────

const _B = [
  "b_head", "b_stomach", "b_throat", "b_chest", "b_back",
  "b_leg", "b_arm", "b_tooth", "b_ear", "b_nose", "b_eyes", "b_skin",
];
const _FOOD = [
  "n3_apple", "n3_bread", "n3_rice", "n3_pasta",
  "n3_soup", "n3_snack", "n3_fruit", "n3_meat",
];
const _DRINK = ["n3_juice", "n3_milk", "n3_tea", "n3_coffee"];

const BOARDS = [

  // ━━ GENERIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: "generic",
    emoji: "🌐",
    label: "Generic",
    categories: ["feel", "need", "people", "do", "talk", "place", "question", "describe", "quick", "favorites"],
  },

  // ━━ HOME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Broad daily context — priorityL2 to float relevant items up but keep all.
  {
    id: "home",
    emoji: "🏠",
    label: "Home",
    categories: ["feel", "need", "do", "people", "talk", "place", "describe", "quick", "favorites"],
    priorityL2: {
      feel:     ["f_happy", "f_tired", "f_bored", "f_lonely", "f_calm", "f_sad", "f_hurt", "f_sick"],
      need:     ["n_food", "n_water", "n_drink", "n_toilet", "n_sleep", "n_rest", "n_hug", "n_quiet", "n_clean"],
      do:       ["d_eat", "d_drink", "d_watch", "d_play", "d_open", "d_make", "d_like", "d_finish", "d_read"],
      people:   ["pe_mom", "pe_dad", "pe_brother", "pe_sister", "pe_grandma", "pe_grandpa", "pe_i"],
      talk:     ["s_yes", "s_no", "s_please", "s_thanks", "s_ok", "s_hello", "s_bye", "s_sorry"],
      place:    ["lc_home", "lc_bathroom", "lc_bedroom", "lc_outside", "lc_here"],
      describe: ["dc_good", "dc_hot", "dc_cold", "dc_loud", "dc_quiet", "dc_big", "dc_small", "dc_nice"],
    },
    l3Filter: {
      // "give me [food/drink/toy/blanket]" — remove office/school items
      d_give:   ["o_food", "o_water", "o_toy", "o_blanket", "o_clothes", "o_ball", "p_mom", "p_dad", "p_brother", "p_sister", "x_please", "x_more", "x_not"],
      // "open [door/window/light/bag]" — home-relevant
      d_open:   ["o_door", "o_window", "o_light", "o_bag", "x_please", "x_not", "t_now"],
      // "watch [TV/game/phone]" — home entertainment
      d_watch:  ["o_tv", "o_game", "o_phone", "x_not", "x_please", "x_more", "t_now"],
      // "play with [toy/game/ball/friend/outside]"
      d_play:   ["o_toy", "o_game", "o_ball", "o_music", "p_friend", "p_brother", "p_sister", "pl_outside", "pl_park"],
      // "read [book]"
      d_read:   ["o_book", "p_mom", "p_dad", "t_now", "t_night", "x_please"],
    },
  },

  // ━━ SCHOOL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Broad context — priorityL2 with targeted l3Filter.
  {
    id: "school",
    emoji: "🏫",
    label: "School",
    categories: ["do", "need", "talk", "feel", "people", "question", "place", "quick", "favorites"],
    priorityL2: {
      do:       ["d_read", "d_finish", "d_help", "d_make", "d_play", "d_give", "d_go", "d_stop", "d_like"],
      need:     ["n_toilet", "n_break", "n_help", "n_quiet", "n_water", "n_food", "n_rest", "n_space"],
      talk:     ["s_ask", "s_repeat", "s_understand", "s_wait", "s_please", "s_yes", "s_no", "s_idk", "s_tell", "s_sorry"],
      feel:     ["f_confused", "f_frustrated", "f_nervous", "f_bored", "f_tired", "f_scared", "f_happy"],
      people:   ["pe_teacher", "pe_friend", "pe_therapist", "pe_i", "pe_you", "pe_we"],
      question: ["q_canI", "q_what", "q_how", "q_when", "q_where", "q_why"],
      place:    ["lc_school", "lc_bathroom", "lc_outside", "lc_here", "lc_home"],
    },
    l3Filter: {
      // "read [book/homework]" — not phone/tv at school
      d_read:   ["o_book", "o_homework", "p_teacher", "p_friend", "t_now", "x_please"],
      // "play [game/ball/outside]" — school yard
      d_play:   ["o_game", "o_ball", "p_friend", "pl_outside"],
      // "give [book/homework/bag]" — school items
      d_give:   ["o_book", "o_homework", "o_bag", "p_teacher", "p_friend", "x_please", "x_not"],
      // "watch [TV/book]" — limited at school
      d_watch:  ["o_tv", "o_book", "x_not", "x_please", "t_now"],
      // "open [book/bag/door]"
      d_open:   ["o_book", "o_bag", "o_door", "o_window", "x_please", "x_not", "t_now"],
      // "make [picture/homework/food]"
      d_make:   ["o_picture", "o_homework", "n3_snack", "x_please", "x_not"],
      // "understand [not/a little]" — key at school
      s_understand: ["x_not", "x_little", "o_homework", "o_book"],
      // PLACE → school sub-areas
      lc_school: ["lc3_class", "lc3_gym", "lc3_library", "lc3_cafet", "lc3_playground", "lc3_therapy", "t_now", "t_later"],
    },
  },

  // ━━ DOCTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Clinical setting. onlyL2 + aggressive l3Filter.
  // Every L2→L3 path = a sentence you'd say at a medical appointment.
  {
    id: "doctor",
    emoji: "🏥",
    label: "Doctor",
    categories: ["feel", "need", "talk", "people", "question", "do", "place", "quick"],
    onlyL2: {
      feel:     ["f_hurt", "f_sick", "f_scared", "f_nervous", "f_tired", "f_sad", "f_calm"],
      need:     ["n_help", "n_medicine", "n_toilet", "n_water", "n_rest"],
      talk:     ["s_yes", "s_no", "s_wait", "s_repeat", "s_understand", "s_please", "s_thanks"],
      people:   ["pe_doctor", "pe_nurse", "pe_mom", "pe_dad", "pe_therapist", "pe_i"],
      question: ["q_what", "q_when", "q_why", "q_how", "q_canYou", "q_canI", "q_isIt"],
      do:       ["d_stop", "d_help", "d_give", "d_go"],
      place:    ["lc_hospital", "lc_bathroom", "lc_here", "lc_home"],
    },
    l3Filter: {
      // "hurt [body part] — very / a little / now / since yesterday"
      f_hurt:   [..._B, "x_very", "x_little", "x_not", "t_now", "t_today", "t_yesterday"],
      // "sick [body part] — since when"
      f_sick:   [..._B, "x_very", "x_little", "t_now", "t_today", "t_yesterday", "t_morning", "t_night"],
      // "scared — very / a little" (no places)
      f_scared: ["x_very", "x_little", "x_not", "t_now"],
      // "nervous — very / a little"
      f_nervous: ["x_very", "x_little", "x_not", "t_now"],
      // "tired — very / since"
      f_tired:  ["x_very", "x_little", "t_now", "t_today", "t_night"],
      // "sad — very"
      f_sad:    ["x_very", "x_little", "x_not", "t_now"],
      // "need help — [who] [now] [please]"
      n_help:   ["p_doctor", "p_nurse", "p_mom", "p_dad", "t_now", "x_please"],
      // "need medicine — [body part] [now]"
      n_medicine: [..._B, "t_now", "t_today", "x_more", "x_please"],
      // "need toilet — now please"
      n_toilet: ["t_now", "x_please"],
      // "need water — now please more"
      n_water:  ["t_now", "x_please", "x_more"],
      // "need rest — now"
      n_rest:   ["t_now", "x_please", "x_very"],
      // "wait — please / a minute"
      s_wait:   ["t_now", "t_minute", "x_please", "x_not"],
      // "repeat — please / again"
      s_repeat: ["x_please", "x_again"],
      // "don't understand"
      s_understand: ["x_not", "x_little"],
      // "please — [water/medicine]"
      s_please: ["o_water", "o_medicine", "p_doctor", "p_nurse", "t_now"],
      // "thanks — [doctor/nurse]"
      s_thanks: ["p_doctor", "p_nurse", "p_mom"],
      // "stop — now please"
      d_stop:   ["t_now", "x_please", "x_not"],
      // "help — [who] now"
      d_help:   ["p_doctor", "p_nurse", "p_mom", "t_now", "x_please"],
      // "give me — [water/medicine] please"
      d_give:   ["o_water", "o_medicine", "x_please", "x_more"],
      // "go — [home] now/soon"
      d_go:     ["pl_home", "pl_here", "t_now", "t_soon"],
      // PEOPLE: "doctor [is here/coming/where?/call]"
      pe_doctor:   ["pr_here", "pr_coming", "pr_where", "pr_call", "pr_helps", "pr_said", "t_now", "t_soon"],
      pe_nurse:    ["pr_here", "pr_coming", "pr_where", "pr_call", "pr_helps", "t_now", "t_soon"],
      pe_mom:      ["pr_here", "pr_coming", "pr_gone", "pr_where", "pr_call", "t_now", "t_soon"],
      pe_dad:      ["pr_here", "pr_coming", "pr_gone", "pr_where", "pr_call", "t_now", "t_soon"],
      pe_therapist:["pr_here", "pr_coming", "pr_where", "pr_call", "t_now"],
      // "I am [ready/here/OK/not OK/tired/waiting]"
      pe_i:     ["st_ready", "st_here", "st_ok", "st_notok", "st_tired", "st_waiting", "st_hungry", "st_thirsty"],
      // QUESTION L3s
      q_what:   ["q3_this", "q3_that", "q3_happened", "q3_wrong", "q3_next", "o_medicine", "o_water"],
      q_when:   ["q3_gohome", "q3_over", "q3_start", "q3_doctor2"],
      q_why:    ["q3_whynot", "q3_cantI", "q3_whyhere"],
      q_canI:   ["q3_cigo", "q3_cihave", "q3_cieat", "q3_cidrink", "q3_cisit", "pl_home"],
      q_canYou: ["q3_cyhelp", "q3_cyshow", "q3_cytell", "q3_cyrepeat", "q3_cygive"],
      q_isIt:   ["q3_this", "q3_wrong", "q3_next", "x_not", "t_now", "t_soon"],
      // PLACE
      lc_hospital: ["lc3_room", "lc3_clinic", "lc3_waiting", "lc3_pharmacy", "lc3_xray", "t_now"],
      lc_bathroom: ["t_now", "x_please"],
      lc_here:  ["t_now", "x_not"],
      lc_home:  ["t_now", "t_soon", "x_please"],
    },
    // ── Board-specific sentence suggestions for medical context ──
    sentenceOverrides: {
      "feel:f_hurt":           ["I am in pain", "Something hurts", "It hurts"],
      "feel:f_hurt:b_head":    ["My head hurts badly", "I have a bad headache"],
      "feel:f_hurt:b_stomach": ["My stomach hurts", "I feel nauseous"],
      "feel:f_hurt:b_chest":   ["I have chest pain", "My chest feels tight"],
      "feel:f_hurt:x_very":    ["The pain is severe", "It hurts a lot"],
      "feel:f_hurt:x_little":  ["The pain is mild", "It hurts a little"],
      "feel:f_hurt:t_now":     ["It hurts right now", "The pain started now"],
      "feel:f_hurt:t_yesterday":["It started hurting yesterday"],
      "feel:f_sick":           ["I feel sick", "I am not feeling well"],
      "feel:f_sick:x_very":    ["I feel very sick", "I feel terrible"],
      "feel:f_sick:t_morning": ["I was sick this morning"],
      "feel:f_scared":         ["I am scared", "I am afraid of the procedure"],
      "need:n_medicine":       ["I need my medication", "When is my next dose?"],
      "need:n_medicine:t_now": ["I need medicine now", "The pain medicine please"],
      "need:n_help":           ["I need help", "Please help me"],
      "need:n_help:p_doctor":  ["I need to see the doctor"],
      "need:n_help:p_nurse":   ["I need the nurse"],
      "need:n_water:t_now":    ["Can I have water?", "I am thirsty"],
      "need:n_rest":           ["I need to rest", "I want to lie down"],
      "question:q_when:q3_gohome":["When can I go home?"],
      "question:q_what:q3_next":  ["What happens next?", "What is the next step?"],
    },
  },

  // ━━ RESTAURANT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Food & service focused. Only food/drink items in L3 for action verbs.
  {
    id: "restaurant",
    emoji: "🍽️",
    label: "Restaurant",
    categories: ["need", "do", "talk", "question", "describe", "feel", "quick", "favorites"],
    onlyL2: {
      need:     ["n_food", "n_drink", "n_water", "n_toilet", "n_help"],
      do:       ["d_eat", "d_drink", "d_give", "d_like", "d_finish"],
      talk:     ["s_please", "s_thanks", "s_yes", "s_no", "s_wait", "s_ok"],
      question: ["q_canI", "q_doYouHave", "q_howmuch", "q_what", "q_where"],
      describe: ["dc_good", "dc_bad", "dc_hot", "dc_cold", "dc_big", "dc_small", "dc_nice"],
      feel:     ["f_happy", "f_sick", "f_hurt"],
    },
    l3Filter: {
      // "need food — [specific food] more/please"
      n_food:   [..._FOOD, "x_more", "x_please", "x_not", "x_diff", "num_1", "num_2"],
      // "need drink — [specific drink] more/please"
      n_drink:  [..._DRINK, "x_more", "x_please", "x_not", "x_diff", "num_1", "num_2"],
      // "need water — more please"
      n_water:  ["t_now", "x_more", "x_please"],
      // "need toilet — now"
      n_toilet: ["t_now", "x_please"],
      // "need help — please"
      n_help:   ["t_now", "x_please"],
      // "eat [food choice] — more / please / done"
      d_eat:    [..._FOOD, "x_more", "x_please", "x_not", "x_done"],
      // "drink [drink choice]"
      d_drink:  [..._DRINK, "x_more", "x_please", "x_not", "x_done"],
      // "give me — [food/water] please more"
      d_give:   ["o_food", "o_water", "x_please", "x_more"],
      // "like [food items] — not / very / more / different"
      d_like:   [..._FOOD, "o_food", "o_water", "x_not", "x_very", "x_little", "x_more", "x_diff"],
      // "finish — done/not"
      d_finish: ["x_done", "x_not", "o_food", "o_water"],
      // "wait — please"
      s_wait:   ["t_now", "t_minute", "x_please", "x_not"],
      // "please — [food/water]"
      s_please: ["o_food", "o_water", "t_now"],
      // "can I have/eat/drink"
      q_canI:   ["q3_cihave", "q3_cieat", "q3_cidrink", "q3_cigo", "q3_cisit"],
      // "do you have [food/drink items]"
      q_doYouHave: [..._FOOD, ..._DRINK, "o_food", "o_water"],
      // "how much — [food/drink]"
      q_howmuch: ["num_1", "num_2", "num_3", "num_4", "num_5", "o_food", "o_water"],
      // "what [is this / for lunch / for dinner]"
      q_what:   ["q3_this", "q3_that", "q3_forlunch", "q3_fordinner"],
      // "where — bathroom / here"
      q_where:  ["pl_here", "pl_there"],
      // "good/bad/hot/cold — food/water"
      dc_good:  ["o_food", "o_water", "x_very", "x_not"],
      dc_bad:   ["o_food", "o_water", "x_very", "x_little"],
      dc_hot:   ["o_food", "o_water", "x_very", "x_little", "x_not"],
      dc_cold:  ["o_food", "o_water", "x_very", "x_little", "x_not"],
      dc_big:   ["o_food", "x_very", "x_little"],
      dc_small: ["o_food", "x_very", "x_little"],
      // "sick [stomach/now]"
      f_sick:   ["b_stomach", "b_throat", "x_very", "t_now"],
      // "hurt [body part]"
      f_hurt:   ["b_stomach", "b_throat", "b_head", "x_very", "x_little", "t_now"],
    },
    // ── Board-specific sentence suggestions for restaurant context ──
    sentenceOverrides: {
      // NEED
      "need:n_food":              ["I am hungry", "I would like to order", "I am ready to order"],
      "need:n_food:n3_apple":     ["I would like an apple"],
      "need:n_food:n3_bread":     ["Can I have some bread?"],
      "need:n_food:n3_rice":      ["I would like rice"],
      "need:n_food:n3_pasta":     ["I would like pasta please"],
      "need:n_food:n3_soup":      ["I would like soup please"],
      "need:n_food:n3_snack":     ["Can I have a snack?"],
      "need:n_food:n3_fruit":     ["I would like some fruit"],
      "need:n_food:n3_meat":      ["I would like meat please"],
      "need:n_food:x_more":       ["I would like more food", "More please"],
      "need:n_food:x_please":     ["Food please"],
      "need:n_food:x_not":        ["No food, thank you"],
      "need:n_food:x_diff":       ["I would like something different"],
      "need:n_drink":             ["I would like a drink", "Can I see the drinks?"],
      "need:n_drink:n3_juice":    ["I would like juice please"],
      "need:n_drink:n3_milk":     ["I would like milk"],
      "need:n_drink:n3_tea":      ["I would like tea please"],
      "need:n_drink:n3_coffee":   ["I would like coffee please"],
      "need:n_drink:x_more":      ["I would like another drink"],
      "need:n_drink:x_diff":      ["A different drink please"],
      "need:n_water":             ["Can I have water?", "Water please"],
      "need:n_water:x_more":      ["More water please"],
      "need:n_toilet":            ["Where is the bathroom?"],
      "need:n_help":              ["Excuse me, I need help"],
      // DO
      "do:d_eat":                 ["I want to eat", "I am ready to order"],
      "do:d_eat:x_done":          ["I am done eating", "I am finished"],
      "do:d_eat:x_more":          ["I would like more", "More please"],
      "do:d_eat:x_not":           ["I don't want to eat"],
      "do:d_drink":               ["I would like a drink"],
      "do:d_drink:x_done":        ["I am done, thank you"],
      "do:d_give":                ["Can I have?", "Give me please"],
      "do:d_give:o_food":         ["Can I have food?"],
      "do:d_give:o_water":        ["Can I have water?"],
      "do:d_like":                ["I like this", "This is good"],
      "do:d_like:x_very":         ["I really like it", "This is delicious"],
      "do:d_like:x_not":          ["I don't like this", "This is not what I ordered"],
      "do:d_like:x_diff":         ["I would like something different"],
      "do:d_finish":              ["I am finished", "The check please", "Can I have the bill?"],
      "do:d_finish:x_done":       ["We are done", "The check please"],
      // TALK
      "talk:s_please":            ["Please", "Yes please"],
      "talk:s_thanks":            ["Thank you", "Thank you very much"],
      "talk:s_wait":              ["One moment please", "I am still deciding"],
      "talk:s_wait:t_minute":     ["Just a minute please"],
      // QUESTION
      "question:q_canI":          ["Can I see the menu?", "Can I order?"],
      "question:q_canI:q3_cihave":["Can I have the menu?", "Can I have the bill?"],
      "question:q_canI:q3_cieat": ["Can I eat here?"],
      "question:q_canI:q3_cidrink":["Can I have something to drink?"],
      "question:q_canI:q3_cisit": ["Can I sit here?", "Is this table free?"],
      "question:q_doYouHave":     ["Do you have?", "What do you have?"],
      "question:q_howmuch":       ["How much is it?", "What is the total?", "The bill please"],
      "question:q_what":          ["What do you recommend?"],
      "question:q_what:q3_this":  ["What is this?"],
      "question:q_what:q3_forlunch":["What is for lunch?", "What is today's special?"],
      "question:q_what:q3_fordinner":["What is for dinner?"],
      "question:q_where":         ["Where is the bathroom?"],
      // DESCRIBE
      "describe:dc_good":         ["It is good", "The food is good"],
      "describe:dc_bad":          ["It is not good", "There is a problem"],
      "describe:dc_hot":          ["It is too hot", "This is hot"],
      "describe:dc_hot:x_very":   ["This is very hot"],
      "describe:dc_cold":         ["It is cold", "This is cold"],
      "describe:dc_cold:x_very":  ["This is too cold"],
      "describe:dc_nice":         ["This is nice", "Very nice place"],
      // FEEL
      "feel:f_happy":             ["I am happy", "I enjoyed the meal"],
      "feel:f_sick":              ["I feel sick", "I am not feeling well"],
      "feel:f_sick:b_stomach":    ["My stomach hurts"],
      "feel:f_hurt":              ["I am not feeling well"],
    },
  },

  // ━━ SHOPPING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Questions & descriptions dominate. L3 focused on purchasable items.
  {
    id: "shopping",
    emoji: "🛒",
    label: "Shopping",
    categories: ["question", "do", "describe", "talk", "need", "place", "quick", "favorites"],
    onlyL2: {
      question: ["q_howmuch", "q_doYouHave", "q_where", "q_what", "q_canI", "q_howmany"],
      do:       ["d_like", "d_give", "d_go", "d_finish", "d_open"],
      describe: ["dc_big", "dc_small", "dc_new", "dc_old", "dc_good", "dc_bad", "dc_nice", "dc_broken"],
      talk:     ["s_please", "s_thanks", "s_yes", "s_no", "s_wait"],
      need:     ["n_help", "n_toilet", "n_water"],
      place:    ["lc_store", "lc_bathroom", "lc_here", "lc_there"],
    },
    l3Filter: {
      // "how much — [item counts]"
      q_howmuch: ["num_1", "num_2", "num_3", "num_4", "num_5", "o_food", "o_clothes", "o_medicine", "o_phone"],
      // "do you have — [purchasable items]"
      q_doYouHave: ["o_food", "o_water", "o_medicine", "o_phone", "o_clothes", "o_bag", "o_book", ..._FOOD],
      // "where — [items/sections]"
      q_where:  ["o_food", "o_water", "o_medicine", "o_clothes", "o_phone", "pl_here", "pl_there"],
      // "what — this/that"
      q_what:   ["q3_this", "q3_that", "q3_name"],
      // "can I have/go"
      q_canI:   ["q3_cihave", "q3_cigo"],
      // "how many"
      q_howmany: ["num_1", "num_2", "num_3", "num_4", "num_5", "num_10", "o_food", "o_clothes"],
      // "like [clothes/phone/bag/toy] — not/very/different"
      d_like:   ["o_clothes", "o_phone", "o_bag", "o_toy", "o_book", "o_game", "o_food", "x_not", "x_very", "x_diff"],
      // "give me — please"
      d_give:   ["x_please", "x_more", "x_not"],
      // "go — home/here/there"
      d_go:     ["pl_home", "pl_here", "pl_there", "t_now"],
      // "open [bag/door]"
      d_open:   ["o_bag", "o_door", "x_please", "x_not"],
      // "big/small/new/old/broken — [item]"
      dc_big:   ["o_clothes", "o_bag", "o_phone", "o_toy", "x_very", "x_little"],
      dc_small: ["o_clothes", "o_bag", "o_phone", "o_toy", "x_very", "x_little"],
      dc_new:   ["o_clothes", "o_phone", "o_bag", "o_toy", "x_very"],
      dc_old:   ["o_clothes", "o_phone", "o_bag", "o_toy", "x_very"],
      dc_broken:["o_phone", "o_toy", "o_bag", "o_clothes"],
      dc_good:  ["o_food", "o_clothes", "o_phone", "x_very"],
      dc_bad:   ["o_food", "o_clothes", "o_phone", "x_very"],
      // "store [supermarket/pharmacy/bakery]"
      lc_store: ["lc3_supermarket", "lc3_pharmacy2", "lc3_bakery", "t_now"],
      // "need help — now please"
      n_help:   ["t_now", "x_please"],
    },
    sentenceOverrides: {
      // QUESTION
      "question:q_howmuch":         ["How much is this?", "How much does it cost?"],
      "question:q_doYouHave":       ["Do you have this?", "Do you sell this?"],
      "question:q_where":           ["Where is it?", "Where can I find it?"],
      "question:q_what":            ["What is this?"],
      "question:q_what:q3_this":    ["What is this?", "What is it called?"],
      "question:q_canI":            ["Can I see this?", "Can I try it?"],
      "question:q_canI:q3_cihave":  ["Can I have this?", "I would like to buy this"],
      "question:q_howmany":         ["How many?", "How many are there?"],
      // DO
      "do:d_like":                  ["I like this", "I want this one"],
      "do:d_like:x_very":           ["I really like this one"],
      "do:d_like:x_not":            ["I don't like this", "Not this one"],
      "do:d_like:x_diff":           ["I want a different one"],
      "do:d_give":                  ["I will take this", "Give me this one"],
      "do:d_go":                    ["I want to go", "Let's go"],
      "do:d_go:pl_home":            ["I want to go home"],
      // DESCRIBE
      "describe:dc_big":            ["It is too big", "Do you have a bigger one?"],
      "describe:dc_small":          ["It is too small", "Do you have a smaller one?"],
      "describe:dc_new":            ["I want a new one"],
      "describe:dc_good":           ["This is good", "I like this one"],
      "describe:dc_bad":            ["This is not good", "I don't want this"],
      "describe:dc_broken":         ["This is broken", "This does not work"],
      "describe:dc_nice":           ["This is nice", "This looks good"],
      // TALK
      "talk:s_please":              ["Yes please", "Please"],
      "talk:s_thanks":              ["Thank you"],
      "talk:s_wait":                ["I am still looking", "Wait please"],
      // NEED
      "need:n_help":                ["I need help", "Excuse me, can you help me?"],
      // PLACE
      "place:lc_store":             ["I want to go to the store"],
      "place:lc_bathroom":          ["Where is the bathroom?"],
    },
  },

  // ━━ TRANSPORT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Journey context. Place is primary. L3 stripped to locations + urgency.
  {
    id: "transport",
    emoji: "🚌",
    label: "Transport",
    categories: ["place", "do", "need", "feel", "talk", "question", "quick", "favorites"],
    onlyL2: {
      place:    ["lc_home", "lc_school", "lc_hospital", "lc_car", "lc_bus", "lc_here", "lc_there", "lc_outside"],
      do:       ["d_stop", "d_go", "d_come", "d_open", "d_turn"],
      need:     ["n_toilet", "n_rest", "n_quiet", "n_water", "n_help"],
      feel:     ["f_sick", "f_scared", "f_tired", "f_bored"],
      talk:     ["s_please", "s_yes", "s_no", "s_wait"],
      question: ["q_where", "q_when", "q_how"],
    },
    l3Filter: {
      // PLACE L3: only relevant sub-areas & timing
      lc_home:  ["t_now", "t_soon", "x_please"],
      lc_school:["t_now", "t_soon", "x_please"],
      lc_hospital:["t_now", "t_soon", "x_please"],
      lc_car:   ["lc3_seat", "lc3_window2", "t_now", "x_please"],
      lc_bus:   ["t_now", "t_soon", "x_not"],
      lc_here:  ["t_now", "x_not"],
      lc_there: ["t_now", "x_not"],
      // "stop — now! please!"
      d_stop:   ["t_now", "x_please", "x_not"],
      // "go — [destination] now/soon"
      d_go:     ["pl_home", "pl_school", "pl_hospital", "pl_here", "pl_there", "t_now", "t_soon"],
      // "come — here now"
      d_come:   ["pl_here", "t_now", "x_please"],
      // "open — door/window please"
      d_open:   ["o_door", "o_window", "x_please", "x_not"],
      // "turn — now / not"
      d_turn:   ["t_now", "x_please", "x_not"],
      // "toilet — now please"
      n_toilet: ["t_now", "x_please"],
      // "water — please more"
      n_water:  ["x_please", "x_more"],
      // "rest — now please"
      n_rest:   ["t_now", "x_please"],
      // "help — now please"
      n_help:   ["t_now", "x_please"],
      // "sick — stomach/head + now"
      f_sick:   ["b_stomach", "b_head", "x_very", "t_now"],
      // "scared — very / not"
      f_scared: ["x_very", "x_little", "x_not"],
      // "when — arrive/go home/over"
      q_when:   ["q3_gohome", "q3_over", "q3_start"],
      // "where — home/school/here"
      q_where:  ["pl_home", "pl_school", "pl_hospital", "pl_here", "pl_there"],
      // "how — get there"
      q_how:    ["q3_getthere"],
    },
    sentenceOverrides: {
      // PLACE
      "place:lc_home":              ["I want to go home", "Take me home"],
      "place:lc_home:t_now":        ["I want to go home now"],
      "place:lc_school":            ["I want to go to school", "Take me to school"],
      "place:lc_hospital":          ["I need to go to the hospital", "Take me to the hospital"],
      "place:lc_car":               ["I want to go to the car"],
      "place:lc_car:lc3_window2":   ["Open the window please", "Close the window please"],
      "place:lc_bus":               ["I want to take the bus"],
      "place:lc_here":              ["I want to stay here"],
      "place:lc_there":             ["I want to go there"],
      "place:lc_outside":           ["I want to go outside"],
      // DO
      "do:d_stop":                  ["Stop!", "Stop please"],
      "do:d_stop:t_now":            ["Stop right now!"],
      "do:d_go":                    ["Let's go", "I want to go"],
      "do:d_go:pl_home":            ["I want to go home"],
      "do:d_go:pl_school":          ["I want to go to school"],
      "do:d_go:pl_hospital":        ["Take me to the hospital"],
      "do:d_come":                  ["Come here", "Come with me"],
      "do:d_open":                  ["Open the door please"],
      "do:d_open:o_window":         ["Open the window please"],
      "do:d_turn":                  ["Turn around", "Turn here"],
      // NEED
      "need:n_toilet":              ["I need to use the bathroom", "I need the toilet now"],
      "need:n_toilet:t_now":        ["I need the bathroom right now!"],
      "need:n_rest":                ["I need to rest", "Can we take a break?"],
      "need:n_quiet":               ["I need quiet please"],
      "need:n_water":               ["I need water"],
      "need:n_help":                ["I need help"],
      // FEEL
      "feel:f_sick":                ["I feel sick", "I don't feel well"],
      "feel:f_sick:b_stomach":      ["My stomach hurts", "I feel nauseous"],
      "feel:f_scared":              ["I am scared"],
      "feel:f_tired":               ["I am tired"],
      "feel:f_bored":               ["I am bored", "Are we there yet?"],
      // TALK
      "talk:s_please":              ["Please"],
      "talk:s_yes":                 ["Yes"],
      "talk:s_no":                  ["No", "I don't want to"],
      "talk:s_wait":                ["Wait!", "Wait for me"],
      // QUESTION
      "question:q_where":           ["Where are we?", "Where are we going?"],
      "question:q_when":            ["When do we arrive?", "How much longer?"],
      "question:q_when:q3_gohome":  ["When are we going home?"],
      "question:q_when:q3_over":    ["When will this be over?"],
      "question:q_how":             ["How do we get there?"],
    },
  },

  // ━━ EMERGENCY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRISIS. Absolute minimum items. Every extra L3 costs critical seconds.
  {
    id: "emergency",
    emoji: "🚨",
    label: "Emergency",
    categories: ["need", "feel", "people", "do", "talk", "place", "quick"],
    onlyL2: {
      need:   ["n_help", "n_medicine", "n_water", "n_toilet"],
      feel:   ["f_hurt", "f_sick", "f_scared"],
      people: ["pe_mom", "pe_dad", "pe_doctor", "pe_nurse"],
      do:     ["d_stop", "d_help", "d_go"],
      talk:   ["s_yes", "s_no", "s_please"],
      place:  ["lc_hospital", "lc_here", "lc_home"],
    },
    l3Filter: {
      // "help — now! please!"
      n_help:   ["p_mom", "p_dad", "p_doctor", "p_nurse", "t_now", "x_please"],
      // "medicine — [body part] now"
      n_medicine: [..._B, "t_now", "x_please"],
      // "water — now"
      n_water:  ["t_now", "x_please"],
      // "toilet — now"
      n_toilet: ["t_now", "x_please"],
      // "hurt — [body part] very/a little"
      f_hurt:   [..._B, "x_very", "x_little", "t_now"],
      // "sick — [body part] very"
      f_sick:   [..._B, "x_very", "t_now"],
      // "scared — very"
      f_scared: ["x_very", "t_now"],
      // "mom/dad — call / where? / is here / come"
      pe_mom:   ["pr_call", "pr_where", "pr_here", "pr_coming", "t_now"],
      pe_dad:   ["pr_call", "pr_where", "pr_here", "pr_coming", "t_now"],
      pe_doctor:["pr_call", "pr_where", "pr_here", "pr_coming", "t_now"],
      pe_nurse: ["pr_call", "pr_where", "pr_here", "pr_coming", "t_now"],
      // "stop — now"
      d_stop:   ["t_now", "x_please"],
      // "help — [who] now"
      d_help:   ["p_mom", "p_dad", "p_doctor", "p_nurse", "t_now", "x_please"],
      // "go — hospital/home now"
      d_go:     ["pl_hospital", "pl_home", "t_now"],
      // PLACE: minimal
      lc_hospital: ["t_now"],
      lc_here:  ["t_now"],
      lc_home:  ["t_now"],
    },
    sentenceOverrides: {
      // NEED
      "need:n_help":                ["Help me!", "I need help!"],
      "need:n_help:t_now":          ["Help me right now!"],
      "need:n_medicine":            ["I need medicine", "I need my medication"],
      "need:n_water":               ["I need water"],
      "need:n_toilet":              ["I need the bathroom"],
      // FEEL
      "feel:f_hurt":                ["It hurts!", "I am in pain"],
      "feel:f_hurt:b_head":         ["My head hurts"],
      "feel:f_hurt:b_stomach":      ["My stomach hurts"],
      "feel:f_hurt:b_arm":          ["My arm hurts"],
      "feel:f_hurt:b_leg":          ["My leg hurts"],
      "feel:f_hurt:b_chest":        ["My chest hurts"],
      "feel:f_hurt:x_very":         ["It hurts a lot!"],
      "feel:f_sick":                ["I feel sick", "I don't feel well"],
      "feel:f_sick:x_very":         ["I feel very sick"],
      "feel:f_scared":              ["I am scared"],
      // PEOPLE
      "people:pe_mom":              ["I want my mom", "Call my mom"],
      "people:pe_mom:pr_call":      ["Call my mom!"],
      "people:pe_mom:pr_where":     ["Where is my mom?"],
      "people:pe_dad":              ["I want my dad", "Call my dad"],
      "people:pe_dad:pr_call":      ["Call my dad!"],
      "people:pe_dad:pr_where":     ["Where is my dad?"],
      "people:pe_doctor":           ["I need a doctor"],
      "people:pe_doctor:pr_call":   ["Call a doctor!"],
      "people:pe_nurse":            ["I need a nurse", "Call the nurse"],
      // DO
      "do:d_stop":                  ["Stop!", "Stop it!"],
      "do:d_stop:t_now":            ["Stop right now!"],
      "do:d_help":                  ["Help me!"],
      "do:d_go":                    ["I need to go"],
      "do:d_go:pl_hospital":        ["Take me to the hospital"],
      "do:d_go:pl_home":            ["Take me home"],
      // TALK
      "talk:s_yes":                 ["Yes"],
      "talk:s_no":                  ["No"],
      "talk:s_please":              ["Please"],
      // PLACE
      "place:lc_hospital":          ["Take me to the hospital"],
      "place:lc_hospital:t_now":    ["Take me to the hospital now!"],
      "place:lc_here":              ["I am here", "Stay here"],
      "place:lc_home":              ["Take me home", "I want to go home"],
    },
  },

  // ━━ WORK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Professional context. No family/child items. L3 = work-relevant objects.
  {
    id: "work",
    emoji: "💼",
    label: "Work",
    categories: ["do", "talk", "need", "question", "describe", "people", "place", "feel", "quick", "favorites"],
    onlyL2: {
      do:       ["d_finish", "d_help", "d_give", "d_make", "d_read", "d_go", "d_stop", "d_like", "d_open"],
      talk:     ["s_yes", "s_no", "s_understand", "s_please", "s_thanks", "s_wait", "s_ask", "s_tell", "s_repeat", "s_idk", "s_sorry", "s_ok"],
      need:     ["n_help", "n_break", "n_quiet", "n_toilet", "n_water", "n_rest"],
      question: ["q_what", "q_how", "q_canYou", "q_when", "q_why", "q_isIt", "q_where"],
      describe: ["dc_ready", "dc_good", "dc_bad", "dc_same", "dc_broken", "dc_new", "dc_old"],
      people:   ["pe_i", "pe_you", "pe_we", "pe_they"],
      place:    ["lc_here", "lc_there", "lc_bathroom"],
      feel:     ["f_tired", "f_frustrated", "f_confused", "f_happy", "f_calm"],
    },
    l3Filter: {
      // "finish — done/not/now/today"
      d_finish: ["x_done", "x_not", "t_now", "t_today", "t_soon"],
      // "help — please/now"
      d_help:   ["t_now", "t_soon", "x_please", "x_not"],
      // "give — [book/phone/bag] please"
      d_give:   ["o_book", "o_phone", "o_bag", "x_please", "x_not"],
      // "make — [picture/book] now"
      d_make:   ["o_book", "o_picture", "o_phone", "x_not", "x_done"],
      // "read — [book/homework/phone]"
      d_read:   ["o_book", "o_homework", "o_phone", "t_now", "x_please"],
      // "go — here/there/bathroom"
      d_go:     ["pl_here", "pl_there", "t_now", "t_soon"],
      // "open — [book/door/bag]"
      d_open:   ["o_book", "o_door", "o_bag", "o_phone", "x_please", "x_not"],
      // "like — [work items] not/very"
      d_like:   ["o_book", "o_phone", "x_not", "x_very", "x_diff"],
      // "wait — minute/now/please"
      s_wait:   ["t_now", "t_minute", "x_please", "x_not"],
      // "understand — not / a little"
      s_understand: ["x_not", "x_little"],
      // "repeat — please"
      s_repeat: ["x_please", "x_again"],
      // "ask — [who]"
      s_ask:    ["t_now", "x_please"],
      // "tell — [who]"
      s_tell:   ["t_now", "x_please"],
      // "need break — now"
      n_break:  ["t_now", "x_please"],
      // "need help — now please"
      n_help:   ["t_now", "t_soon", "x_please"],
      // "I am [ready/here/OK/busy/waiting]"
      pe_i:     ["st_ready", "st_here", "st_ok", "st_notok", "st_busy", "st_waiting", "st_leaving"],
      pe_you:   ["st_ready", "st_here", "st_ok", "st_busy", "st_waiting", "st_leaving"],
      pe_we:    ["st_ready", "st_here", "st_ok", "st_busy", "st_waiting", "st_leaving"],
      pe_they:  ["st_ready", "st_here", "st_ok", "st_busy", "st_waiting", "st_leaving"],
      // "can you [help/show/tell/repeat/give]"
      q_canYou: ["q3_cyhelp", "q3_cyshow", "q3_cytell", "q3_cyrepeat", "q3_cygive", "q3_cyopen"],
      // "what [happened/wrong/next/this]"
      q_what:   ["q3_this", "q3_that", "q3_happened", "q3_wrong", "q3_next"],
      // "when [start/over]"
      q_when:   ["q3_start", "q3_over"],
      // "is it [done/ready/next]"
      q_isIt:   ["q3_this", "q3_next", "q3_wrong", "x_not", "t_now"],
      // describe: work-relevant items only
      dc_ready: ["x_not", "t_now", "t_soon"],
      dc_good:  ["x_very", "x_not"],
      dc_bad:   ["x_very", "x_little"],
      dc_broken:["o_phone", "o_book"],
      dc_new:   ["o_phone", "o_book"],
      dc_old:   ["o_phone", "o_book"],
    },
    sentenceOverrides: {
      // DO
      "do:d_finish":                ["I am finished", "I am done"],
      "do:d_finish:x_not":          ["I am not finished yet"],
      "do:d_finish:x_done":         ["It is done"],
      "do:d_help":                  ["I need help", "Can you help me?"],
      "do:d_help:t_now":            ["I need help right now"],
      "do:d_give":                  ["Can you give me that?"],
      "do:d_give:o_book":           ["Can you give me the book?"],
      "do:d_give:o_phone":          ["Can I have the phone?"],
      "do:d_make":                  ["I made it", "I can make it"],
      "do:d_read":                  ["I am reading", "I want to read"],
      "do:d_go":                    ["I need to go", "I am leaving"],
      "do:d_go:pl_here":            ["I am coming"],
      "do:d_stop":                  ["Stop please", "I want to stop"],
      "do:d_like":                  ["I like this"],
      "do:d_like:x_not":            ["I don't like this"],
      "do:d_open":                  ["Can you open it?"],
      "do:d_open:o_door":           ["Open the door please"],
      // TALK
      "talk:s_yes":                 ["Yes"],
      "talk:s_no":                  ["No"],
      "talk:s_understand":          ["I understand"],
      "talk:s_understand:x_not":    ["I don't understand"],
      "talk:s_understand:x_little": ["I understand a little"],
      "talk:s_please":              ["Please"],
      "talk:s_thanks":              ["Thank you"],
      "talk:s_wait":                ["Wait please", "One moment"],
      "talk:s_repeat":              ["Can you repeat that?", "Say it again please"],
      "talk:s_idk":                 ["I don't know"],
      "talk:s_sorry":               ["I am sorry"],
      "talk:s_ok":                  ["OK", "That's fine"],
      "talk:s_ask":                 ["I have a question", "Can I ask something?"],
      "talk:s_tell":                ["I want to tell you something"],
      // NEED
      "need:n_help":                ["I need help"],
      "need:n_break":               ["I need a break"],
      "need:n_break:t_now":         ["I need a break right now"],
      "need:n_quiet":               ["I need quiet please"],
      "need:n_toilet":              ["I need the bathroom"],
      "need:n_water":               ["I need water"],
      "need:n_rest":                ["I need to rest"],
      // QUESTION
      "question:q_what":            ["What is this?", "What do I do?"],
      "question:q_what:q3_next":    ["What is next?", "What do I do next?"],
      "question:q_what:q3_wrong":   ["What is wrong?"],
      "question:q_how":             ["How do I do this?"],
      "question:q_canYou":          ["Can you help me?"],
      "question:q_canYou:q3_cyhelp":["Can you help me with this?"],
      "question:q_canYou:q3_cyshow":["Can you show me?"],
      "question:q_canYou:q3_cyrepeat":["Can you repeat that?"],
      "question:q_when":            ["When do we start?", "When is it over?"],
      "question:q_when:q3_start":   ["When do we start?"],
      "question:q_when:q3_over":    ["When is it over?"],
      "question:q_where":           ["Where is it?"],
      "question:q_isIt":            ["Is it done?", "Is it ready?"],
      // DESCRIBE
      "describe:dc_ready":          ["I am ready"],
      "describe:dc_ready:x_not":    ["I am not ready"],
      "describe:dc_good":           ["It is good", "Good job"],
      "describe:dc_bad":            ["It is not good", "Something is wrong"],
      "describe:dc_broken":         ["It is broken", "It does not work"],
      // PEOPLE
      "people:pe_i":                ["I am here"],
      "people:pe_i:st_ready":       ["I am ready"],
      "people:pe_i:st_busy":        ["I am busy"],
      "people:pe_i:st_waiting":     ["I am waiting"],
      "people:pe_i:st_leaving":     ["I am leaving"],
      "people:pe_you":              ["You"],
      "people:pe_we":               ["We are ready", "We can start"],
      // PLACE
      "place:lc_here":              ["I am here"],
      "place:lc_there":             ["Over there"],
      "place:lc_bathroom":          ["I need the bathroom", "Where is the bathroom?"],
      // FEEL
      "feel:f_tired":               ["I am tired"],
      "feel:f_frustrated":          ["I am frustrated"],
      "feel:f_confused":            ["I am confused", "I don't understand"],
      "feel:f_happy":               ["I am happy"],
      "feel:f_calm":                ["I am calm", "I am OK"],
    },
  },

  // ━━ SOCIAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Gathering/party. Broad but with social L3 focus.
  {
    id: "social",
    emoji: "🎉",
    label: "Social",
    categories: ["talk", "feel", "people", "do", "need", "describe", "place", "question", "quick", "favorites"],
    priorityL2: {
      talk:     ["s_hello", "s_bye", "s_thanks", "s_please", "s_yes", "s_no", "s_sorry", "s_ok", "s_idk", "s_tell", "s_ask"],
      feel:     ["f_happy", "f_excited", "f_nervous", "f_calm", "f_tired", "f_bored", "f_lonely", "f_sad"],
      people:   ["pe_friend", "pe_i", "pe_you", "pe_we", "pe_they"],
      do:       ["d_eat", "d_drink", "d_play", "d_like", "d_come", "d_go", "d_watch", "d_finish"],
      need:     ["n_food", "n_drink", "n_toilet", "n_rest", "n_hug", "n_quiet"],
      describe: ["dc_good", "dc_nice", "dc_loud", "dc_quiet", "dc_hot", "dc_cold"],
      place:    ["lc_here", "lc_outside", "lc_park", "lc_home", "lc_restau", "lc_bathroom"],
    },
    l3Filter: {
      // "eat [food]" — social food
      d_eat:    [..._FOOD, "x_more", "x_please", "x_not", "x_done"],
      // "drink [drinks]"
      d_drink:  [..._DRINK, "x_more", "x_please", "x_not", "x_done"],
      // "play [game/music/ball] with [friend]"
      d_play:   ["o_game", "o_music", "o_ball", "p_friend", "pl_outside", "pl_park"],
      // "like — [food/music/game] very/not"
      d_like:   [..._FOOD, "o_music", "o_game", "o_food", "x_not", "x_very", "x_diff"],
      // "watch — TV/game/phone"
      d_watch:  ["o_tv", "o_game", "o_phone", "x_not", "x_please"],
      // "give — food/drink"
      d_give:   ["o_food", "o_water", "p_friend", "x_please", "x_more"],
      // "hello/bye — [friend/everyone]"
      s_hello:  ["p_friend", "p_everyone"],
      s_bye:    ["p_friend", "p_everyone"],
      // "loud — very/not/places"
      dc_loud:  ["x_very", "x_little", "x_not", "pl_here"],
      dc_quiet: ["x_very", "x_little", "x_not", "pl_here"],
    },
  },

];

// ── Contextualized hierarchy helper ───────────────────────────────────────────

const BOARD_MAP = new Map(BOARDS.map(b => [b.id, b]));

/**
 * Returns the hierarchy for a category contextualised for the given board.
 *
 * Applies up to 3 layers:
 *   1. onlyL2 → restrict to declared L2 ids   (OR)
 *      priorityL2 → promote declared ids, rest follow
 *   2. l3Filter → per-L2 restriction of L3 options
 *
 * @param {string} categoryId
 * @param {string} [boardId]
 * @returns {import('../hierarchy.js').HierarchyCategory | null}
 */
export function getContextualHierarchy(categoryId, boardId) {
  const base = getHierarchy(categoryId);
  if (!base) return null;

  const board = BOARD_MAP.get(boardId);
  if (!board) return base;

  // ── Step 1: Determine L2 item list ──

  let items;

  const onlyIds = board.onlyL2?.[categoryId];
  if (onlyIds?.length) {
    const itemMap = new Map(base.items.map(i => [i.id, i]));
    items = onlyIds.map(id => itemMap.get(id)).filter(Boolean);
  } else {
    const priorities = board.priorityL2?.[categoryId];
    if (priorities?.length) {
      const prioritySet = new Set(priorities);
      const promoted = priorities.map(id => base.items.find(i => i.id === id)).filter(Boolean);
      const rest = base.items.filter(i => !prioritySet.has(i.id));
      items = [...promoted, ...rest];
    } else {
      items = base.items;
    }
  }

  // ── Step 2: Apply L3 filters ──

  const l3Filters = board.l3Filter;
  if (l3Filters) {
    items = items.map(item => {
      const allowed = l3Filters[item.id];
      if (!allowed || !item.l3?.length) return item;
      // Produce L3 in the order declared by the filter
      const filtered = allowed
        .map(id => item.l3.find(o => o.id === id))
        .filter(Boolean);
      return filtered.length ? { ...item, l3: filtered } : item;
    });
  }

  return { ...base, items };
}

/**
 * Returns the board definition for the given board ID.
 * @param {string} boardId
 * @returns {object | undefined}
 */
export function getBoard(boardId) {
  return BOARD_MAP.get(boardId);
}

/**
 * Returns the sentenceOverrides map for the given board, or null.
 * Used by sentenceSuggestions.js to check board-specific templates.
 *
 * Board overrides are currently English-only; for other languages the
 * engine falls through to the curated per-language sentence templates,
 * which already provide comprehensive coverage for every path.
 *
 * @param {string} boardId
 * @param {string} [langCode='en']
 * @returns {Record<string, string[]> | null}
 */
export function getSentenceOverrides(boardId, langCode = 'en') {
  if (langCode !== 'en') return null;
  return BOARD_MAP.get(boardId)?.sentenceOverrides ?? null;
}

/**
 * Validate a board definition against the hierarchy.
 * Checks that all referenced category and L2 IDs exist, and that
 * sentenceOverrides keys match the expected format.
 *
 * @param {object} boardDef - A board object matching the BOARDS schema
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateBoard(boardDef) {
  const errors = [];
  const warnings = [];

  if (!boardDef.id)         errors.push("Missing required field: id");
  if (!boardDef.label)      errors.push("Missing required field: label");
  if (!boardDef.categories) errors.push("Missing required field: categories");

  // Soft categories that aren't hierarchy-based
  const SOFT_CATS = new Set(["quick", "favorites"]);

  for (const catId of boardDef.categories || []) {
    if (!getHierarchy(catId) && !SOFT_CATS.has(catId)) {
      errors.push(`Category "${catId}" not found in hierarchy`);
    }
  }

  // Check onlyL2 references
  for (const [catId, l2Ids] of Object.entries(boardDef.onlyL2 || {})) {
    const cat = getHierarchy(catId);
    if (!cat) continue;
    const validL2 = new Set(cat.items.map(i => i.id));
    for (const l2Id of l2Ids) {
      if (!validL2.has(l2Id)) {
        errors.push(`onlyL2: L2 id "${l2Id}" not found in category "${catId}"`);
      }
    }
  }

  // Check l3Filter references
  for (const [l2Id, l3Ids] of Object.entries(boardDef.l3Filter || {})) {
    if (!Array.isArray(l3Ids) || l3Ids.length === 0) {
      warnings.push(`l3Filter: "${l2Id}" has empty L3 list`);
    }
  }

  // Check sentenceOverrides keys format
  for (const key of Object.keys(boardDef.sentenceOverrides || {})) {
    const parts = key.split(":");
    if (parts.length < 2 || parts.length > 3) {
      errors.push(`sentenceOverrides: key "${key}" must be "L1:L2" or "L1:L2:L3"`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export default BOARDS;
