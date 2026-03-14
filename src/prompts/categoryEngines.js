/**
 * categoryEngines.js — Per-category sentence generators.
 *
 * These produce proper grammatical sentences for categories where the generic
 * POS-template system falls short. Currently handles:
 *
 *   QUESTION — WH-question words need copulas and proper question structure.
 *              Generic templates produce "what this?" instead of "What is this?"
 *
 * Supports English and French. The `lang` parameter selects the language.
 * `mod` is the already-translated label for the target language.
 * `modCanon` is the English canonical label, used for template dispatch.
 */

import { NOUN_GRAMMAR, PLACE_PREPOSITIONS } from "./heuristicData.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return the French definite noun form ("le téléphone", "la musique") or fall back to bare mod. */
function frDef(modCanon) {
  return NOUN_GRAMMAR.fr?.[modCanon?.toLowerCase()]?.def ?? null;
}

/** Return the French locative form ("à la maison", "à l'école") or fall back with "à". */
function frLoc(mod, modCanon) {
  const loc = NOUN_GRAMMAR.fr?.[modCanon?.toLowerCase()]?.loc
    ?? PLACE_PREPOSITIONS.fr?.[modCanon?.toLowerCase()];
  if (loc) return loc;
  // "here"/"there"/"outside" don't need a preposition
  const bare = mod.toLowerCase();
  if (["ici", "là-bas", "dehors", "dedans"].includes(bare)) return mod;
  return `à ${mod}`;
}

/** Handle French elision: "de aller" → "d'aller", "de avoir" → "d'avoir" */
function frDe(word) {
  return /^[aeiouhâêîôûéèùà]/i.test(word) ? `d'${word}` : `de ${word}`;
}

// ── Lookup tables (English) ───────────────────────────────────────────────────

// "what" + these detail labels → "What is {mod}?" pattern
const WHAT_IS_TOPICS = new Set([
  "this", "that", "wrong", "for lunch", "for dinner", "next", "your name",
]);

// "when" + these detail labels → "When is {mod}?" pattern
const WHEN_IS_TOPICS = new Set(["lunch", "bedtime", "the doctor", "recess"]);

// "who" + WHO_CONTEXT detail labels → specific sentences
const WHO_TEMPLATES = {
  "did this":   ["Who did this?", "I want to know who did this", "Who is responsible?"],
  "is talking": ["Who is talking?", "Who said that?"],
  "is coming":  ["Who is coming?", "Who will be here?"],
  "is that":    ["Who is that?", "Who is it?"],
  "can help":   ["Who can help?", "Who can help me?", "I need someone to help"],
  "is it for":  ["Who is it for?", "Who gets this?"],
};

// "why" + WHY_CONTEXT detail labels → specific sentences
const WHY_TEMPLATES = {
  "not":      ["Why not?", "Why can't I?", "Tell me why not"],
  "can't i":  ["Why can't I?", "Why am I not allowed?", "I want to know why"],
  "angry":    ["Why are you angry?", "What made you angry?", "Why am I angry?"],
  "crying":   ["Why are you crying?", "What's wrong?", "Are you okay?"],
  "leaving":  ["Why are we leaving?", "Why are you leaving?", "Do we have to leave?"],
  "here":     ["Why are we here?", "What are we doing here?", "I don't know why we're here"],
};

// "how" + QUESTION_HOW_TOPICS action labels → specific sentences
const HOW_ACTION_TEMPLATES = {
  "do this":   ["How do I do this?", "Can you show me how to do this?", "I don't know how to do this"],
  "say it":    ["How do you say it?", "How do I say this?", "What is the right way to say it?"],
  "spell it":  ["How do you spell it?", "How do I spell this?"],
  "use it":    ["How do I use it?", "How does it work?", "Can you show me how to use it?"],
  "get there": ["How do I get there?", "How do we get there?", "What's the way to get there?"],
  "you feel":  ["How do you feel?", "How are you feeling?", "Are you okay?"],
  "fix it":    ["How do I fix it?", "How can we fix it?", "Can you fix it?"],
  "open it":   ["How do I open it?", "How does it open?", "Can you open it?"],
};

// ── Per-question-word generators ──────────────────────────────────────────────

