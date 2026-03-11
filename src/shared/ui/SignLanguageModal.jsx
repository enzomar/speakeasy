/**
 * SignLanguageModal — Sign language guide bottom sheet.
 *
 * Per-language guide, showing:
 *   • Sign-language name for the active language
 *   • One card per word: hand illustration, label, gesture description, TTS button
 *   • Full-text search
 *   • Category filter chips
 *   • Link to Spreadthesign.com for video reference (online only)
 */

import { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Search, Volume2, ExternalLink } from "lucide-react";

// ── Sign language name & Spreadthesign locale per app language ────────────────
const SIGN_LANGUAGE_META = {
  en: { name: "American Sign Language (ASL)", lang: "en.us", flag: "🇺🇸" },
  es: { name: "Lengua de Signos Española (LSE)", lang: "es", flag: "🇪🇸" },
  fr: { name: "Langue des Signes Française (LSF)", lang: "fr", flag: "🇫🇷" },
  de: { name: "Deutsche Gebärdensprache (DGS)", lang: "de", flag: "🇩🇪" },
  it: { name: "Lingua Italiana dei Segni (LIS)", lang: "it", flag: "🇮🇹" },
  pt: { name: "Libras / Língua Gestual Portuguesa", lang: "pt", flag: "🇧🇷" },
  ar: { name: "لغة الإشارة العربية (ArSL)", lang: "ar", flag: "🇸🇦" },
  zh: { name: "中国手语 (CSL)", lang: "zh", flag: "🇨🇳" },
  ja: { name: "日本手話 (JSL)", lang: "ja", flag: "🇯🇵" },
  ko: { name: "한국수어 (KSL)", lang: "ko", flag: "🇰🇷" },
};

const DEFAULT_META = SIGN_LANGUAGE_META.en;

