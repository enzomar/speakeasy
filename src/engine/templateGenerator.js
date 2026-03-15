/**
 * templateGenerator.js — Generates localized sentence suggestions
 * by combining the morphology engine with the phrase table.
 *
 * Instead of maintaining 10 separate per-language template files,
 * each template key maps to a "recipe" that is resolved at runtime:
 *
 *  1. "build" — delegates to buildSentence() with concept IDs
 *  2. "phrase" — looks up an idiomatic pattern from phraseTable.json
 *  3. "social" — looks up a fixed social/greeting phrase
 *  4. "composite" — combines multiple recipe steps
 *
 * @module templateGenerator
 */

import { buildSentence } from "./sentenceBuilder.js";
import PHRASES from "./phraseTable.json" assert { type: "json" };
import { hierarchyToConcept } from "./conceptRegistry.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a person ID to a localized name */
function personName(personId, lang) {
  return PHRASES.person_names[personId]?.[lang]
    ?? PHRASES.person_names[personId]?.en
    ?? personId;
}

/** Resolve a body-part ID to a localized name */
function bodyPart(bodyId, lang) {
  return PHRASES.body_parts[bodyId]?.[lang]
    ?? PHRASES.body_parts[bodyId]?.en
    ?? bodyId;
}

/** Resolve a body-part locative (French à la/au, Spanish el/la, etc.) */
function bodyLoc(bodyId, lang) {
  return PHRASES.body_parts_locative[bodyId]?.[lang] ?? bodyPart(bodyId, lang);
}

/** Resolve a food/drink item */
function foodItem(itemId, lang) {
  return PHRASES.food_drink_items[itemId]?.[lang]
    ?? PHRASES.food_drink_items[itemId]?.en
    ?? itemId;
}

/** Resolve an object */
function objectName(objId, lang) {
  return PHRASES.objects[objId]?.[lang]
    ?? PHRASES.objects[objId]?.en
    ?? objId;
}

/** Resolve a time adverb */
function timeAdverb(timeId, lang) {
  return PHRASES.time_adverbs[timeId]?.[lang]
    ?? PHRASES.time_adverbs[timeId]?.en
    ?? timeId;
}

/** Resolve a sub-place name */
function subPlace(placeId, lang) {
  return PHRASES.sub_places[placeId]?.[lang]
    ?? PHRASES.sub_places[placeId]?.en
    ?? placeId;
}

/** Get a place locative from the main lexicon (via buildSentence concept) */
function placeLocative(placeConceptId, lang) {
  // Use buildSentence to get "I want to go {place}" then extract
  // Instead, use the phrase table's want_go_place pattern
  const locatives = {
    pl_home:    { en: "home",          es: "a casa",        fr: "à la maison",    de: "nach Hause",     it: "a casa",       pt: "para casa",    ar: "إلى البيت",    zh: "回家",     ja: "家に",     ko: "집에" },
    pl_school:  { en: "to school",     es: "a la escuela",  fr: "à l'école",      de: "zur Schule",     it: "a scuola",     pt: "à escola",     ar: "إلى المدرسة",  zh: "去学校",   ja: "学校に",   ko: "학교에" },
    pl_outside: { en: "outside",       es: "afuera",        fr: "dehors",         de: "nach draußen",   it: "fuori",        pt: "lá fora",      ar: "إلى الخارج",   zh: "去外面",   ja: "外に",     ko: "밖에" },
    pl_park:    { en: "to the park",   es: "al parque",     fr: "au parc",        de: "in den Park",    it: "al parco",     pt: "ao parque",    ar: "إلى الحديقة",  zh: "去公园",   ja: "公園に",   ko: "공원에" },
    pl_here:    { en: "here",          es: "aquí",          fr: "ici",            de: "hier",           it: "qui",          pt: "aqui",         ar: "هنا",          zh: "这里",     ja: "ここに",   ko: "여기에" },
  };
  return locatives[placeConceptId]?.[lang] ?? locatives[placeConceptId]?.en ?? placeConceptId;
}

/** Fill template placeholders like {person}, {body}, {object} */
function fillTemplate(template, params, lang) {
  let result = template;
  if (params.person) result = result.replaceAll("{person}", personName(params.person, lang));
  if (params.body)   result = result.replaceAll("{body}", bodyPart(params.body, lang));
  if (params.body)   result = result.replaceAll("{body_loc}", bodyLoc(params.body, lang));
  if (params.body)   result = result.replaceAll("{body_def}", bodyLoc(params.body, lang));
  if (params.object) result = result.replaceAll("{object}", objectName(params.object, lang));
  if (params.food)   result = result.replaceAll("{food}", foodItem(params.food, lang));
  if (params.place)  result = result.replaceAll("{place}", placeLocative(params.place, lang));
  if (params.time)   result = result.replaceAll("{time}", timeAdverb(params.time, lang));
  if (params.subPlace) result = result.replaceAll("{subPlace}", subPlace(params.subPlace, lang));
  if (params.object_poss) result = result.replaceAll("{object_poss}", params.object_poss);
  return result;
}

/** Wrap a string or array into array form */
function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const TENSE_OPERATOR_SET = new Set(["NOW", "PAST", "FUTURE"]);

const TIME_TO_TENSE_OPERATOR = {
  t_now: "NOW",
  t_today: "NOW",
  t_always: "NOW",
  t_everyday: "NOW",
  t_yesterday: "PAST",
  t_morning: "PAST",
  t_afternoon: "PAST",
  t_night: "PAST",
  t_tomorrow: "FUTURE",
  t_soon: "FUTURE",
  t_later: "FUTURE",
  t_minute: "FUTURE",
  t_before: "PAST",
  t_after: "FUTURE",
  t_already: "PAST",
  t_still: "NOW",
};

function isTimeModifier(modifierId) {
  return typeof modifierId === "string" && modifierId.startsWith("t_");
}

function withTenseOperator(concepts, tenseOperator) {
  const cleaned = asArray(concepts).filter(c => !TENSE_OPERATOR_SET.has(c));
  if (!tenseOperator) return cleaned;
  return [tenseOperator, ...cleaned];
}

function mapPlaceIdToConcept(placeId) {
  return hierarchyToConcept(placeId);
}

function mapObjectIdToConcept(objectId) {
  return hierarchyToConcept(objectId);
}