function genWhat(mod, modType) {
  const m = mod.toLowerCase();

  if (modType === "detail") {
    if (m === "happened")
      return ["What happened?", "What's going on?", "What just happened?", "Tell me what happened"];
    if (WHAT_IS_TOPICS.has(m))
      return [`What is ${mod}?`, `What's ${mod}?`, `Tell me what ${mod} is`, `Can you explain?`];
  }

  if (modType === "object")
    return [`What is the ${mod}?`, `What about the ${mod}?`, `Tell me about the ${mod}`];
  if (modType === "person")
    return [`What does ${mod} want?`, `What about ${mod}?`, `How is ${mod}?`];
  if (modType === "place")
    return [`What is at ${mod}?`, `What are we doing at ${mod}?`];
  if (modType === "intensity") {
    const map = {
      not:       ["What's not right?", "What is wrong?"],
      more:      ["What's more?", "What else is there?"],
      less:      ["What's less important?", "What can we skip?"],
      different: ["What is different?", "What changed?"],
    };
    return map[m] ?? [`What is ${mod}?`];
  }

  return [`What is ${mod}?`, `What about ${mod}?`, `Tell me about ${mod}`];
}

function genWhere(mod, modType) {
  if (modType === "person")
    return [`Where is ${mod}?`, `Where did ${mod} go?`, `I can't find ${mod}`, `Where is ${mod} right now?`];
  if (modType === "object")
    return [`Where is the ${mod}?`, `Where is my ${mod}?`, `Where did the ${mod} go?`, `I can't find my ${mod}`];
  if (modType === "place")
    return [`Where is ${mod}?`, `How do I get to ${mod}?`, `Where exactly is ${mod}?`];
  return [`Where is ${mod}?`, `Where did ${mod} go?`];
}

function genWhen(mod, modType) {
  const m = mod.toLowerCase();

  if (modType === "detail") {
    if (WHEN_IS_TOPICS.has(m))
      return [`When is ${mod}?`, `What time is ${mod}?`, `When does ${mod} happen?`];
    if (m === "go home")
      return ["When can I go home?", "When are we going home?", "What time are we leaving?"];
    if (m === "is this over")
      return ["When is this over?", "When does this end?", "How much longer?"];
    if (m === "does it start")
      return ["When does it start?", "What time does it start?", "When does this begin?"];
  }

  if (modType === "place")
    return [`When are we going to ${mod}?`, `When do we leave for ${mod}?`];

  return [`When is ${mod}?`, `What time is ${mod}?`];
}

function genWho(mod, modType) {
  const m = mod.toLowerCase();
  if (modType === "detail")
    return WHO_TEMPLATES[m] ?? [`Who ${mod}?`, `I want to know who ${mod}`];
  if (modType === "person")
    return [`Who is ${mod}?`, `Is that ${mod}?`, `Do you know ${mod}?`];
  return [`Who ${mod}?`, `Who is it?`, `Tell me who ${mod}`];
}

function genWhy(mod, modType) {
  const m = mod.toLowerCase();
  if (modType === "detail")
    return WHY_TEMPLATES[m] ?? [`Why ${mod}?`, `Tell me why ${mod}`];
  // QUESTION_FEELINGS (sad, angry, hurt, sick, confused) — modType is "detail" too
  return [`Why are you ${mod}?`, `Why am I ${mod}?`, `What made you feel ${mod}?`];
}

function genHow(mod, modType) {
  const m = mod.toLowerCase();
  if (modType === "action")
    return HOW_ACTION_TEMPLATES[m] ?? [`How do I ${mod}?`, `How does ${mod} work?`];
  return [`How is ${mod}?`, `How do we ${mod}?`];
}

function genHowMuch(mod, modType) {
  if (modType === "number")
    return [`How much? Is it ${mod}?`, `Is it ${mod}?`, `How much is it?`];
  if (modType === "object")
    return [`How much is the ${mod}?`, `How much does the ${mod} cost?`, `What's the price?`];
  if (modType === "intensity") {
    const map = {
      not:       ["It's not that much", "Not a lot", "Less than expected"],
      more:      ["How much more?", "Is there more?", "A little more?"],
      less:      ["How much less?", "A little less?", "Can we reduce it?"],
      different: ["How different is it?", "Is it very different?"],
    };
    return map[mod.toLowerCase()] ?? [`How much ${mod}?`];
  }
  return [`How much ${mod}?`, `How much is it?`];
}

function genHowMany(mod, modType) {
  if (modType === "number")
    return [`How many? ${mod}?`, `Is it ${mod}?`, `Are there ${mod}?`];
  if (modType === "object")
    return [`How many ${mod} are there?`, `How many ${mod} do we have?`, `How many?`];
  if (modType === "person")
    return [`How many ${mod} are there?`, `How many ${mod} are coming?`];
  return [`How many ${mod}?`, `How many are there?`];
}