// ── Sign vocabulary ───────────────────────────────────────────────────────────
// Each entry: { id, label, emoji, hand, sign, category }
//   hand  — 1–2 hand-shape emojis representing the sign shape
//   sign  — brief plain-English gesture description (≤ 15 words)
//   category — hierarchy L1 id for filtering
const SIGNS = [
  // ── FEEL ─────────────────────────────────────────────────────────────────
  { id: "happy",      label: "happy",      emoji: "😊", hand: "✋",  category: "feel",
    sign: "Circle both hands on chest in upward outward arcs" },
  { id: "sad",        label: "sad",        emoji: "😢", hand: "🤲", category: "feel",
    sign: "Both open hands move down cheeks like falling tears" },
  { id: "angry",      label: "angry",      emoji: "😠", hand: "🤚", category: "feel",
    sign: "Claw hand on chest, pull forward with tension" },
  { id: "hurt",       label: "hurt",       emoji: "🤕", hand: "☝️",  category: "feel",
    sign: "Both index fingers point at each other and twist" },
  { id: "sick",       label: "sick",       emoji: "🤒", hand: "🤚", category: "feel",
    sign: "Bent-hand touches forehead, other hand touches stomach" },
  { id: "scared",     label: "scared",     emoji: "😨", hand: "🙌", category: "feel",
    sign: "Both 5-hands shake near chest with inward motion" },
  { id: "tired",      label: "tired",      emoji: "😴", hand: "🤲", category: "feel",
    sign: "Bent hands drop from chest level, fingers down" },
  { id: "frustrated", label: "frustrated", emoji: "😤", hand: "✋", category: "feel",
    sign: "Open hand bounces off chin, palm back, twice" },
  { id: "confused",   label: "confused",   emoji: "😕", hand: "☝️", category: "feel",
    sign: "Point index finger at temple and twist repeatedly" },
  { id: "nervous",    label: "nervous",    emoji: "😰", hand: "🖐️", category: "feel",
    sign: "Wiggle all fingers of both hands facing each other" },
  { id: "bored",      label: "bored",      emoji: "😑", hand: "☝️", category: "feel",
    sign: "Index finger on tip of nose, twist outward once" },
  { id: "lonely",     label: "lonely",     emoji: "😞", hand: "☝️", category: "feel",
    sign: "Single index finger traces small downward arc on chest" },
  { id: "excited",    label: "excited",    emoji: "🤩", hand: "🤚", category: "feel",
    sign: "Alternating 5-hands brush upward on chest repeatedly" },
  { id: "calm",       label: "calm",       emoji: "😌", hand: "🤲", category: "feel",
    sign: "Open hands move forward and down slowly, palms down" },

  // ── NEED ─────────────────────────────────────────────────────────────────
  { id: "water",    label: "water",    emoji: "💧", hand: "🤞", category: "need",
    sign: "W-hand (index, middle, ring) taps chin twice" },
  { id: "food",     label: "food",     emoji: "🍎", hand: "✌️",  category: "need",
    sign: "Flat O-hand touches lips repeatedly like eating" },
  { id: "toilet",   label: "toilet",   emoji: "🚻", hand: "✌️",  category: "need",
    sign: "T-fist (thumb between index and middle) shakes left-right" },
  { id: "help",     label: "help",     emoji: "🆘", hand: "🤲", category: "need",
    sign: "Thumbs-up hand sits on flat palm; both hands rise" },
  { id: "drink",    label: "drink",    emoji: "🥤", hand: "🤙", category: "need",
    sign: "C-hand tilts up to mouth like drinking from a cup" },
  { id: "medicine", label: "medicine", emoji: "💊", hand: "🤙", category: "need",
    sign: "Middle finger of 5-hand rubs into opposite palm" },
  { id: "sleep",    label: "sleep",    emoji: "💤", hand: "🤚", category: "need",
    sign: "Open 5-hand near face closes as it moves down; eyes close" },
  { id: "rest",     label: "rest",     emoji: "🛋️",  hand: "🤲", category: "need",
    sign: "Cross arms on chest, hands relaxed on shoulders" },
  { id: "hug",      label: "hug",      emoji: "🤗", hand: "🤲", category: "need",
    sign: "Cross arms on chest and squeeze as if hugging someone" },
  { id: "change",   label: "change",   emoji: "🔄", hand: "✊", category: "need",
    sign: "Both A-fists, knuckles together, wrists twist in opposite directions" },
  { id: "quiet",    label: "quiet",    emoji: "🤫", hand: "☝️", category: "need",
    sign: "Index finger to lips, then hands sweep down to sides" },
  { id: "space",    label: "space",    emoji: "🫧", hand: "🤲", category: "need",
    sign: "Open hands push out to sides with palms facing out" },
  { id: "clean",    label: "clean",    emoji: "✨", hand: "🤚", category: "need",
    sign: "Flat hand slides across opposite flat palm twice" },
  { id: "break",    label: "break",    emoji: "⏸️",  hand: "🤚", category: "need",
    sign: "B-hands in front, palms facing, brief pause hold" },

  // ── PEOPLE ───────────────────────────────────────────────────────────────
  { id: "I",          label: "I",          emoji: "👤",  hand: "☝️",  category: "people",
    sign: "Point index finger to your own chest" },
  { id: "you",        label: "you",        emoji: "👆",  hand: "☝️",  category: "people",
    sign: "Point index finger toward the other person" },
  { id: "we",         label: "we",         emoji: "👫",  hand: "☝️",  category: "people",
    sign: "Index finger sweeps from shoulder to shoulder on chest" },
  { id: "they",       label: "they",       emoji: "👥",  hand: "☝️",  category: "people",
    sign: "Index finger sweeps sideways toward third-person space" },
  { id: "mom",        label: "mom",        emoji: "👩",  hand: "🤚", category: "people",
    sign: "Open 5-hand, thumb taps chin twice" },
  { id: "dad",        label: "dad",        emoji: "👨",  hand: "🤚", category: "people",
    sign: "Open 5-hand, thumb taps forehead twice" },
  { id: "brother",    label: "brother",    emoji: "👦",  hand: "☝️",  category: "people",
    sign: "L-hand at forehead moves down to tap other L-hand" },
  { id: "sister",     label: "sister",     emoji: "👧",  hand: "🤙", category: "people",
    sign: "A-hand at cheek slides down and lands on other A-hand" },
  { id: "grandma",    label: "grandma",    emoji: "👵",  hand: "🤚", category: "people",
    sign: "5-hand thumb at chin bounces forward twice (mom + far)" },
  { id: "grandpa",    label: "grandpa",    emoji: "👴",  hand: "🤚", category: "people",
    sign: "5-hand thumb at forehead bounces forward twice (dad + far)" },
  { id: "friend",     label: "friend",     emoji: "🤝",  hand: "☝️",  category: "people",
    sign: "Hook index fingers together, then switch top and bottom" },
  { id: "teacher",    label: "teacher",    emoji: "🧑‍🏫", hand: "🤲", category: "people",
    sign: "Flat O-hands at temples move outward, then person sign" },
  { id: "nurse",      label: "nurse",      emoji: "💉",  hand: "✌️",  category: "people",
    sign: "N-fingers (index+middle) tap inner wrist twice for pulse" },
  { id: "therapist",  label: "therapist",  emoji: "🩺",  hand: "🤚", category: "people",
    sign: "T-hand circles over opposite palm (therapy + person)" },

  // ── DO ───────────────────────────────────────────────────────────────────
  { id: "stop",    label: "stop",    emoji: "✋",  hand: "✋",  category: "do",
    sign: "Flat hand chops down onto opposite flat palm sharply" },
  { id: "help",    label: "help",    emoji: "🆘",  hand: "🤲", category: "do",
    sign: "Thumbs-up hand on flat palm; both rise together" },
  { id: "go",      label: "go",      emoji: "🚶",  hand: "☝️",  category: "do",
    sign: "Both index fingers point forward then arc together ahead" },
  { id: "come",    label: "come",    emoji: "🫴",  hand: "☝️",  category: "do",
    sign: "Index finger curves and beckons inward toward the body" },
  { id: "give",    label: "give",    emoji: "🤲",  hand: "🤲", category: "do",
    sign: "Flat-O hands extend outward as if handing something over" },
  { id: "turn",    label: "turn",    emoji: "🔄",  hand: "🤚", category: "do",
    sign: "Index finger rotates in small clockwise circle beside body" },
  { id: "eat",     label: "eat",     emoji: "🍴",  hand: "🤌", category: "do",
    sign: "Flat-O fingers tap lips two or three times" },
  { id: "drink",   label: "drink",   emoji: "🥤",  hand: "🤙", category: "do",
    sign: "C-hand tilts up to mouth like drinking from a cup" },
  { id: "play",    label: "play",    emoji: "🎮",  hand: "🤙", category: "do",
    sign: "Y-hands (pinky + thumb out) shake loosely side to side" },
  { id: "watch",   label: "watch",   emoji: "📺",  hand: "✌️",  category: "do",
    sign: "V-fingers point from eyes outward toward the object" },
  { id: "finish",  label: "finish",  emoji: "🏁",  hand: "🙌", category: "do",
    sign: "Both 5-hands flip outward quickly from palms-in to palms-out" },
  { id: "like",    label: "like",    emoji: "👍",  hand: "🤚", category: "do",
    sign: "5-hand on chest, middle finger and thumb pinch and pull out" },
  { id: "show",    label: "show",    emoji: "👁️",  hand: "☝️",  category: "do",
    sign: "Index finger in opposite palm; both hands move forward" },
  { id: "choose",  label: "choose",  emoji: "🫵",  hand: "✌️",  category: "do",
    sign: "F-hand picks up from a row with a plucking motion" },

  // ── TALK ─────────────────────────────────────────────────────────────────
  { id: "hello",       label: "hello",       emoji: "👋",  hand: "🤚", category: "talk",
    sign: "Flat B-hand at forehead moves away like a salute" },
  { id: "goodbye",     label: "goodbye",     emoji: "🫡",  hand: "🤚", category: "talk",
    sign: "Open hand waves side to side at head level" },
  { id: "yes",         label: "yes",         emoji: "✅",  hand: "✊", category: "talk",
    sign: "A-fist nods up and down like a head nodding yes" },
  { id: "no",          label: "no",          emoji: "❌",  hand: "✌️",  category: "talk",
    sign: "Index + middle fingers snap down to thumb twice" },
  { id: "please",      label: "please",      emoji: "🙏",  hand: "🤚", category: "talk",
    sign: "Flat hand circles clockwise on the chest" },
  { id: "thank you",   label: "thank you",   emoji: "💛",  hand: "🤚", category: "talk",
    sign: "Flat hand at chin moves forward and down toward person" },
  { id: "sorry",       label: "sorry",       emoji: "😔",  hand: "✊", category: "talk",
    sign: "A-fist rubs small circles on the chest" },
  { id: "ok",          label: "ok",          emoji: "👌",  hand: "👌", category: "talk",
    sign: "O-K: fingerspell O and K in quick succession" },
  { id: "wait",        label: "wait",        emoji: "⏸️",  hand: "🤚", category: "talk",
    sign: "Both curved hands in front, wiggle fingers slightly — hold on" },
  { id: "understand",  label: "understand",  emoji: "💡",  hand: "☝️",  category: "talk",
    sign: "Index at temple flicks up and out — like a light-bulb moment" },
  { id: "tell",        label: "tell",        emoji: "🗣️",  hand: "☝️",  category: "talk",
    sign: "Index at chin arcs outward toward the person" },
  { id: "ask",         label: "ask",         emoji: "✋",  hand: "🤲", category: "talk",
    sign: "Both hands face up and pull inward to body (asking)" },
  { id: "repeat",      label: "repeat",      emoji: "🔄",  hand: "☝️",  category: "talk",
    sign: "Bent V curls down into opposite cupped palm twice" },

  // ── PLACE ────────────────────────────────────────────────────────────────
  { id: "home",       label: "home",       emoji: "🏠", hand: "🤌", category: "place",
    sign: "Flat-O hand touches cheek then top of cheek (eat + sleep)" },
  { id: "school",     label: "school",      emoji: "🏫", hand: "🤚", category: "place",
    sign: "Open dominant hand claps on the other open hand twice" },
  { id: "hospital",   label: "hospital",    emoji: "🏥", hand: "✌️",  category: "place",
    sign: "H-fingers trace a cross on opposite upper arm" },
  { id: "outside",    label: "outside",     emoji: "🌳", hand: "✋",  category: "place",
    sign: "Bent 5-hand pulls out from the opposite C-hand twice" },
  { id: "store",      label: "store",       emoji: "🏪", hand: "🤌", category: "place",
    sign: "Flat-O hands face down, flick wrists outward twice" },
  { id: "restaurant", label: "restaurant",  emoji: "🍽️", hand: "✌️",  category: "place",
    sign: "R-fingers tap corner of mouth and then the other side" },
  { id: "car",        label: "car",         emoji: "🚗", hand: "✊", category: "place",
    sign: "Both hands mime gripping and steering a wheel" },
  { id: "bus",        label: "bus",         emoji: "🚌", hand: "✌️",  category: "place",
    sign: "B-U-S fingerspelled quickly, or steering-wheel pull out + long" },
  { id: "bathroom",   label: "bathroom",    emoji: "🚻", hand: "✌️",  category: "place",
    sign: "T-fist shakes side to side (toilet), then B-hand arcs (bath)" },
  { id: "park",       label: "park",        emoji: "🏞️", hand: "🤚", category: "place",
    sign: "P-hands (index + thumb) face down and tap together twice" },

  // ── QUESTION ─────────────────────────────────────────────────────────────
  { id: "what",      label: "what",      emoji: "❓", hand: "🤚", category: "question",
    sign: "Index finger wags side to side in front of body" },
  { id: "where",     label: "where",     emoji: "📍", hand: "☝️",  category: "question",
    sign: "Index finger waggles back and forth in space" },
  { id: "when",      label: "when",      emoji: "🕐", hand: "☝️",  category: "question",
    sign: "Index finger circles over opposite index tip, then touches it" },
  { id: "who",       label: "who",       emoji: "👤", hand: "☝️",  category: "question",
    sign: "Bent index (or L) circles clockwise in front of the chin" },
  { id: "why",       label: "why",       emoji: "🤔", hand: "🤚", category: "question",
    sign: "Bent middle finger touches forehead, moves outward to Y-hand" },
  { id: "how",       label: "how",       emoji: "🔧", hand: "🤲", category: "question",
    sign: "Both bent hands press knuckles together then roll forward to flat" },
  { id: "how much",  label: "how much",  emoji: "💰", hand: "🤲", category: "question",
    sign: "Clawed 5-hands pull up sharply with questioning expression" },
  { id: "how many",  label: "how many",  emoji: "🔢", hand: "🤲", category: "question",
    sign: "Clawed 5-hands flip up with wiggling fingers + quantity look" },
  { id: "which",     label: "which",     emoji: "👈", hand: "🤚", category: "question",
    sign: "Both A-fists alternate up-down like weighing options" },
  { id: "can I",     label: "can I",     emoji: "🙋", hand: "✊", category: "question",
    sign: "Both C-hands (or S-fists) push forward and slightly down" },
  { id: "can you",   label: "can you",   emoji: "🤝", hand: "✊", category: "question",
    sign: "C-hands push toward the other person (you)" },

  // ── DESCRIBE ─────────────────────────────────────────────────────────────
  { id: "good",     label: "good",    emoji: "👍", hand: "🤚", category: "describe",
    sign: "Flat hand at chin moves forward and down — like thank you light" },
  { id: "bad",      label: "bad",     emoji: "👎", hand: "🤚", category: "describe",
    sign: "Flat hand at mouth flips down sharply, palm out" },
  { id: "ready",    label: "ready",   emoji: "✅", hand: "🤚", category: "describe",
    sign: "R-hands move from one side to the other in front" },
  { id: "big",      label: "big",     emoji: "🐘", hand: "🙌", category: "describe",
    sign: "Both L-hands face each other then spread widely apart" },
  { id: "small",    label: "small",   emoji: "🐜", hand: "🙌", category: "describe",
    sign: "Both flat hands face and move toward each other closely" },
  { id: "hot",      label: "hot",     emoji: "🔥", hand: "🤚", category: "describe",
    sign: "Curved hand at mouth twists outward sharply — like spitting heat" },
  { id: "cold",     label: "cold",    emoji: "❄️", hand: "🤲", category: "describe",
    sign: "Both S-fists near chest shake with shivering motion" },
  { id: "clean",    label: "clean",   emoji: "✨", hand: "🤚", category: "describe",
    sign: "Flat dominant hand slides across opposite flat palm twice" },
  { id: "dirty",    label: "dirty",   emoji: "🦠", hand: "🤚", category: "describe",
    sign: "5-hand under chin with wiggling fingers, palm down" },
  { id: "loud",     label: "loud",    emoji: "🔊", hand: "✌️",  category: "describe",
    sign: "V-fingers at ears shake outward — big sound waves expanding" },
  { id: "quiet",    label: "quiet",   emoji: "🤫", hand: "☝️",  category: "describe",
    sign: "Index finger to lips, then hands sweep gently down to sides" },
  { id: "fast",     label: "fast",    emoji: "⚡", hand: "☝️",  category: "describe",
    sign: "L-hand cocks back then index flicks forward quickly" },
  { id: "slow",     label: "slow",    emoji: "🐢", hand: "🤚", category: "describe",
    sign: "Dominant hand drags slowly up the back of the other hand" },
  { id: "broken",   label: "broken",  emoji: "💔", hand: "✊", category: "describe",
    sign: "Both fists touch at wrists then twist apart downward" },
  { id: "same",     label: "same",    emoji: "🟰",  hand: "✌️",  category: "describe",
    sign: "Two Y-hands (or index fingers) tap together side by side" },
];

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",      label: "All",      emoji: "🔍", color: "#636366" },
  { id: "feel",     label: "Feel",     emoji: "❤️",  color: "#E63946" },
  { id: "need",     label: "Need",     emoji: "⭐",  color: "#F77F00" },
  { id: "people",   label: "People",   emoji: "👥",  color: "#1971C2" },
  { id: "do",       label: "Do",       emoji: "👉",  color: "#E8590C" },
  { id: "talk",     label: "Talk",     emoji: "💬",  color: "#0C8599" },
  { id: "place",    label: "Place",    emoji: "📍",  color: "#7048E8" },
  { id: "question", label: "Question", emoji: "❓",  color: "#5C940D" },
  { id: "describe", label: "Describe", emoji: "🎨",  color: "#862E9C" },
];