function applyTimeTenseToRecipe(recipe, timeId) {
  const tenseOperator = TIME_TO_TENSE_OPERATOR[timeId] || null;
  if (!tenseOperator || !recipe || typeof recipe !== "object") return recipe;

  if (recipe.type === "build") {
    return {
      ...recipe,
      concepts: withTenseOperator(recipe.concepts, tenseOperator),
    };
  }

  if (recipe.type === "composite") {
    return {
      ...recipe,
      recipes: asArray(recipe.recipes).map(sub => applyTimeTenseToRecipe(sub, timeId)),
    };
  }

  // Some phrase patterns can be upgraded to concept-based builds so tense inflects.
  if (recipe.type === "phrase" && recipe.pattern === "want_go_place") {
    const placeConcept = mapPlaceIdToConcept(recipe.params?.place);
    if (placeConcept) {
      return {
        type: "build",
        concepts: withTenseOperator(["I", "GO", placeConcept], tenseOperator),
      };
    }
  }

  if (recipe.type === "phrase" && recipe.pattern === "need_object") {
    const objectConcept = mapObjectIdToConcept(recipe.params?.object);
    if (objectConcept) {
      return {
        type: "build",
        concepts: withTenseOperator(["I", "NEED", objectConcept], tenseOperator),
      };
    }
  }

  return recipe;
}

function normalizeSuggestions(results) {
  return results
    .filter(Boolean)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 3);
}

// ── Recipe Resolver ─────────────────────────────────────────────────────────

/**
 * Resolve a recipe to an array of localized strings.
 * @param {object} recipe
 * @param {string} lang
 * @returns {string[]}
 */
function resolveRecipe(recipe, lang) {
  switch (recipe.type) {
    case "build": {
      const result = buildSentence(recipe.concepts, lang);
      return result.text ? [result.text] : [];
    }

    case "phrase": {
      const pattern = PHRASES[recipe.pattern];
      if (!pattern) return [];
      const tpl = pattern[lang] ?? pattern.en;
      if (!tpl) return [];
      // If it's a string template with placeholders
      if (typeof tpl === "string") {
        return [fillTemplate(tpl, recipe.params || {}, lang)];
      }
      // If it has tpl/alt fields (like body_pain)
      if (tpl.tpl) {
        const main = fillTemplate(tpl.tpl, recipe.params || {}, lang);
        const alt = tpl.alt ? fillTemplate(tpl.alt, recipe.params || {}, lang) : null;
        return alt ? [main, alt] : [main];
      }
      return asArray(tpl);
    }

    case "phrase_key": {
      // Look up a specific sub-key in a phrase section
      const section = PHRASES[recipe.section];
      if (!section) return [];
      const entry = section[recipe.key];
      if (!entry) return [];
      const val = entry[lang] ?? entry.en;
      return asArray(val);
    }

    case "social": {
      const entry = PHRASES.social[recipe.key];
      if (!entry) return [];
      return asArray(entry[lang] ?? entry.en);
    }

    case "imperative": {
      const entry = PHRASES.imperative[recipe.key];
      if (!entry) return [];
      return asArray(entry[lang] ?? entry.en);
    }

    case "person_state": {
      const stateEntry = PHRASES.person_state[recipe.state];
      if (!stateEntry) return [];
      const tpl = stateEntry[lang] ?? stateEntry.en;
      return [fillTemplate(tpl, { person: recipe.person }, lang)];
    }

    case "composite": {
      // Merge results from multiple sub-recipes
      const results = [];
      for (const sub of recipe.recipes) {
        results.push(...resolveRecipe(sub, lang));
      }
      return results;
    }

    case "append_time": {
      // Resolve base recipe and append a time adverb.
      // If the time modifier implies tense, inflect base verb phrase accordingly.
      const tenseAwareBaseRecipe = applyTimeTenseToRecipe(recipe.base, recipe.time);
      const base = resolveRecipe(tenseAwareBaseRecipe, lang);
      const time = timeAdverb(recipe.time, lang);
      return base.map(s => {
        // Remove trailing period/punctuation before appending
        const clean = s.replace(/[.。！!？?]$/, "").trim();
        return `${clean} ${time}`;
      });
    }

    default:
      return [];
  }
}

// ── Recipe Map ──────────────────────────────────────────────────────────────
// Maps every template key to a recipe (or array of recipes for multiple suggestions)