function genCanI(mod, modType) {
  if (modType === "action")
    return [
      `Can I ${mod}?`,
      `Please, can I ${mod}?`,
      `Is it okay if I ${mod}?`,
      `May I ${mod}?`,
      `I want to ${mod}`,
    ];
  if (modType === "place")
    return [`Can I go to ${mod}?`, `May I go to ${mod}?`, `Is it okay if I go to ${mod}?`];
  return [`Can I ${mod}?`, `May I ${mod}?`];
}

function genCanYou(mod, modType) {
  if (modType === "action")
    return [
      `Can you ${mod}?`,
      `Please can you ${mod}?`,
      `Could you ${mod}?`,
      `I need you to ${mod}`,
      `Will you ${mod}?`,
    ];
  if (modType === "object")
    return [`Can you get me the ${mod}?`, `Can you bring me the ${mod}?`, `Do you have the ${mod}?`];
  return [`Can you ${mod}?`, `Please ${mod}`];
}

function genDoYouHave(mod, modType) {
  const startsWithVowel = /^[aeiou]/i.test(mod);
  const article = startsWithVowel ? "an" : "a";
  if (modType === "specific-item")
    return [`Do you have ${article} ${mod}?`, `Is there ${article} ${mod}?`, `Can I have ${article} ${mod}?`];
  return [`Do you have ${mod}?`, `Do you have any ${mod}?`, `Is there any ${mod}?`, `I'm looking for ${mod}`];
}

function genIsIt(mod, modType) {
  const m = mod.toLowerCase();

  if (modType === "detail") {
    const map = {
      "this":       ["Is it this?", "Is this it?", "Is this the one?"],
      "that":       ["Is it that?", "Is that it?", "Is that the one?"],
      "wrong":      ["Is something wrong?", "Is it wrong?", "Is it not okay?"],
      "for lunch":  ["Is it for lunch?", "Is this for lunch?", "Is lunch ready?"],
      "for dinner": ["Is it for dinner?", "Is this for dinner?", "Is dinner ready?"],
      "next":       ["Is it next?", "Is this happening next?", "Is it our turn?"],
      "your name":  ["Is that your name?", "Is your name right?"],
      "happened":   ["Did it happen?", "Has it happened already?"],
    };
    return map[m] ?? [`Is it ${mod}?`, `Is this ${mod}?`];
  }

  if (modType === "intensity") {
    const map = {
      not:       ["Is it not?", "Is it not okay?", "That's not right"],
      more:      ["Is there more?", "Should there be more?"],
      less:      ["Is there less?", "Is it less than before?"],
      different: ["Is it different?", "Is this different from before?"],
    };
    return map[m] ?? [`Is it ${mod}?`];
  }

  if (modType === "time")
    return [`Is it ${mod}?`, `Is it happening ${mod}?`, `Will it be ${mod}?`];

  return [`Is it ${mod}?`, `Is this ${mod}?`];
}

// ── Dispatch table ────────────────────────────────────────────────────────────

const QUESTION_GENERATORS = {
  what:          genWhat,
  where:         genWhere,
  when:          genWhen,
  who:           genWho,
  why:           genWhy,
  how:           genHow,
  "how much":    genHowMuch,
  "how many":    genHowMany,
  "can i":       genCanI,
  "can you":     genCanYou,
  "do you have": genDoYouHave,
  "is it":       genIsIt,
};

// ── French lookup tables ──────────────────────────────────────────────────────

const WHO_TEMPLATES_FR = {
  "did this":   ["Qui a fait ça ?", "Je veux savoir qui a fait ça", "C'est qui qui a fait ça ?"],
  "is talking": ["Qui parle ?", "Qui a dit ça ?", "C'est qui qui parle ?"],
  "is coming":  ["Qui arrive ?", "Qui vient ?", "Qui va venir ?"],
  "is that":    ["Qui est-ce ?", "C'est qui ?", "Qui c'est ?"],
  "can help":   ["Qui peut aider ?", "Qui peut m'aider ?", "J'ai besoin que quelqu'un m'aide"],
  "is it for":  ["C'est pour qui ?", "Pour qui est-ce ?", "À qui c'est ?"],
};

