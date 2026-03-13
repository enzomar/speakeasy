/**
 * useFreeTier.js — Free-tier usage tracking + paywall trigger.
 *
 * Tracks per-day usage counters in localStorage.
 * Counters reset automatically at midnight (date-keyed buckets).
 *
 * Grace period: for the first N days after account creation (VITE_TRIAL_DAYS,
 * default 7) the user has full access — no limits, no paywall.
 *
 * Usage:
 *   const { canSpeak, consumeVoice, canUseAI, consumeAI, showPaywall } = useFreeTier(isPremium, userCreatedAt);
 *
 * When `isPremium` is true every check returns true and no counters are touched.
 * When the user is within the trial grace period, same behaviour as premium.
 * When a limit is exceeded, `showPaywall` becomes true — mount <Paywall> accordingly.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { FREE_TIER } from "../../services/subscription";

// ── Trial period ──────────────────────────────────────────────────────────────

/** Number of full-access days after account creation. Env var or default 7. */
const TRIAL_DAYS = Number(import.meta.env.VITE_TRIAL_DAYS) || 7;
const TRIAL_MS   = TRIAL_DAYS * 24 * 60 * 60 * 1000;

// ── Storage key helpers ───────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for today in local time */
function today() {
  return new Date().toISOString().slice(0, 10);
}

const STORAGE_PREFIX = "speakeasy_ft_"; // ft = free tier

function storageKey(name) {
  return `${STORAGE_PREFIX}${name}_${today()}`;
}

function loadCount(name) {
  try { return parseInt(localStorage.getItem(storageKey(name)) ?? "0", 10) || 0; }
  catch { return 0; }
}

function incrementCount(name) {
  try {
    const key = storageKey(name);
    const next = (parseInt(localStorage.getItem(key) ?? "0", 10) || 0) + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch { return 1; }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {boolean} isPremium       - When true (RevenueCat entitlement), limits are disabled
 * @param {string|null} userCreatedAt - Firebase user.metadata.creationTime (RFC string) or null
 */
export function useFreeTier(isPremium, userCreatedAt) {
  const [aiUsed,    setAiUsed]    = useState(() => loadCount("ai"));
  const [voiceUsed, setVoiceUsed] = useState(() => loadCount("voice"));
  const [showPaywall, setShowPaywall] = useState(false);

  // ── Trial grace period ──────────────────────────────────────────────────
  const { isInTrial, trialDaysLeft } = useMemo(() => {
    if (!userCreatedAt) return { isInTrial: false, trialDaysLeft: 0 };
    const created = new Date(userCreatedAt).getTime();
    if (Number.isNaN(created)) return { isInTrial: false, trialDaysLeft: 0 };
    const elapsed = Date.now() - created;
    if (elapsed < TRIAL_MS) {
      const daysLeft = Math.ceil((TRIAL_MS - elapsed) / (24 * 60 * 60 * 1000));
      return { isInTrial: true, trialDaysLeft: daysLeft };
    }
    return { isInTrial: false, trialDaysLeft: 0 };
  }, [userCreatedAt]);

  /** Effective "no limits" flag — premium OR within trial grace period */
  const unlimited = isPremium || isInTrial;

  // Re-read counters every time the component using this hook mounts or the
  // date changes (handles overnight sessions).
  useEffect(() => {
    setAiUsed(loadCount("ai"));
    setVoiceUsed(loadCount("voice"));
  }, []);

  // ── Derived limits ────────────────────────────────────────────────────────
  const aiLimit    = FREE_TIER.AI_CALLS_PER_DAY;
  const voiceLimit = FREE_TIER.VOICE_OUTPUTS_PER_DAY;

  const canUseAI  = unlimited || aiUsed    < aiLimit;
  const canSpeak  = unlimited || voiceUsed < voiceLimit;

  const remainingAI    = unlimited ? Infinity : Math.max(0, aiLimit    - aiUsed);
  const remainingVoice = unlimited ? Infinity : Math.max(0, voiceLimit - voiceUsed);

  // ── Consumption actions ───────────────────────────────────────────────────

  /**
   * Attempt to consume one AI call.
   * Returns true if allowed, false if the limit is reached (paywall shown).
   */
  const consumeAI = useCallback(() => {
    if (unlimited) return true;
    const used = loadCount("ai");
    if (used >= aiLimit) {
      setShowPaywall(true);
      return false;
    }
    const next = incrementCount("ai");
    setAiUsed(next);
    return true;
  }, [unlimited, aiLimit]);

  /**
   * Attempt to consume one voice output.
   * Returns true if allowed, false if the limit is reached (paywall shown).
   */
  const consumeVoice = useCallback(() => {
    if (unlimited) return true;
    const used = loadCount("voice");
    if (used >= voiceLimit) {
      setShowPaywall(true);
      return false;
    }
    const next = incrementCount("voice");
    setVoiceUsed(next);
    return true;
  }, [unlimited, voiceLimit]);

  /**
   * Check whether a new saved phrase is allowed.
   * `currentCount` is the number of phrases already saved.
   */
  const canSavePhrase = useCallback((currentCount) => {
    if (unlimited) return true;
    if (currentCount >= FREE_TIER.SAVED_PHRASES) {
      setShowPaywall(true);
      return false;
    }
    return true;
  }, [unlimited]);

  /** Imperatively open the paywall (e.g. from a settings "Upgrade" button) */
  const openPaywall  = useCallback(() => setShowPaywall(true),  []);
  const closePaywall = useCallback(() => setShowPaywall(false), []);

  return {
    // Caps
    aiLimit,
    voiceLimit,
    savedPhrasesLimit: FREE_TIER.SAVED_PHRASES,

    // Current usage
    aiUsed,
    voiceUsed,

    // Remaining
    remainingAI,
    remainingVoice,

    // Guards
    canUseAI,
    canSpeak,
    canSavePhrase,

    // Actions
    consumeAI,
    consumeVoice,

    // Trial
    isInTrial,
    trialDaysLeft,
    trialTotalDays: TRIAL_DAYS,

    // Paywall
    showPaywall,
    openPaywall,
    closePaywall,
  };
}