const RECIPE_MAP = {
  // ━━ FEEL — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "feel:f_hurt":       { type: "composite", recipes: [{ type: "build", concepts: ["I", "HURT"] }, { type: "phrase_key", section: "body_pain_intensity", key: "now" }] },
  "feel:f_sick":       { type: "build", concepts: ["I", "SICK"] },
  "feel:f_scared":     { type: "build", concepts: ["I", "SCARED"] },
  "feel:f_sad":        { type: "build", concepts: ["I", "SAD"] },
  "feel:f_angry":      { type: "build", concepts: ["I", "ANGRY"] },
  "feel:f_tired":      { type: "build", concepts: ["I", "TIRED"] },
  "feel:f_frustrated": { type: "build", concepts: ["I", "FRUSTRATED"] },
  "feel:f_confused":   { type: "composite", recipes: [{ type: "build", concepts: ["I", "CONFUSED"] }, { type: "social", key: "not_understand" }] },
  "feel:f_nervous":    { type: "build", concepts: ["I", "NERVOUS"] },
  "feel:f_bored":      { type: "build", concepts: ["I", "BORED"] },
  "feel:f_lonely":     { type: "build", concepts: ["I", "LONELY"] },
  "feel:f_happy":      { type: "build", concepts: ["I", "HAPPY"] },
  "feel:f_excited":    { type: "build", concepts: ["I", "EXCITED"] },
  "feel:f_calm":       { type: "build", concepts: ["I", "CALM"] },

  // ── FEEL — body parts
  "feel:f_hurt:b_head":    { type: "phrase", pattern: "body_pain", params: { body: "b_head" } },
  "feel:f_hurt:b_stomach": { type: "phrase", pattern: "body_pain", params: { body: "b_stomach" } },
  "feel:f_hurt:b_throat":  { type: "phrase", pattern: "body_pain", params: { body: "b_throat" } },
  "feel:f_hurt:b_chest":   { type: "phrase", pattern: "body_pain", params: { body: "b_chest" } },
  "feel:f_hurt:b_back":    { type: "phrase", pattern: "body_pain", params: { body: "b_back" } },
  "feel:f_hurt:b_leg":     { type: "phrase", pattern: "body_pain", params: { body: "b_leg" } },
  "feel:f_hurt:b_arm":     { type: "phrase", pattern: "body_pain", params: { body: "b_arm" } },
  "feel:f_hurt:b_tooth":   { type: "phrase", pattern: "body_pain", params: { body: "b_tooth" } },
  "feel:f_hurt:b_ear":     { type: "phrase", pattern: "body_pain", params: { body: "b_ear" } },
  "feel:f_hurt:b_nose":    { type: "phrase", pattern: "body_pain", params: { body: "b_nose" } },
  "feel:f_hurt:b_eyes":    { type: "phrase", pattern: "body_pain", params: { body: "b_eyes" } },
  "feel:f_hurt:b_skin":    { type: "phrase", pattern: "body_pain", params: { body: "b_skin" } },

  // ── FEEL — intensity
  "feel:f_hurt:x_very":   { type: "phrase_key", section: "body_pain_intensity", key: "very" },
  "feel:f_hurt:x_little": { type: "phrase_key", section: "body_pain_intensity", key: "little" },
  "feel:f_hurt:x_not":    { type: "phrase_key", section: "body_pain_intensity", key: "not" },
  "feel:f_hurt:t_now":    { type: "phrase_key", section: "body_pain_intensity", key: "now" },
  "feel:f_sick:x_very":   { type: "build", concepts: ["I", "SICK", "VERY"] },
  "feel:f_sick:x_little": { type: "build", concepts: ["I", "SICK", "LITTLE"] },
  "feel:f_scared:x_very": { type: "build", concepts: ["I", "SCARED", "VERY"] },
  "feel:f_scared:x_not":  { type: "build", concepts: ["I", "NOT", "SCARED"] },
  "feel:f_sad:x_very":    { type: "build", concepts: ["I", "SAD", "VERY"] },
  "feel:f_sad:x_not":     { type: "build", concepts: ["I", "NOT", "SAD"] },
  "feel:f_angry:x_very":  { type: "build", concepts: ["I", "ANGRY", "VERY"] },
  "feel:f_angry:x_not":   { type: "build", concepts: ["I", "NOT", "ANGRY"] },
  "feel:f_tired:x_very":  { type: "build", concepts: ["I", "TIRED", "VERY"] },
  "feel:f_happy:x_very":  { type: "build", concepts: ["I", "HAPPY", "VERY"] },

  // ── FEEL — time
  "feel:f_hurt:t_today":     { type: "append_time", base: { type: "build", concepts: ["I", "HURT"] }, time: "t_today" },
  "feel:f_hurt:t_yesterday": { type: "append_time", base: { type: "build", concepts: ["I", "HURT"] }, time: "t_yesterday" },
  "feel:f_sick:t_now":       { type: "append_time", base: { type: "build", concepts: ["I", "SICK"] }, time: "t_now" },
  "feel:f_sick:t_today":     { type: "append_time", base: { type: "build", concepts: ["I", "SICK"] }, time: "t_today" },
  "feel:f_sick:t_morning":   { type: "append_time", base: { type: "build", concepts: ["I", "SICK"] }, time: "t_morning" },
  "feel:f_sick:t_night":     { type: "append_time", base: { type: "build", concepts: ["I", "SICK"] }, time: "t_night" },
  "feel:f_tired:t_now":      { type: "append_time", base: { type: "build", concepts: ["I", "TIRED"] }, time: "t_now" },
  "feel:f_tired:t_always":   { type: "append_time", base: { type: "build", concepts: ["I", "TIRED"] }, time: "t_always" },

  // ── FEEL — people
  "feel:f_sad:p_mom":       { type: "phrase", pattern: "miss_person", params: { person: "p_mom" } },
  "feel:f_sad:p_dad":       { type: "phrase", pattern: "miss_person", params: { person: "p_dad" } },
  "feel:f_sad:p_friend":    { type: "phrase", pattern: "miss_person", params: { person: "p_friend" } },
  "feel:f_angry:p_friend":  { type: "phrase", pattern: "angry_at", params: { person: "p_friend" } },
  "feel:f_angry:p_brother": { type: "phrase", pattern: "angry_at", params: { person: "p_brother" } },
  "feel:f_angry:p_sister":  { type: "phrase", pattern: "angry_at", params: { person: "p_sister" } },

  // ━━ NEED — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "need:n_water":    { type: "phrase", pattern: "need_object", params: { object: "o_water" } },
  "need:n_food":     { type: "phrase", pattern: "need_object", params: { object: "o_food" } },
  "need:n_toilet":   { type: "build", concepts: ["I", "NEED", "GO", "BATHROOM"] },
  "need:n_help":     { type: "imperative", key: "help" },
  "need:n_drink":    { type: "build", concepts: ["I", "WANT", "DRINK"] },
  "need:n_medicine": { type: "phrase", pattern: "need_object", params: { object: "o_medicine" } },
  "need:n_sleep":    { type: "build", concepts: ["I", "NEED", "SLEEP"] },
  "need:n_rest":     { type: "build", concepts: ["I", "NEED", "REST"] },
  "need:n_hug":      { type: "build", concepts: ["I", "NEED", "HUG"] },
  "need:n_change":   { type: "build", concepts: ["I", "NEED", "CHANGE"] },
  "need:n_quiet":    { type: "build", concepts: ["I", "NEED", "QUIET"] },
  "need:n_space":    { type: "phrase", pattern: "need_object", params: { object: "o_space" } },
  "need:n_clean":    { type: "build", concepts: ["I", "NEED", "CLEAN"] },
  "need:n_break":    { type: "build", concepts: ["I", "NEED", "BREAK"] },

  // ── NEED — food/drink choices
  "need:n_food:n3_apple":  { type: "build", concepts: ["I", "WANT", "EAT", "APPLE"] },
  "need:n_food:n3_bread":  { type: "build", concepts: ["I", "WANT", "EAT", "BREAD"] },
  "need:n_food:n3_rice":   { type: "build", concepts: ["I", "WANT", "EAT", "RICE"] },
  "need:n_food:n3_pasta":  { type: "build", concepts: ["I", "WANT", "EAT", "PASTA"] },
  "need:n_food:n3_soup":   { type: "build", concepts: ["I", "WANT", "EAT", "SOUP"] },
  "need:n_food:n3_snack":  { type: "build", concepts: ["I", "WANT", "EAT", "SNACK"] },
  "need:n_food:n3_fruit":  { type: "build", concepts: ["I", "WANT", "EAT", "FRUIT"] },
  "need:n_food:n3_meat":   { type: "build", concepts: ["I", "WANT", "EAT", "MEAT"] },
  "need:n_drink:n3_juice": { type: "build", concepts: ["I", "WANT", "DRINK", "JUICE"] },
  "need:n_drink:n3_milk":  { type: "build", concepts: ["I", "WANT", "DRINK", "MILK"] },
  "need:n_drink:n3_tea":   { type: "build", concepts: ["I", "WANT", "DRINK", "TEA"] },
  "need:n_drink:n3_coffee":{ type: "build", concepts: ["I", "WANT", "DRINK", "COFFEE"] },

  // ── NEED — time/polarity/people
  "need:n_water:t_now":        { type: "append_time", base: { type: "phrase", pattern: "need_object", params: { object: "o_water" } }, time: "t_now" },
  "need:n_water:x_please":     { type: "phrase", pattern: "give_me_object", params: { object: "o_water" } },
  "need:n_water:x_more":       { type: "phrase", pattern: "need_object", params: { object: "o_water" } },
  "need:n_toilet:t_now":       { type: "append_time", base: { type: "build", concepts: ["I", "NEED", "GO", "BATHROOM"] }, time: "t_now" },
  "need:n_toilet:x_please":    { type: "build", concepts: ["I", "NEED", "GO", "BATHROOM"] },
  "need:n_help:t_now":         { type: "append_time", base: { type: "imperative", key: "help" }, time: "t_now" },
  "need:n_help:x_please":      { type: "imperative", key: "help" },
  "need:n_help:p_mom":         { type: "phrase", pattern: "person_help_me", params: { person: "p_mom" } },
  "need:n_help:p_dad":         { type: "phrase", pattern: "person_help_me", params: { person: "p_dad" } },
  "need:n_help:p_doctor":      { type: "phrase", pattern: "need_object", params: { object: "o_doctor" } },
  "need:n_help:p_nurse":       { type: "phrase", pattern: "need_object", params: { object: "o_nurse" } },
  "need:n_medicine:t_now":     { type: "append_time", base: { type: "phrase", pattern: "need_object", params: { object: "o_medicine" } }, time: "t_now" },
  "need:n_medicine:b_head":    { type: "phrase", pattern: "need_object", params: { object: "o_medicine" } },
  "need:n_medicine:b_stomach": { type: "phrase", pattern: "need_object", params: { object: "o_medicine" } },
  "need:n_quiet:t_now":        { type: "append_time", base: { type: "build", concepts: ["I", "NEED", "QUIET"] }, time: "t_now" },
  "need:n_sleep:t_now":        { type: "append_time", base: { type: "build", concepts: ["I", "NEED", "SLEEP"] }, time: "t_now" },
  "need:n_hug:p_mom":          { type: "phrase", pattern: "hug_from", params: { person: "p_mom" } },
  "need:n_hug:p_dad":          { type: "phrase", pattern: "hug_from", params: { person: "p_dad" } },
  "need:n_break:t_now":        { type: "append_time", base: { type: "build", concepts: ["I", "NEED", "BREAK"] }, time: "t_now" },
  "need:n_break:pl_outside":   { type: "build", concepts: ["I", "NEED", "BREAK", "OUTSIDE"] },

  // ━━ PEOPLE — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "people:pe_i":         { type: "build", concepts: ["I"] },
  "people:pe_you":       { type: "build", concepts: ["YOU"] },
  "people:pe_we":        { type: "build", concepts: ["WE"] },
  "people:pe_they":      { type: "build", concepts: ["THEY"] },
  "people:pe_mom":       { type: "composite", recipes: [{ type: "phrase_key", section: "person_names", key: "p_mom" }, { type: "phrase", pattern: "question_where_person", params: { person: "p_mom" } }] },
  "people:pe_dad":       { type: "composite", recipes: [{ type: "phrase_key", section: "person_names", key: "p_dad" }, { type: "phrase", pattern: "question_where_person", params: { person: "p_dad" } }] },
  "people:pe_brother":   { type: "phrase_key", section: "person_names", key: "p_brother" },
  "people:pe_sister":    { type: "phrase_key", section: "person_names", key: "p_sister" },
  "people:pe_grandma":   { type: "phrase_key", section: "person_names", key: "p_grandma" },
  "people:pe_grandpa":   { type: "phrase_key", section: "person_names", key: "p_grandpa" },
  "people:pe_friend":    { type: "composite", recipes: [{ type: "phrase_key", section: "person_names", key: "p_friend" }, { type: "phrase", pattern: "question_where_person", params: { person: "p_friend" } }] },
  "people:pe_teacher":   { type: "phrase_key", section: "person_names", key: "p_teacher" },
  "people:pe_nurse":     { type: "phrase_key", section: "person_names", key: "p_nurse" },
  "people:pe_therapist": { type: "phrase_key", section: "person_names", key: "p_therapist" },

  // ── PEOPLE — self-states
  "people:pe_i:st_ready":   { type: "build", concepts: ["I", "READY"] },
  "people:pe_i:st_here":    { type: "build", concepts: ["I", "HERE"] },
  "people:pe_i:st_coming":  { type: "build", concepts: ["I", "COME"] },
  "people:pe_i:st_leaving": { type: "build", concepts: ["I", "GO"] },
  "people:pe_i:st_hungry":  { type: "build", concepts: ["I", "HUNGRY"] },
  "people:pe_i:st_thirsty": { type: "build", concepts: ["I", "THIRSTY"] },
  "people:pe_i:st_tired":   { type: "build", concepts: ["I", "TIRED"] },
  "people:pe_i:st_ok":      { type: "social", key: "ok" },
  "people:pe_i:st_notok":   { type: "build", concepts: ["I", "NOT", "GOOD"] },
  "people:pe_i:st_busy":    { type: "build", concepts: ["I", "BUSY"] },
  "people:pe_i:st_waiting": { type: "build", concepts: ["I", "WAIT"] },
  "people:pe_i:st_lost":    { type: "build", concepts: ["I", "LOST"] },

  // ── PEOPLE — predicates about others
  "people:pe_mom:pr_here":     { type: "person_state", state: "here",   person: "p_mom" },
  "people:pe_mom:pr_coming":   { type: "person_state", state: "coming", person: "p_mom" },
  "people:pe_mom:pr_gone":     { type: "person_state", state: "gone",   person: "p_mom" },
  "people:pe_mom:pr_where":    { type: "phrase", pattern: "question_where_person", params: { person: "p_mom" } },
  "people:pe_mom:pr_call":     { type: "phrase", pattern: "person_help_me", params: { person: "p_mom" } },
  "people:pe_dad:pr_here":     { type: "person_state", state: "here",   person: "p_dad" },
  "people:pe_dad:pr_coming":   { type: "person_state", state: "coming", person: "p_dad" },
  "people:pe_dad:pr_gone":     { type: "person_state", state: "gone",   person: "p_dad" },
  "people:pe_dad:pr_where":    { type: "phrase", pattern: "question_where_person", params: { person: "p_dad" } },
  "people:pe_dad:pr_call":     { type: "phrase", pattern: "person_help_me", params: { person: "p_dad" } },
  "people:pe_friend:pr_here":  { type: "person_state", state: "here",   person: "p_friend" },
  "people:pe_friend:pr_where": { type: "phrase", pattern: "question_where_person", params: { person: "p_friend" } },

  // ━━ DO — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "do:d_stop":   { type: "imperative", key: "stop" },
  "do:d_help":   { type: "imperative", key: "help" },
  "do:d_go":     { type: "build", concepts: ["I", "WANT", "GO"] },
  "do:d_come":   { type: "imperative", key: "come" },
  "do:d_give":   { type: "imperative", key: "give" },
  "do:d_turn":   { type: "imperative", key: "turn" },
  "do:d_eat":    { type: "build", concepts: ["I", "WANT", "EAT"] },
  "do:d_drink":  { type: "build", concepts: ["I", "WANT", "DRINK"] },
  "do:d_play":   { type: "build", concepts: ["I", "WANT", "PLAY"] },
  "do:d_watch":  { type: "build", concepts: ["I", "WANT", "WATCH"] },
  "do:d_open":   { type: "imperative", key: "open" },
  "do:d_make":   { type: "build", concepts: ["I", "WANT", "MAKE"] },
  "do:d_read":   { type: "composite", recipes: [{ type: "build", concepts: ["I", "WANT", "READ"] }, { type: "imperative", key: "read" }] },
  "do:d_like":   { type: "build", concepts: ["I", "LIKE"] },
  "do:d_finish": { type: "build", concepts: ["I", "FINISH"] },

  // ── DO — objects
  "do:d_eat:n3_apple":   { type: "build", concepts: ["I", "WANT", "EAT", "APPLE"] },
  "do:d_eat:n3_bread":   { type: "build", concepts: ["I", "WANT", "EAT", "BREAD"] },
  "do:d_eat:n3_pasta":   { type: "build", concepts: ["I", "WANT", "EAT", "PASTA"] },
  "do:d_eat:n3_soup":    { type: "build", concepts: ["I", "WANT", "EAT", "SOUP"] },
  "do:d_eat:n3_snack":   { type: "build", concepts: ["I", "WANT", "EAT", "SNACK"] },
  "do:d_drink:n3_juice": { type: "build", concepts: ["I", "WANT", "DRINK", "JUICE"] },
  "do:d_drink:n3_milk":  { type: "build", concepts: ["I", "WANT", "DRINK", "MILK"] },
  "do:d_drink:n3_tea":   { type: "build", concepts: ["I", "WANT", "DRINK", "TEA"] },
  "do:d_play:o_game":    { type: "build", concepts: ["I", "WANT", "PLAY", "GAME"] },
  "do:d_play:o_ball":    { type: "build", concepts: ["I", "WANT", "PLAY", "BALL"] },
  "do:d_play:o_toy":     { type: "build", concepts: ["I", "WANT", "PLAY", "TOY"] },
  "do:d_play:o_music":   { type: "build", concepts: ["I", "WANT", "PLAY", "MUSIC"] },
  "do:d_watch:o_tv":     { type: "build", concepts: ["I", "WANT", "WATCH", "TV"] },
  "do:d_watch:o_game":   { type: "build", concepts: ["I", "WANT", "WATCH", "GAME"] },
  "do:d_open:o_door":    { type: "phrase", pattern: "open_object", params: { object: "o_door" } },
  "do:d_open:o_window":  { type: "phrase", pattern: "open_object", params: { object: "o_window" } },
  "do:d_open:o_bag":     { type: "phrase", pattern: "open_object", params: { object: "o_bag" } },
  "do:d_read:o_book":    { type: "build", concepts: ["I", "WANT", "READ", "BOOK"] },
  "do:d_give:o_water":   { type: "phrase", pattern: "give_me_object", params: { object: "o_water" } },
  "do:d_give:o_food":    { type: "phrase", pattern: "give_me_object", params: { object: "o_food" } },
  "do:d_give:o_phone":   { type: "phrase", pattern: "give_me_object", params: { object: "o_phone" } },

  // ── DO — polarity/time/place
  "do:d_stop:t_now":      { type: "append_time", base: { type: "imperative", key: "stop" }, time: "t_now" },
  "do:d_stop:x_please":   { type: "imperative", key: "stop" },
  "do:d_help:t_now":      { type: "append_time", base: { type: "imperative", key: "help" }, time: "t_now" },
  "do:d_help:x_please":   { type: "imperative", key: "help" },
  "do:d_go:pl_home":      { type: "phrase", pattern: "want_go_place", params: { place: "pl_home" } },
  "do:d_go:pl_school":    { type: "phrase", pattern: "want_go_place", params: { place: "pl_school" } },
  "do:d_go:pl_outside":   { type: "phrase", pattern: "want_go_place", params: { place: "pl_outside" } },
  "do:d_go:pl_park":      { type: "phrase", pattern: "want_go_place", params: { place: "pl_park" } },
  "do:d_go:t_now":        { type: "append_time", base: { type: "build", concepts: ["I", "WANT", "GO"] }, time: "t_now" },
  "do:d_come:pl_here":    { type: "imperative", key: "come" },
  "do:d_finish:x_done":   { type: "build", concepts: ["I", "FINISH"] },
  "do:d_finish:x_not":    { type: "build", concepts: ["I", "NOT", "FINISH"] },
  "do:d_like:x_not":      { type: "build", concepts: ["I", "NOT", "LIKE"] },
  "do:d_like:x_very":     { type: "build", concepts: ["I", "LIKE", "VERY"] },

  // ── DO — people
  "do:d_play:p_friend":   { type: "phrase", pattern: "play_with_person", params: { person: "p_friend" } },
  "do:d_play:p_brother":  { type: "phrase", pattern: "play_with_person", params: { person: "p_brother" } },
  "do:d_play:p_sister":   { type: "phrase", pattern: "play_with_person", params: { person: "p_sister" } },
  "do:d_help:p_mom":      { type: "phrase", pattern: "person_help_me", params: { person: "p_mom" } },
  "do:d_help:p_dad":      { type: "phrase", pattern: "person_help_me", params: { person: "p_dad" } },

  // ━━ TALK — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "talk:s_hello":      { type: "social", key: "hello" },
  "talk:s_bye":        { type: "social", key: "bye" },
  "talk:s_yes":        { type: "social", key: "yes" },
  "talk:s_no":         { type: "social", key: "no" },
  "talk:s_please":     { type: "social", key: "please" },
  "talk:s_thanks":     { type: "social", key: "thanks" },
  "talk:s_sorry":      { type: "social", key: "sorry" },
  "talk:s_ok":         { type: "social", key: "ok" },
  "talk:s_idk":        { type: "social", key: "idk" },
  "talk:s_wait":       { type: "imperative", key: "wait" },
  "talk:s_understand": { type: "social", key: "understand" },
  "talk:s_tell":       { type: "imperative", key: "tell" },
  "talk:s_ask":        { type: "build", concepts: ["I", "WANT", "ASK"] },
  "talk:s_repeat":     { type: "imperative", key: "repeat" },

  // ── TALK — L3
  "talk:s_hello:p_friend":     { type: "phrase", pattern: "hello_person", params: { person: "p_friend" } },
  "talk:s_hello:p_everyone":   { type: "phrase", pattern: "hello_person", params: { person: "p_everyone" } },
  "talk:s_bye:p_friend":       { type: "phrase", pattern: "bye_person", params: { person: "p_friend" } },
  "talk:s_bye:p_everyone":     { type: "phrase", pattern: "bye_person", params: { person: "p_everyone" } },
  "talk:s_yes:t_now":          { type: "social", key: "yes" },
  "talk:s_no:x_not":           { type: "social", key: "no" },
  "talk:s_wait:t_minute":      { type: "imperative", key: "wait" },
  "talk:s_wait:x_please":      { type: "imperative", key: "wait" },
  "talk:s_understand:x_not":   { type: "social", key: "not_understand" },
  "talk:s_understand:x_little":{ type: "social", key: "understand" },
  "talk:s_repeat:x_please":    { type: "imperative", key: "repeat" },
  "talk:s_sorry:p_mom":        { type: "phrase", pattern: "sorry_person", params: { person: "p_mom" } },
  "talk:s_sorry:p_dad":        { type: "phrase", pattern: "sorry_person", params: { person: "p_dad" } },
  "talk:s_thanks:p_mom":       { type: "phrase", pattern: "thanks_person", params: { person: "p_mom" } },
  "talk:s_thanks:p_dad":       { type: "phrase", pattern: "thanks_person", params: { person: "p_dad" } },
  "talk:s_thanks:p_doctor":    { type: "phrase", pattern: "thanks_person", params: { person: "p_doctor" } },

  // ━━ PLACE — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "place:lc_home":     { type: "phrase", pattern: "want_go_place", params: { place: "pl_home" } },
  "place:lc_school":   { type: "phrase", pattern: "want_go_place", params: { place: "pl_school" } },
  "place:lc_hospital": { type: "build", concepts: ["I", "NEED", "GO", "HOSPITAL"] },
  "place:lc_outside":  { type: "phrase", pattern: "want_go_place", params: { place: "pl_outside" } },
  "place:lc_store":    { type: "build", concepts: ["I", "WANT", "GO", "STORE"] },
  "place:lc_restau":   { type: "build", concepts: ["I", "WANT", "GO", "RESTAURANT"] },
  "place:lc_car":      { type: "build", concepts: ["I", "WANT", "GO", "CAR"] },
  "place:lc_bus":      { type: "build", concepts: ["I", "WANT", "GO", "BUS"] },
  "place:lc_bathroom": { type: "build", concepts: ["I", "NEED", "GO", "BATHROOM"] },
  "place:lc_park":     { type: "phrase", pattern: "want_go_place", params: { place: "pl_park" } },
  "place:lc_here":     { type: "build", concepts: ["I", "HERE"] },
  "place:lc_there":    { type: "build", concepts: ["I", "WANT", "GO", "THERE"] },
  "place:lc_bedroom":  { type: "build", concepts: ["I", "WANT", "GO", "BEDROOM"] },

  // ── PLACE — sub-places (use want_go with sub_places)
  "place:lc_home:lc3_kitchen":    { type: "build", concepts: ["I", "WANT", "GO", "KITCHEN"] },
  "place:lc_home:lc3_bedroom":    { type: "build", concepts: ["I", "WANT", "GO", "BEDROOM"] },
  "place:lc_home:lc3_bathroom":   { type: "build", concepts: ["I", "NEED", "GO", "BATHROOM"] },
  "place:lc_home:lc3_living":     { type: "build", concepts: ["I", "WANT", "GO", "LIVING_ROOM"] },
  "place:lc_home:lc3_garden":     { type: "build", concepts: ["I", "WANT", "GO", "GARDEN"] },
  "place:lc_school:lc3_class":    { type: "build", concepts: ["I", "WANT", "GO", "CLASS"] },
  "place:lc_school:lc3_gym":      { type: "build", concepts: ["I", "WANT", "GO", "GYM"] },
  "place:lc_school:lc3_library":  { type: "build", concepts: ["I", "WANT", "GO", "LIBRARY"] },
  "place:lc_school:lc3_cafet":    { type: "build", concepts: ["I", "WANT", "GO", "CAFETERIA"] },
  "place:lc_school:lc3_playground":{ type: "build", concepts: ["I", "WANT", "GO", "PLAYGROUND"] },
  "place:lc_hospital:lc3_room":   { type: "build", concepts: ["I", "WANT", "GO", "ROOM"] },
  "place:lc_hospital:lc3_waiting":{ type: "build", concepts: ["I", "HERE", "WAITING_ROOM"] },
  "place:lc_hospital:lc3_pharmacy":{ type: "build", concepts: ["I", "NEED", "GO", "PHARMACY"] },
  "place:lc_park:lc3_swing":      { type: "build", concepts: ["I", "WANT", "GO", "SWING"] },
  "place:lc_park:lc3_slide":      { type: "build", concepts: ["I", "WANT", "GO", "SLIDE"] },

  // ── PLACE — time
  "place:lc_home:t_now":    { type: "append_time", base: { type: "phrase", pattern: "want_go_place", params: { place: "pl_home" } }, time: "t_now" },
  "place:lc_home:t_soon":   { type: "append_time", base: { type: "phrase", pattern: "want_go_place", params: { place: "pl_home" } }, time: "t_soon" },
  "place:lc_school:t_now":  { type: "append_time", base: { type: "phrase", pattern: "want_go_place", params: { place: "pl_school" } }, time: "t_now" },

  // ━━ QUESTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "question:q_what":      { type: "phrase_key", section: "question_what", key: "generic" },
  "question:q_where":     { type: "phrase_key", section: "question_what", key: "generic" },
  "question:q_when":      { type: "phrase_key", section: "question_when_events", key: "start" },
  "question:q_who":       { type: "phrase_key", section: "question_who", key: "generic" },
  "question:q_why":       { type: "phrase_key", section: "question_why", key: "generic" },
  "question:q_how":       { type: "phrase_key", section: "question_how", key: "generic" },
  "question:q_howmuch":   { type: "phrase_key", section: "question_how", key: "howmuch" },
  "question:q_howmany":   { type: "phrase_key", section: "question_how", key: "howmany" },
  "question:q_canI":      { type: "phrase_key", section: "question_canI_actions", key: "go" },
  "question:q_canYou":    { type: "phrase_key", section: "question_canYou_actions", key: "help" },
  "question:q_doYouHave": { type: "phrase_key", section: "question_doYouHave", key: "generic" },
  "question:q_isIt":      { type: "phrase_key", section: "question_isIt", key: "generic" },

  // ── QUESTION — L3
  "question:q_what:q3_this":       { type: "phrase_key", section: "question_what", key: "this" },
  "question:q_what:q3_that":       { type: "phrase_key", section: "question_what", key: "that" },
  "question:q_what:q3_happened":   { type: "phrase_key", section: "question_what", key: "happened" },
  "question:q_what:q3_wrong":      { type: "phrase_key", section: "question_what", key: "wrong" },
  "question:q_what:q3_forlunch":   { type: "phrase_key", section: "question_what", key: "forlunch" },
  "question:q_what:q3_fordinner":  { type: "phrase_key", section: "question_what", key: "fordinner" },
  "question:q_what:q3_next":       { type: "phrase_key", section: "question_what", key: "next" },
  "question:q_where:p_mom":        { type: "phrase", pattern: "question_where_person", params: { person: "p_mom" } },
  "question:q_where:p_dad":        { type: "phrase", pattern: "question_where_person", params: { person: "p_dad" } },
  "question:q_where:p_friend":     { type: "phrase", pattern: "question_where_person", params: { person: "p_friend" } },
  "question:q_where:p_teacher":    { type: "phrase", pattern: "question_where_person", params: { person: "p_teacher" } },
  "question:q_where:pl_home":      { type: "phrase", pattern: "question_where_person", params: { person: "p_home" } },
  "question:q_where:o_phone":      { type: "phrase", pattern: "question_where_object", params: { object: "o_phone" } },
  "question:q_when:q3_gohome":     { type: "phrase_key", section: "question_when_events", key: "gohome" },
  "question:q_when:q3_lunch":      { type: "phrase_key", section: "question_when_events", key: "lunch" },
  "question:q_when:q3_over":       { type: "phrase_key", section: "question_when_events", key: "over" },
  "question:q_when:q3_start":      { type: "phrase_key", section: "question_when_events", key: "start" },
  "question:q_when:q3_recess":     { type: "phrase_key", section: "question_when_events", key: "recess" },
  "question:q_who:q3_didthis":     { type: "phrase_key", section: "question_who", key: "didthis" },
  "question:q_who:q3_talking":     { type: "phrase_key", section: "question_who", key: "talking" },
  "question:q_who:q3_iscoming":    { type: "phrase_key", section: "question_who", key: "iscoming" },
  "question:q_who:q3_canhelp":     { type: "phrase_key", section: "question_who", key: "canhelp" },
  "question:q_why:q3_whynot":      { type: "phrase_key", section: "question_why", key: "whynot" },
  "question:q_why:q3_cantI":       { type: "phrase_key", section: "question_why", key: "cantI" },
  "question:q_why:q3_whyangry":    { type: "phrase_key", section: "question_why", key: "whyangry" },
  "question:q_why:q3_whycrying":   { type: "phrase_key", section: "question_why", key: "whycrying" },
  "question:q_how:q3_do":          { type: "phrase_key", section: "question_how", key: "do" },
  "question:q_how:q3_say":         { type: "phrase_key", section: "question_how", key: "say" },
  "question:q_how:q3_spell":       { type: "phrase_key", section: "question_how", key: "spell" },
  "question:q_how:q3_getthere":    { type: "phrase_key", section: "question_how", key: "getthere" },
  "question:q_canI:q3_cigo":       { type: "phrase_key", section: "question_canI_actions", key: "go" },
  "question:q_canI:q3_cihave":     { type: "phrase_key", section: "question_canI_actions", key: "have" },
  "question:q_canI:q3_ciplay":     { type: "phrase_key", section: "question_canI_actions", key: "play" },
  "question:q_canI:q3_cieat":      { type: "phrase_key", section: "question_canI_actions", key: "eat" },
  "question:q_canI:q3_cidrink":    { type: "phrase_key", section: "question_canI_actions", key: "drink" },
  "question:q_canI:q3_ciwatch":    { type: "phrase_key", section: "question_canI_actions", key: "watch" },
  "question:q_canYou:q3_cyhelp":   { type: "phrase_key", section: "question_canYou_actions", key: "help" },
  "question:q_canYou:q3_cyshow":   { type: "phrase_key", section: "question_canYou_actions", key: "show" },
  "question:q_canYou:q3_cytell":   { type: "phrase_key", section: "question_canYou_actions", key: "tell" },
  "question:q_canYou:q3_cyrepeat": { type: "phrase_key", section: "question_canYou_actions", key: "repeat" },
  "question:q_canYou:q3_cygive":   { type: "phrase_key", section: "question_canYou_actions", key: "give" },
  "question:q_canYou:q3_cyopen":   { type: "phrase_key", section: "question_canYou_actions", key: "open" },
  "question:q_doYouHave:o_water":  { type: "phrase_key", section: "question_doYouHave", key: "water" },
  "question:q_doYouHave:o_food":   { type: "phrase_key", section: "question_doYouHave", key: "food" },
  "question:q_doYouHave:o_medicine":{ type: "phrase_key", section: "question_doYouHave", key: "medicine" },
  "question:q_isIt:q3_next":       { type: "phrase_key", section: "question_isIt", key: "next" },
  "question:q_isIt:q3_wrong":      { type: "phrase_key", section: "question_isIt", key: "wrong" },

  // ━━ DESCRIBE — L2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "describe:dc_good":   { type: "build", concepts: ["GOOD"] },
  "describe:dc_bad":    { type: "build", concepts: ["BAD"] },
  "describe:dc_ready":  { type: "build", concepts: ["I", "READY"] },
  "describe:dc_nice":   { type: "build", concepts: ["GOOD"] },
  "describe:dc_big":    { type: "build", concepts: ["BIG"] },
  "describe:dc_small":  { type: "build", concepts: ["SMALL"] },
  "describe:dc_hot":    { type: "build", concepts: ["HOT"] },
  "describe:dc_cold":   { type: "build", concepts: ["COLD"] },
  "describe:dc_new":    { type: "build", concepts: ["NEW"] },
  "describe:dc_old":    { type: "build", concepts: ["OLD"] },
  "describe:dc_loud":   { type: "build", concepts: ["LOUD"] },
  "describe:dc_quiet":  { type: "build", concepts: ["QUIET"] },
  "describe:dc_broken": { type: "build", concepts: ["BROKEN"] },
  "describe:dc_same":   { type: "build", concepts: ["SAME"] },

  // ── DESCRIBE — L3
  "describe:dc_good:x_very":    { type: "build", concepts: ["GOOD", "VERY"] },
  "describe:dc_good:x_not":     { type: "build", concepts: ["NOT", "GOOD"] },
  "describe:dc_bad:x_very":     { type: "build", concepts: ["BAD", "VERY"] },
  "describe:dc_hot:x_very":     { type: "build", concepts: ["HOT", "VERY"] },
  "describe:dc_hot:x_not":      { type: "build", concepts: ["NOT", "HOT"] },
  "describe:dc_cold:x_very":    { type: "build", concepts: ["COLD", "VERY"] },
  "describe:dc_cold:x_not":     { type: "build", concepts: ["NOT", "COLD"] },
  "describe:dc_loud:x_very":    { type: "build", concepts: ["LOUD", "VERY"] },
  "describe:dc_ready:x_not":    { type: "build", concepts: ["I", "NOT", "READY"] },
  "describe:dc_ready:t_now":    { type: "append_time", base: { type: "build", concepts: ["I", "READY"] }, time: "t_now" },
  "describe:dc_broken:o_phone": { type: "build", concepts: ["PHONE", "BROKEN"] },
  "describe:dc_broken:o_toy":   { type: "build", concepts: ["TOY", "BROKEN"] },
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate localized sentence suggestions for a template key.
 *
 * @param {string} templateKey - e.g. "feel:f_hurt:b_head"
 * @param {string} lang - language code (en, es, fr, de, it, pt, ar, zh, ja, ko)
 * @returns {string[]} 1–3 sentence suggestions
 */
export function generateTemplate(templateKey, lang = "en") {
  const recipe = RECIPE_MAP[templateKey];
  if (!recipe) return [];

  const results = resolveRecipe(recipe, lang);
  return normalizeSuggestions(results);
}

/**
 * Derive an L3 suggestion from an L2 recipe when the modifier is temporal.
 * This keeps strict L3 semantics while avoiding empty results for valid
 * "L2 + time" combinations that don't have explicit key3 recipes.
 *
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} l3Id
 * @param {string} lang
 * @returns {string[]}
 */
export function generateTemplateFromL2Modifier(l1Id, l2Id, l3Id, lang = "en") {
  if (!l1Id || !l2Id || !l3Id) return [];
  if (!isTimeModifier(l3Id)) return [];

  const key2 = `${l1Id}:${l2Id}`;
  const baseRecipe = RECIPE_MAP[key2];
  if (!baseRecipe) return [];

  const results = resolveRecipe({
    type: "append_time",
    base: baseRecipe,
    time: l3Id,
  }, lang);

  return normalizeSuggestions(results);
}

// ── Compositional Grammar ───────────────────────────────────────────────────
// Auto-compose a recipe for any L2+L3 combination using the L3 modifier type
// and the L2 base recipe. This covers the ~70% of combinations that don't have
// explicit RECIPE_MAP entries.

/** Detect L3 modifier type from its ID prefix */
function detectModifierType(l3Id) {
  if (!l3Id || typeof l3Id !== "string") return null;
  if (l3Id.startsWith("t_"))   return "time";
  if (l3Id.startsWith("p_"))   return "person";
  if (l3Id.startsWith("x_"))   return "intensity";
  if (l3Id.startsWith("pl_"))  return "place";
  if (l3Id.startsWith("b_"))   return "body";
  if (l3Id.startsWith("o_"))   return "object";
  if (l3Id.startsWith("n3_"))  return "food";
  if (l3Id.startsWith("num_")) return "number";
  if (l3Id.startsWith("lc3_")) return "subplace";
  if (l3Id.startsWith("col_")) return "color";
  return null;
}

/**
 * Compose intensity (very/a little/not) onto a base recipe.
 */
function composeIntensity(baseRecipe, l3Id) {
  const intensityMap = { x_very: "VERY", x_little: "A_LITTLE", x_not: "NOT", x_more: "VERY" };
  const op = intensityMap[l3Id];
  if (!op || !baseRecipe) return null;
  if (baseRecipe.type === "build") {
    const concepts = [...asArray(baseRecipe.concepts)];
    // Insert operator before the predicate (after subject)
    if (op === "NOT") {
      // NOT goes after subject: [I, NOT, HAPPY]
      if (concepts.length >= 2) concepts.splice(1, 0, op);
      else concepts.unshift(op);
    } else {
      // VERY/A_LITTLE goes at the end: [I, HAPPY, VERY]
      concepts.push(op);
    }
    return { type: "build", concepts };
  }
  return null;
}

/**
 * Compose a person modifier onto a base recipe.
 * Generates patterns like "I feel sad about {person}" or "angry at {person}".
 */
function composePerson(baseRecipe, l3Id, l1Id) {
  if (!baseRecipe) return null;
  // For feel category, use person-specific phrase patterns
  if (l1Id === "feel") {
    return { type: "phrase", pattern: "miss_person", params: { person: l3Id } };
  }
  // For general use, append person name to base
  if (baseRecipe.type === "build") {
    return {
      type: "composite",
      recipes: [
        baseRecipe,
        { type: "person_ref", person: l3Id },
      ],
    };
  }
  return null;
}

/**
 * Compose a place modifier onto a base recipe.
 * Generates "I want to go {place}" or appends location context.
 */
function composePlace(baseRecipe, l3Id) {
  if (!baseRecipe) return null;
  const placeConcept = mapPlaceIdToConcept(l3Id);
  if (placeConcept && baseRecipe.type === "build") {
    return { type: "build", concepts: [...asArray(baseRecipe.concepts), placeConcept] };
  }
  // Fall back to locative phrase append
  return {
    type: "composite",
    recipes: [baseRecipe, { type: "phrase", pattern: "want_go_place", params: { place: l3Id } }],
  };
}

/**
 * Compose a body-part modifier onto a base recipe.
 * Generates "My {body} hurts" patterns.
 */
function composeBody(baseRecipe, l3Id) {
  if (!baseRecipe) return null;
  return { type: "phrase", pattern: "body_pain", params: { body: l3Id } };
}

/**
 * Compose an object modifier onto a base recipe.
 */
function composeObject(baseRecipe, l3Id) {
  if (!baseRecipe) return null;
  const concept = mapObjectIdToConcept(l3Id);
  if (concept && baseRecipe.type === "build") {
    return { type: "build", concepts: [...asArray(baseRecipe.concepts), concept] };
  }
  return null;
}

/**
 * Compose a food item modifier onto a base recipe.
 */
function composeFood(baseRecipe, l3Id, lang) {
  if (!baseRecipe) return null;
  // Append food item name to the base sentence
  return {
    type: "composite",
    recipes: [baseRecipe, { type: "phrase", pattern: "want_food", params: { food: l3Id } }],
  };
}

/**
 * Auto-compose a recipe for an L2+L3 combination using modifier type inference.
 * This is the fallback when no explicit L3 recipe exists in RECIPE_MAP.
 *
 * @param {string} l1Id
 * @param {string} l2Id
 * @param {string} l3Id
 * @param {string} lang
 * @returns {string[]}
 */
export function composeFromModifier(l1Id, l2Id, l3Id, lang = "en") {
  if (!l1Id || !l2Id || !l3Id) return [];

  const modType = detectModifierType(l3Id);
  if (!modType) return [];

  // Time modifiers are handled by generateTemplateFromL2Modifier
  if (modType === "time") return [];

  const key2 = `${l1Id}:${l2Id}`;
  const baseRecipe = RECIPE_MAP[key2];
  if (!baseRecipe) return [];

  let composed = null;
  switch (modType) {
    case "intensity": composed = composeIntensity(baseRecipe, l3Id); break;
    case "person":    composed = composePerson(baseRecipe, l3Id, l1Id); break;
    case "place":     composed = composePlace(baseRecipe, l3Id); break;
    case "body":      composed = composeBody(baseRecipe, l3Id); break;
    case "object":    composed = composeObject(baseRecipe, l3Id); break;
    case "food":      composed = composeFood(baseRecipe, l3Id, lang); break;
    default: return [];
  }

  if (!composed) return [];
  const results = resolveRecipe(composed, lang);
  return normalizeSuggestions(results);
}

/**
 * Check if a template key has a recipe defined.
 * @param {string} templateKey
 * @returns {boolean}
 */
export function hasRecipe(templateKey) {
  return templateKey in RECIPE_MAP;
}

/**
 * Get all defined recipe keys (for auditing/testing).
 * @returns {string[]}
 */
export function getRecipeKeys() {
  return Object.keys(RECIPE_MAP);
}