const WHY_TEMPLATES_FR = {
  "not":      ["Pourquoi pas ?", "Pourquoi je ne peux pas ?", "Dis-moi pourquoi pas"],
  "can't i":  ["Pourquoi je ne peux pas ?", "Pourquoi je n'ai pas le droit ?", "Je veux savoir pourquoi"],
  "angry":    ["Pourquoi es-tu fâché ?", "Qu'est-ce qui t'a mis en colère ?", "Pourquoi suis-je fâché ?"],
  "crying":   ["Pourquoi tu pleures ?", "Qu'est-ce qui ne va pas ?", "Ça va ?"],
  "leaving":  ["Pourquoi on part ?", "Pourquoi tu pars ?", "On doit partir ?"],
  "here":     ["Pourquoi on est ici ?", "Qu'est-ce qu'on fait ici ?", "Je ne sais pas pourquoi on est ici"],
};

const HOW_ACTION_TEMPLATES_FR = {
  "do this":   ["Comment je fais ça ?", "Tu peux me montrer comment faire ?", "Je ne sais pas comment faire"],
  "say it":    ["Comment on dit ?", "Comment je dis ça ?", "C'est quoi le bon mot ?"],
  "spell it":  ["Comment ça s'écrit ?", "Comment on épelle ?", "Ça s'écrit comment ?"],
  "use it":    ["Comment on utilise ça ?", "Comment ça marche ?", "Tu peux me montrer ?"],
  "get there": ["Comment on y va ?", "Comment j'y vais ?", "C'est par où ?"],
  "you feel":  ["Comment tu te sens ?", "Ça va ?", "Tu vas bien ?"],
  "fix it":    ["Comment on répare ça ?", "Comment on peut arranger ça ?", "Tu peux le réparer ?"],
  "open it":   ["Comment on ouvre ça ?", "Comment ça s'ouvre ?", "Tu peux l'ouvrir ?"],
};

// ── Per-question-word generators (French) ─────────────────────────────────────

function genWhat_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();

  if (modType === "detail") {
    if (mc === "happened")
      return ["Qu'est-ce qui s'est passé ?", "Que s'est-il passé ?", "Il s'est passé quoi ?", "Dis-moi ce qui s'est passé"];
    if (mc === "this" || mc === "that")
      return ["Qu'est-ce que c'est ?", "C'est quoi ?", "C'est quoi ça ?"];
    if (mc === "wrong")
      return ["Qu'est-ce qui ne va pas ?", "Il y a un problème ?", "Quelque chose ne va pas ?"];
    if (mc === "for lunch")
      return ["Qu'est-ce qu'on mange à midi ?", "C'est quoi le déjeuner ?", "On mange quoi ?"];
    if (mc === "for dinner")
      return ["Qu'est-ce qu'on mange ce soir ?", "C'est quoi le dîner ?", "On mange quoi ce soir ?"];
    if (mc === "next")
      return ["C'est quoi après ?", "Qu'est-ce qui vient ensuite ?", "On fait quoi maintenant ?"];
    if (mc === "your name")
      return ["Comment tu t'appelles ?", "C'est quoi ton nom ?", "Tu t'appelles comment ?"];
    return [`C'est quoi ${mod} ?`, `Qu'est-ce que ${mod} ?`];
  }

  if (modType === "object") {
    const def = frDef(modCanon) || mod;
    return [`C'est quoi ${def} ?`, `Qu'est-ce que c'est ${def} ?`, `Dis-moi ce que c'est`];
  }
  if (modType === "person")
    return [`Que veut ${mod} ?`, `Quoi de neuf avec ${mod} ?`, `Comment va ${mod} ?`];
  if (modType === "place")
    return [`Qu'est-ce qu'il y a à ${mod} ?`, `Que fait-on à ${mod} ?`];

  return [`C'est quoi ${mod} ?`, `Qu'est-ce que ${mod} ?`];
}

function genWhere_fr(mod, modCanon, modType) {
  if (modType === "person")
    return [`Où est ${mod} ?`, `Où est parti ${mod} ?`, `Je ne trouve pas ${mod}`, `Où est ${mod} maintenant ?`];
  if (modType === "object") {
    const def = frDef(modCanon) || mod;
    return [`Où est ${def} ?`, `Où est mon ${mod} ?`, `Je ne trouve pas ${def}`];
  }
  if (modType === "place") {
    const def = frDef(modCanon) || mod;
    return [`Où est ${def} ?`, `Comment on va à ${mod} ?`, `Où se trouve ${def} ?`];
  }
  return [`Où est ${mod} ?`, `Où est passé ${mod} ?`];
}

