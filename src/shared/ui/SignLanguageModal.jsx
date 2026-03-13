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
    sign: "Both hands circle up on chest" },
  { id: "sad",        label: "sad",        emoji: "😢", hand: "🤲", category: "feel",
    sign: "Hands slide down face" },
  { id: "angry",      label: "angry",      emoji: "😠", hand: "🤚", category: "feel",
    sign: "Claw hand pulls from chest" },
  { id: "hurt",       label: "hurt",       emoji: "🤕", hand: "☝️",  category: "feel",
    sign: "Index fingers point and twist" },
  { id: "sick",       label: "sick",       emoji: "🤒", hand: "🤚", category: "feel",
    sign: "Bent hand on forehead + stomach" },
  { id: "scared",     label: "scared",     emoji: "😨", hand: "🙌", category: "feel",
    sign: "5-hands shake near chest" },
  { id: "tired",      label: "tired",      emoji: "😴", hand: "🤲", category: "feel",
    sign: "Bent hands drop from chest" },
  { id: "frustrated", label: "frustrated", emoji: "😤", hand: "✋", category: "feel",
    sign: "Hand bounces off chin twice" },
  { id: "confused",   label: "confused",   emoji: "😕", hand: "☝️", category: "feel",
    sign: "Index at temple, twist" },
  { id: "nervous",    label: "nervous",    emoji: "😰", hand: "🖐️", category: "feel",
    sign: "Both hands wiggle fingers" },
  { id: "bored",      label: "bored",      emoji: "😑", hand: "☝️", category: "feel",
    sign: "Index on nose, twist out" },
  { id: "lonely",     label: "lonely",     emoji: "😞", hand: "☝️", category: "feel",
    sign: "Index traces arc on chest" },
  { id: "excited",    label: "excited",    emoji: "🤩", hand: "🤚", category: "feel",
    sign: "5-hands brush up on chest" },
  { id: "calm",       label: "calm",       emoji: "😌", hand: "🤲", category: "feel",
    sign: "Hands press down slowly" },

  // ── NEED ─────────────────────────────────────────────────────────────────
  { id: "water",    label: "water",    emoji: "💧", hand: "🤞", category: "need",
    sign: "W-hand taps chin twice" },
  { id: "food",     label: "food",     emoji: "🍎", hand: "✌️",  category: "need",
    sign: "Flat O-hand taps lips" },
  { id: "toilet",   label: "toilet",   emoji: "🚻", hand: "✌️",  category: "need",
    sign: "T-fist shakes left-right" },
  { id: "help",     label: "help",     emoji: "🆘", hand: "🤲", category: "need",
    sign: "Thumbs-up on palm, rise" },
  { id: "drink",    label: "drink",    emoji: "🥤", hand: "🤙", category: "need",
    sign: "C-hand tilts to mouth" },
  { id: "medicine", label: "medicine", emoji: "💊", hand: "🤙", category: "need",
    sign: "Middle finger rubs palm" },
  { id: "sleep",    label: "sleep",    emoji: "💤", hand: "🤚", category: "need",
    sign: "Hand closes down from face" },
  { id: "rest",     label: "rest",     emoji: "🛋️",  hand: "🤲", category: "need",
    sign: "Arms cross on chest" },
  { id: "hug",      label: "hug",      emoji: "🤗", hand: "🤲", category: "need",
    sign: "Arms cross and squeeze" },
  { id: "change",   label: "change",   emoji: "🔄", hand: "✊", category: "need",
    sign: "Fists together, twist apart" },
  { id: "quiet",    label: "quiet",    emoji: "🤫", hand: "☝️", category: "need",
    sign: "Finger to lips, hands down" },
  { id: "space",    label: "space",    emoji: "🫧", hand: "🤲", category: "need",
    sign: "Hands push out to sides" },
  { id: "clean",    label: "clean",    emoji: "✨", hand: "🤚", category: "need",
    sign: "Hand slides across palm" },
  { id: "break",    label: "break",    emoji: "⏸️",  hand: "🤚", category: "need",
    sign: "B-hands pause in front" },

  // ── PEOPLE ───────────────────────────────────────────────────────────────
  { id: "I",          label: "I",          emoji: "👤",  hand: "☝️",  category: "people",
    sign: "Point to own chest" },
  { id: "you",        label: "you",        emoji: "👆",  hand: "☝️",  category: "people",
    sign: "Point toward person" },
  { id: "we",         label: "we",         emoji: "👫",  hand: "☝️",  category: "people",
    sign: "Index sweeps across chest" },
  { id: "they",       label: "they",       emoji: "👥",  hand: "☝️",  category: "people",
    sign: "Index sweeps sideways" },
  { id: "mom",        label: "mom",        emoji: "👩",  hand: "🤚", category: "people",
    sign: "Thumb taps chin twice" },
  { id: "dad",        label: "dad",        emoji: "👨",  hand: "🤚", category: "people",
    sign: "Thumb taps forehead twice" },
  { id: "brother",    label: "brother",    emoji: "👦",  hand: "☝️",  category: "people",
    sign: "L forehead down to L" },
  { id: "sister",     label: "sister",     emoji: "👧",  hand: "🤙", category: "people",
    sign: "A cheek slides to A" },
  { id: "grandma",    label: "grandma",    emoji: "👵",  hand: "🤚", category: "people",
    sign: "Thumb at chin bounces out" },
  { id: "grandpa",    label: "grandpa",    emoji: "👴",  hand: "🤚", category: "people",
    sign: "Thumb at forehead bounces out" },
  { id: "friend",     label: "friend",     emoji: "🤝",  hand: "☝️",  category: "people",
    sign: "Hook index fingers, swap" },
  { id: "teacher",    label: "teacher",    emoji: "🧑‍🏫", hand: "🤲", category: "people",
    sign: "O-hands at temples move out" },
  { id: "nurse",      label: "nurse",      emoji: "💉",  hand: "✌️",  category: "people",
    sign: "N-fingers tap wrist twice" },
  { id: "therapist",  label: "therapist",  emoji: "🩺",  hand: "🤚", category: "people",
    sign: "T-hand circles over palm" },

  // ── DO ───────────────────────────────────────────────────────────────────
  { id: "stop",    label: "stop",    emoji: "✋",  hand: "✋",  category: "do",
    sign: "Hand chops onto palm" },
  { id: "help",    label: "help",    emoji: "🆘",  hand: "🤲", category: "do",
    sign: "Thumbs-up on palm, rise" },
  { id: "go",      label: "go",      emoji: "🚶",  hand: "☝️",  category: "do",
    sign: "Index fingers arc forward" },
  { id: "come",    label: "come",    emoji: "🫴",  hand: "☝️",  category: "do",
    sign: "Index beckons inward" },
  { id: "give",    label: "give",    emoji: "🤲",  hand: "🤲", category: "do",
    sign: "O-hands extend outward" },
  { id: "turn",    label: "turn",    emoji: "🔄",  hand: "🤚", category: "do",
    sign: "Index rotates in circle" },
  { id: "eat",     label: "eat",     emoji: "🍴",  hand: "🤌", category: "do",
    sign: "O-fingers tap lips" },
  { id: "drink",   label: "drink",   emoji: "🥤",  hand: "🤙", category: "do",
    sign: "C-hand tilts to mouth" },
  { id: "play",    label: "play",    emoji: "🎮",  hand: "🤙", category: "do",
    sign: "Y-hands shake side to side" },
  { id: "watch",   label: "watch",   emoji: "📺",  hand: "✌️",  category: "do",
    sign: "V-fingers point from eyes" },
  { id: "finish",  label: "finish",  emoji: "🏁",  hand: "🙌", category: "do",
    sign: "5-hands flip outward" },
  { id: "like",    label: "like",    emoji: "👍",  hand: "🤚", category: "do",
    sign: "Pinch and pull from chest" },
  { id: "show",    label: "show",    emoji: "👁️",  hand: "☝️",  category: "do",
    sign: "Index in palm, push out" },
  { id: "choose",  label: "choose",  emoji: "🫵",  hand: "✌️",  category: "do",
    sign: "F-hand plucks from row" },

  // ── TALK ─────────────────────────────────────────────────────────────────
  { id: "hello",       label: "hello",       emoji: "👋",  hand: "🤚", category: "talk",
    sign: "B-hand salutes from forehead" },
  { id: "goodbye",     label: "goodbye",     emoji: "🫡",  hand: "🤚", category: "talk",
    sign: "Hand waves at head level" },
  { id: "yes",         label: "yes",         emoji: "✅",  hand: "✊", category: "talk",
    sign: "Fist nods up and down" },
  { id: "no",          label: "no",          emoji: "❌",  hand: "✌️",  category: "talk",
    sign: "Fingers snap to thumb twice" },
  { id: "please",      label: "please",      emoji: "🙏",  hand: "🤚", category: "talk",
    sign: "Hand circles on chest" },
  { id: "thank you",   label: "thank you",   emoji: "💛",  hand: "🤚", category: "talk",
    sign: "Hand from chin forward" },
  { id: "sorry",       label: "sorry",       emoji: "😔",  hand: "✊", category: "talk",
    sign: "Fist circles on chest" },
  { id: "ok",          label: "ok",          emoji: "👌",  hand: "👌", category: "talk",
    sign: "Fingerspell O-K" },
  { id: "wait",        label: "wait",        emoji: "⏸️",  hand: "🤚", category: "talk",
    sign: "Curved hands wiggle" },
  { id: "understand",  label: "understand",  emoji: "💡",  hand: "☝️",  category: "talk",
    sign: "Index at temple flicks up" },
  { id: "tell",        label: "tell",        emoji: "🗣️",  hand: "☝️",  category: "talk",
    sign: "Index from chin outward" },
  { id: "ask",         label: "ask",         emoji: "✋",  hand: "🤲", category: "talk",
    sign: "Hands pull inward" },
  { id: "repeat",      label: "repeat",      emoji: "🔄",  hand: "☝️",  category: "talk",
    sign: "Bent V into cupped palm" },

  // ── PLACE ────────────────────────────────────────────────────────────────
  { id: "home",       label: "home",       emoji: "🏠", hand: "🤌", category: "place",
    sign: "O-hand taps cheek twice" },
  { id: "school",     label: "school",      emoji: "🏫", hand: "🤚", category: "place",
    sign: "Hand claps on hand twice" },
  { id: "hospital",   label: "hospital",    emoji: "🏥", hand: "✌️",  category: "place",
    sign: "H-fingers draw cross on arm" },
  { id: "outside",    label: "outside",     emoji: "🌳", hand: "✋",  category: "place",
    sign: "Hand pulls out from C" },
  { id: "store",      label: "store",       emoji: "🏪", hand: "🤌", category: "place",
    sign: "O-hands flick wrists out" },
  { id: "restaurant", label: "restaurant",  emoji: "🍽️", hand: "✌️",  category: "place",
    sign: "R-fingers tap mouth corners" },
  { id: "car",        label: "car",         emoji: "🚗", hand: "✊", category: "place",
    sign: "Mime steering a wheel" },
  { id: "bus",        label: "bus",         emoji: "🚌", hand: "✌️",  category: "place",
    sign: "Fingerspell B-U-S" },
  { id: "bathroom",   label: "bathroom",    emoji: "🚻", hand: "✌️",  category: "place",
    sign: "T-fist shakes side to side" },
  { id: "park",       label: "park",        emoji: "🏞️", hand: "🤚", category: "place",
    sign: "P-hands tap together" },

  // ── QUESTION ─────────────────────────────────────────────────────────────
  { id: "what",      label: "what",      emoji: "❓", hand: "🤚", category: "question",
    sign: "Index wags side to side" },
  { id: "where",     label: "where",     emoji: "📍", hand: "☝️",  category: "question",
    sign: "Index waggles in space" },
  { id: "when",      label: "when",      emoji: "🕐", hand: "☝️",  category: "question",
    sign: "Index circles then touches" },
  { id: "who",       label: "who",       emoji: "👤", hand: "☝️",  category: "question",
    sign: "Index circles near chin" },
  { id: "why",       label: "why",       emoji: "🤔", hand: "🤚", category: "question",
    sign: "Finger from forehead to Y" },
  { id: "how",       label: "how",       emoji: "🔧", hand: "🤲", category: "question",
    sign: "Knuckles together, roll flat" },
  { id: "how much",  label: "how much",  emoji: "💰", hand: "🤲", category: "question",
    sign: "Claw hands pull up" },
  { id: "how many",  label: "how many",  emoji: "🔢", hand: "🤲", category: "question",
    sign: "Claw hands flip up" },
  { id: "which",     label: "which",     emoji: "👈", hand: "🤚", category: "question",
    sign: "Fists alternate up-down" },
  { id: "can I",     label: "can I",     emoji: "🙋", hand: "✊", category: "question",
    sign: "C-hands push forward" },
  { id: "can you",   label: "can you",   emoji: "🤝", hand: "✊", category: "question",
    sign: "C-hands push toward you" },

  // ── DESCRIBE ─────────────────────────────────────────────────────────────
  { id: "good",     label: "good",    emoji: "👍", hand: "🤚", category: "describe",
    sign: "Hand from chin down" },
  { id: "bad",      label: "bad",     emoji: "👎", hand: "🤚", category: "describe",
    sign: "Hand at mouth flips down" },
  { id: "ready",    label: "ready",   emoji: "✅", hand: "🤚", category: "describe",
    sign: "R-hands sweep across" },
  { id: "big",      label: "big",     emoji: "🐘", hand: "🙌", category: "describe",
    sign: "L-hands spread apart" },
  { id: "small",    label: "small",   emoji: "🐜", hand: "🙌", category: "describe",
    sign: "Hands move close together" },
  { id: "hot",      label: "hot",     emoji: "🔥", hand: "🤚", category: "describe",
    sign: "Hand at mouth twists out" },
  { id: "cold",     label: "cold",    emoji: "❄️", hand: "🤲", category: "describe",
    sign: "Fists shake, shivering" },
  { id: "clean",    label: "clean",   emoji: "✨", hand: "🤚", category: "describe",
    sign: "Hand slides across palm" },
  { id: "dirty",    label: "dirty",   emoji: "🦠", hand: "🤚", category: "describe",
    sign: "Hand under chin wiggles" },
  { id: "loud",     label: "loud",    emoji: "🔊", hand: "✌️",  category: "describe",
    sign: "V-fingers shake from ears" },
  { id: "quiet",    label: "quiet",   emoji: "🤫", hand: "☝️",  category: "describe",
    sign: "Finger to lips, hands down" },
  { id: "fast",     label: "fast",    emoji: "⚡", hand: "☝️",  category: "describe",
    sign: "Index flicks forward" },
  { id: "slow",     label: "slow",    emoji: "🐢", hand: "🤚", category: "describe",
    sign: "Hand drags up other hand" },
  { id: "broken",   label: "broken",  emoji: "💔", hand: "✊", category: "describe",
    sign: "Fists twist apart" },
  { id: "same",     label: "same",    emoji: "🟰",  hand: "✌️",  category: "describe",
    sign: "Index fingers tap together" },

  // ── ANIMALS ──────────────────────────────────────────────────────────────
  { id: "dog",       label: "dog",       emoji: "🐕", hand: "🤚", category: "animals",
    sign: "Snap fingers, pat thigh" },
  { id: "cat",       label: "cat",       emoji: "🐈", hand: "🤌", category: "animals",
    sign: "Pinch whiskers from cheek" },
  { id: "bird",      label: "bird",      emoji: "🐦", hand: "✌️",  category: "animals",
    sign: "Pinch beak at mouth" },
  { id: "fish",      label: "fish",      emoji: "🐟", hand: "🤚", category: "animals",
    sign: "Flat hand swims forward" },
  { id: "horse",     label: "horse",     emoji: "🐴", hand: "🤚", category: "animals",
    sign: "Thumb at temple, flap" },
  { id: "cow",       label: "cow",       emoji: "🐄", hand: "🤙", category: "animals",
    sign: "Y-hand twists at temple" },
  { id: "pig",       label: "pig",       emoji: "🐷", hand: "🤚", category: "animals",
    sign: "Hand flaps under chin" },
  { id: "rabbit",    label: "rabbit",    emoji: "🐰", hand: "✌️",  category: "animals",
    sign: "Crossed U-hands hop" },
  { id: "bear",      label: "bear",      emoji: "🐻", hand: "✊", category: "animals",
    sign: "Crossed claws scratch chest" },
  { id: "duck",      label: "duck",      emoji: "🦆", hand: "🤌", category: "animals",
    sign: "Fingers snap at mouth" },
  { id: "elephant",  label: "elephant",  emoji: "🐘", hand: "🤚", category: "animals",
    sign: "Trace trunk from nose down" },
  { id: "monkey",    label: "monkey",    emoji: "🐒", hand: "🤚", category: "animals",
    sign: "Scratch sides like monkey" },
  { id: "snake",     label: "snake",     emoji: "🐍", hand: "✌️",  category: "animals",
    sign: "V-hand slithers forward" },
  { id: "butterfly", label: "butterfly", emoji: "🦋", hand: "🤲", category: "animals",
    sign: "Linked thumbs, flap hands" },

  // ── ALPHABET ─────────────────────────────────────────────────────────────
  { id: "a", label: "A", emoji: "🅰️", hand: "✊", category: "alphabet",
    sign: "Fist, thumb at side" },
  { id: "b", label: "B", emoji: "🅱️", hand: "🤚", category: "alphabet",
    sign: "Flat hand up, thumb in" },
  { id: "c", label: "C", emoji: "©️", hand: "🤚", category: "alphabet",
    sign: "Curved hand, C shape" },
  { id: "d", label: "D", emoji: "🇩", hand: "☝️", category: "alphabet",
    sign: "Index up, others curl to thumb" },
  { id: "e", label: "E", emoji: "🇪", hand: "🤚", category: "alphabet",
    sign: "Fingertips curl to thumb" },
  { id: "f", label: "F", emoji: "🇫", hand: "👌", category: "alphabet",
    sign: "Index + thumb circle, rest up" },
  { id: "g", label: "G", emoji: "🇬", hand: "☝️", category: "alphabet",
    sign: "Index + thumb point sideways" },
  { id: "h", label: "H", emoji: "🇭", hand: "✌️", category: "alphabet",
    sign: "Index + middle point sideways" },
  { id: "i", label: "I", emoji: "ℹ️", hand: "🤙", category: "alphabet",
    sign: "Pinky up, fist closed" },
  { id: "j", label: "J", emoji: "🇯", hand: "🤙", category: "alphabet",
    sign: "Pinky up, trace J curve" },
  { id: "k", label: "K", emoji: "🇰", hand: "✌️", category: "alphabet",
    sign: "Index + middle up, thumb between" },
  { id: "l", label: "L", emoji: "🇱", hand: "☝️", category: "alphabet",
    sign: "L shape: index + thumb out" },
  { id: "m", label: "M", emoji: "Ⓜ️", hand: "✊", category: "alphabet",
    sign: "Three fingers over thumb" },
  { id: "n", label: "N", emoji: "🇳", hand: "✊", category: "alphabet",
    sign: "Two fingers over thumb" },
  { id: "o", label: "O", emoji: "⭕", hand: "🤌", category: "alphabet",
    sign: "Fingers curl to O shape" },
  { id: "p", label: "P", emoji: "🅿️", hand: "✌️", category: "alphabet",
    sign: "K-hand points down" },
  { id: "q", label: "Q", emoji: "🇶", hand: "🤌", category: "alphabet",
    sign: "G-hand points down" },
  { id: "r", label: "R", emoji: "🇷", hand: "✌️", category: "alphabet",
    sign: "Index + middle crossed" },
  { id: "s", label: "S", emoji: "🇸", hand: "✊", category: "alphabet",
    sign: "Fist, thumb over fingers" },
  { id: "t", label: "T", emoji: "🇹", hand: "✊", category: "alphabet",
    sign: "Thumb between index + middle" },
  { id: "u", label: "U", emoji: "🇺", hand: "✌️", category: "alphabet",
    sign: "Index + middle together up" },
  { id: "v", label: "V", emoji: "✌️", hand: "✌️", category: "alphabet",
    sign: "Index + middle in V" },
  { id: "w", label: "W", emoji: "🇼", hand: "🤚", category: "alphabet",
    sign: "Three fingers up spread" },
  { id: "x", label: "X", emoji: "❌", hand: "☝️", category: "alphabet",
    sign: "Index finger hooks" },
  { id: "y", label: "Y", emoji: "🇾", hand: "🤙", category: "alphabet",
    sign: "Thumb + pinky out" },
  { id: "z", label: "Z", emoji: "🇿", hand: "☝️", category: "alphabet",
    sign: "Index traces Z in air" },
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
  { id: "animals",  label: "Animals",  emoji: "🐾",  color: "#D9480F" },
  { id: "alphabet", label: "Alphabet", emoji: "🔤",  color: "#364FC7" },
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