const CAT_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));

// ── UI strings ────────────────────────────────────────────────────────────────

const UI_STRINGS = {
  en: { title: "Sign Language Guide", search: "Search words…", watchOnline: "Watch sign online", noResults: "No signs found", gesture: "Gesture" },
  es: { title: "Guía de lengua de signos", search: "Buscar palabras…", watchOnline: "Ver seña en línea", noResults: "No se encontraron señas", gesture: "Gesto" },
  fr: { title: "Guide de la langue des signes", search: "Rechercher des mots…", watchOnline: "Voir le signe en ligne", noResults: "Aucun signe trouvé", gesture: "Geste" },
  de: { title: "Gebärdensprache-Guide", search: "Wörter suchen…", watchOnline: "Gebärde online ansehen", noResults: "Keine Gebärden gefunden", gesture: "Gebärde" },
  it: { title: "Guida alla lingua dei segni", search: "Cerca parole…", watchOnline: "Guarda il segno online", noResults: "Nessun segno trovato", gesture: "Segno" },
  pt: { title: "Guia de língua de sinais", search: "Procurar palavras…", watchOnline: "Ver sinal online", noResults: "Nenhum sinal encontrado", gesture: "Sinal" },
  ar: { title: "دليل لغة الإشارة", search: "ابحث عن كلمات…", watchOnline: "شاهد الإشارة عبر الإنترنت", noResults: "لم يتم العثور على إشارات", gesture: "إيماءة" },
  zh: { title: "手语指南", search: "搜索词语…", watchOnline: "在线观看手势", noResults: "未找到手势", gesture: "手势" },
  ja: { title: "手話ガイド", search: "単語を検索…", watchOnline: "オンラインで手話を見る", noResults: "手話が見つかりません", gesture: "ジェスチャー" },
  ko: { title: "수어 가이드", search: "단어 검색…", watchOnline: "온라인에서 수어 보기", noResults: "수어를 찾을 수 없습니다", gesture: "제스처" },
};