function genWhen_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();

  if (modType === "detail") {
    if (mc === "go home")
      return ["Quand est-ce qu'on rentre ?", "On rentre quand ?", "À quelle heure on part ?"];
    if (mc === "is this over")
      return ["Quand est-ce que c'est fini ?", "C'est bientôt fini ?", "C'est encore long ?"];
    if (mc === "does it start")
      return ["Ça commence quand ?", "À quelle heure ça commence ?", "C'est bientôt ?"];
    if (mc === "lunch")
      return ["C'est quand le déjeuner ?", "On mange à quelle heure ?", "C'est bientôt l'heure de manger ?"];
    if (mc === "bedtime")
      return ["C'est quand le coucher ?", "C'est l'heure de dormir ?", "On va au lit quand ?"];
    if (mc === "the doctor")
      return ["C'est quand le docteur ?", "Le rendez-vous c'est quand ?", "Quand est-ce qu'on va au docteur ?"];
    if (mc === "recess")
      return ["C'est quand la récréation ?", "La récré c'est quand ?", "C'est bientôt la récré ?"];
    return [`Quand est ${mod} ?`, `C'est quand ${mod} ?`];
  }

  if (modType === "place")
    return [`Quand est-ce qu'on va à ${mod} ?`, `On y va quand à ${mod} ?`];

  return [`C'est quand ${mod} ?`, `À quelle heure ${mod} ?`];
}

function genWho_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();
  if (modType === "detail")
    return WHO_TEMPLATES_FR[mc] ?? [`Qui ${mod} ?`, `Je veux savoir qui ${mod}`];
  if (modType === "person")
    return [`Qui est ${mod} ?`, `C'est ${mod} ?`, `Tu connais ${mod} ?`];
  return [`Qui ${mod} ?`, `C'est qui ?`, `Dis-moi qui ${mod}`];
}

function genWhy_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();
  if (modType === "detail") {
    const tmpl = WHY_TEMPLATES_FR[mc];
    if (tmpl) return tmpl;
    // QUESTION_FEELINGS (sad, angry, hurt, sick, confused) have detail type too
    return [`Pourquoi ${mod} ?`, `Pourquoi es-tu ${mod} ?`, `Qu'est-ce qui te rend ${mod} ?`];
  }
  return [`Pourquoi es-tu ${mod} ?`, `Pourquoi suis-je ${mod} ?`, `Qu'est-ce qui te rend ${mod} ?`];
}

function genHow_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();
  if (modType === "action")
    return HOW_ACTION_TEMPLATES_FR[mc] ?? [`Comment ${mod} ?`, `Comment on fait pour ${mod} ?`];
  return [`Comment est ${mod} ?`, `Comment on ${mod} ?`];
}

function genHowMuch_fr(mod, modCanon, modType) {
  if (modType === "number")
    return [`Combien ? C'est ${mod} ?`, `C'est ${mod} ?`, `Combien ça fait ?`];
  if (modType === "object") {
    const def = frDef(modCanon) || mod;
    return [`Combien coûte ${def} ?`, `Quel est le prix ?`, `C'est combien ?`];
  }
  return [`Combien ${mod} ?`, `C'est combien ?`];
}

function genHowMany_fr(mod, modCanon, modType) {
  if (modType === "number")
    return [`Combien ? ${mod} ?`, `C'est ${mod} ?`, `Il y en a ${mod} ?`];
  if (modType === "object")
    return [`Combien de ${mod} il y a ?`, `Combien de ${mod} on a ?`, `Combien ?`];
  if (modType === "person")
    return [`Combien de ${mod} il y a ?`, `Combien de ${mod} viennent ?`];
  return [`Combien de ${mod} ?`, `Combien il y en a ?`];
}

function genCanI_fr(mod, modCanon, modType) {
  if (modType === "action")
    return [
      `Est-ce que je peux ${mod} ?`,
      `S'il te plaît, est-ce que je peux ${mod} ?`,
      `Je peux ${mod} ?`,
      `J'ai le droit ${frDe(mod)} ?`,
      `Je voudrais ${mod}`,
    ];
  if (modType === "place") {
    const loc = frLoc(mod, modCanon);
    return [`Est-ce que je peux aller ${loc} ?`, `Je peux aller ${loc} ?`, `Je voudrais aller ${loc}`];
  }
  return [`Est-ce que je peux ${mod} ?`, `Je peux ${mod} ?`];
}