const DEFAULT_UI = UI_STRINGS.en;

// ── Sign card ─────────────────────────────────────────────────────────────────
const SignCard = memo(function SignCard({ item, langCode, onSpeak, slotLabel }) {
  const meta   = SIGN_LANGUAGE_META[langCode] ?? DEFAULT_META;
  const ui     = UI_STRINGS[langCode] ?? DEFAULT_UI;
  const color  = CAT_COLOR[item.category] ?? "#636366";
  const searchQ = encodeURIComponent(item.label);
  const extURL  = `https://www.spreadthesign.com/${meta.lang}/search/?q=${searchQ}`;

  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--sep)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Illustration band */}
      <div style={{
        background: `${color}18`,
        borderBottom: `2px solid ${color}30`,
        height: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "relative",
        padding: "0 8px",
      }}>
        {/* Hand shape + word emoji */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">{item.hand}</span>
          <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{item.emoji}</span>
        </div>
        {/* Category dot */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 8, height: 8, borderRadius: 4,
          background: color, opacity: 0.7,
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {/* Label */}
        <div style={{
          fontWeight: 700, fontSize: 15, color: "var(--text)",
          textTransform: "capitalize", lineHeight: 1.2,
        }}>
          {item.label}
        </div>

        {/* Gesture description */}
        <div style={{
          fontSize: 12, color: "var(--text-2)", lineHeight: 1.5,
          flex: 1,
        }}>
          <span style={{ fontWeight: 600, color }}>{ui.gesture}: </span>
          {item.sign}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {/* Speak / TTS */}
          <button
            onClick={() => onSpeak(item.label)}
            aria-label={`Speak ${item.label}`}
            style={{
              flex: 1, height: 36, borderRadius: 10,
              background: `${color}18`,
              border: `1px solid ${color}40`,
              color, fontWeight: 600, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <Volume2 size={14} strokeWidth={2} />
            {slotLabel}
          </button>

          {/* External sign reference */}
          <a
            href={extURL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${ui.watchOnline}: ${item.label}`}
            title={ui.watchOnline}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--elevated)",
              border: "1px solid var(--sep)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-3)", textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <ExternalLink size={14} strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
});

// ── Main modal ────────────────────────────────────────────────────────────────
export default memo(function SignLanguageModal({ open, onClose, langCode = "en", typeLangCode, onSpeak }) {
  const [query,       setQuery]    = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const searchRef = useRef(null);
  const scrollRef = useRef(null);

  const meta = SIGN_LANGUAGE_META[langCode] ?? DEFAULT_META;
  const ui   = UI_STRINGS[langCode] ?? DEFAULT_UI;

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("all");
      scrollRef.current?.scrollTo({ top: 0 });
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Filtered signs
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SIGNS.filter(s => {
      const catOk = activeCategory === "all" || s.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      return s.label.toLowerCase().includes(q) || s.sign.toLowerCase().includes(q);
    });
  }, [query, activeCategory]);

  const handleSpeak = useCallback((label) => {
    onSpeak?.(label);
  }, [onSpeak]);

  const handleChipClick = useCallback((id) => {
    setActiveCategory(id);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.title}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301,
          height: "94vh",
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.3)",
        }}
      >
        {/* Drag pill */}
        <div style={{
          padding: "10px 0 0",
          display: "flex", justifyContent: "center", flexShrink: 0,
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sep)" }} />
        </div>

        {/* Header */}
        <div style={{
          padding: "8px 16px 12px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, flexShrink: 0,
          borderBottom: "1px solid var(--sep)",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 22 }}>🤟</span>
              <h2 style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                color: "var(--text)", lineHeight: 1.2, letterSpacing: "-0.02em",
              }}>
                {ui.title}
              </h2>
            </div>
            <div style={{
              fontSize: 13, color: "var(--text-3)", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span>{meta.flag}</span>
              <span>{meta.name}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--elevated)", border: "1px solid var(--sep)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-3)", flexShrink: 0, marginTop: 4,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--elevated)",
            border: "1px solid var(--sep)",
            borderRadius: 14, padding: "0 14px",
          }}>
            <Search size={17} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="search"
              placeholder={ui.search}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 15, color: "var(--text)", outline: "none",
                height: 44, fontFamily: "inherit",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  background: "none", border: "none", padding: 0,
                  cursor: "pointer", color: "var(--text-3)", lineHeight: 1, flexShrink: 0,
                }}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div style={{
          padding: "10px 16px 0", flexShrink: 0,
          display: "flex", gap: 6, overflowX: "auto",
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleChipClick(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: `1.5px solid ${active ? cat.color : "var(--sep)"}`,
                  background: active ? `${cat.color}20` : "var(--elevated)",
                  color: active ? cat.color : "var(--text-2)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  display: "flex", alignItems: "center", gap: 5,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Count */}
        <div style={{
          padding: "8px 16px 0", flexShrink: 0,
          fontSize: 12, color: "var(--text-3)", fontWeight: 500,
        }}>
          {filtered.length} {filtered.length === 1 ? "sign" : "signs"}
        </div>

        {/* Scrollable card grid */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "8px 16px 32px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "48px 0",
              color: "var(--text-3)", fontSize: 15,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
              {ui.noResults}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
              gap: 12,
            }}>
              {filtered.map(item => (
                <SignCard
                  key={item.id + item.category}
                  item={item}
                  langCode={langCode}
                  onSpeak={handleSpeak}
                  slotLabel={item.label}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