function genCanYou_fr(mod, modCanon, modType) {
  if (modType === "action")
    return [
      `Est-ce que tu peux ${mod} ?`,
      `S'il te plaît, tu peux ${mod} ?`,
      `Tu pourrais ${mod} ?`,
      `Tu veux bien ${mod} ?`,
      `Peux-tu ${mod} ?`,
    ];
  if (modType === "object") {
    const def = frDef(modCanon) || mod;
    return [`Tu peux me donner ${def} ?`, `Tu peux m'apporter ${def} ?`, `Tu as ${def} ?`];
  }
  return [`Tu peux ${mod} ?`, `S'il te plaît, ${mod}`];
}

function genDoYouHave_fr(mod, modCanon, modType) {
  const def = frDef(modCanon);
  if (modType === "specific-item") {
    const noun = def || `du ${mod}`;
    return [`Tu as ${noun} ?`, `Est-ce qu'il y a ${noun} ?`, `Je peux avoir ${noun} ?`];
  }
  const noun = def || `du ${mod}`;
  return [`Tu as ${noun} ?`, `Est-ce qu'il y a ${noun} ?`, `Je cherche ${noun}`];
}

function genIsIt_fr(mod, modCanon, modType) {
  const mc = (modCanon || mod).toLowerCase();

  if (modType === "detail") {
    const map = {
      "this":       ["C'est ça ?", "C'est celui-ci ?", "C'est bien ça ?"],
      "that":       ["C'est ça ?", "C'est celui-là ?", "C'est bien celui-là ?"],
      "wrong":      ["Il y a un problème ?", "Quelque chose ne va pas ?", "C'est pas bien ?"],
      "for lunch":  ["C'est pour le déjeuner ?", "C'est ça qu'on mange à midi ?", "Le déjeuner est prêt ?"],
      "for dinner": ["C'est pour le dîner ?", "C'est ça qu'on mange ce soir ?", "Le dîner est prêt ?"],
      "next":       ["C'est le suivant ?", "C'est notre tour ?", "C'est après ?"],
      "your name":  ["C'est ton nom ?", "Tu t'appelles comme ça ?"],
      "happened":   ["C'est arrivé ?", "Ça s'est déjà passé ?"],
    };
    return map[mc] ?? [`C'est ${mod} ?`, `Est-ce que c'est ${mod} ?`];
  }

  if (modType === "time")
    return [`C'est ${mod} ?`, `Ça se passe ${mod} ?`, `Ce sera ${mod} ?`];

  return [`C'est ${mod} ?`, `Est-ce que c'est ${mod} ?`];
}

// ── French dispatch table ─────────────────────────────────────────────────────

const QUESTION_GENERATORS_FR = {
  what:          genWhat_fr,
  where:         genWhere_fr,
  when:          genWhen_fr,
  who:           genWho_fr,
  why:           genWhy_fr,
  how:           genHow_fr,
  "how much":    genHowMuch_fr,
  "how many":    genHowMany_fr,
  "can i":       genCanI_fr,
  "can you":     genCanYou_fr,
  "do you have": genDoYouHave_fr,
  "is it":       genIsIt_fr,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate question sentences for a WH-question word + L3 modifier.
 *
 * Produces proper grammatical questions ("What is this?" / "Qu'est-ce que c'est ?")
 * instead of bare phrase-template output ("what this?").
 *
 * Returns an empty array when no specific engine matches — intentPrompt.js
 * will then fall back to the generic phrase templates.
 *
 * @param {string} kwCanon   - Canonical question word ("what","where","when",…)
 * @param {string} mod       - L3 modifier display text (translated for current language)
 * @param {string} modType   - Modifier type from hierarchy type annotation
 * @param {string} lang      - Language code ("en","fr",…)
 * @param {string} modCanon  - English canonical label for the L3 modifier
 * @returns {string[]}
 */
export function generateQuestionSentences(kwCanon, mod, modType, lang, modCanon) {
  if (!mod || !kwCanon) return [];
  const key = kwCanon.toLowerCase();

  // French: use dedicated French generators
  if (lang === "fr") {
    const fn = QUESTION_GENERATORS_FR[key];
    if (!fn) return [];
    return (fn(mod, modCanon, modType) ?? [])
      .filter(Boolean)
      .map(s => s.trim())
      .filter((s, i, a) => a.indexOf(s) === i);
  }

  // English (default): use English generators
  const fn = QUESTION_GENERATORS[key];
  if (!fn) return [];
  return (fn(mod, modType) ?? [])
    .filter(Boolean)
    .map(s => s.trim())
    .filter((s, i, a) => a.indexOf(s) === i);
}
