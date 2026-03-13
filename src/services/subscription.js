/**
 * subscription.js — Unified subscription & entitlement service.
 *
 * Single source of truth for "is the current user premium?".
 *
 * Priority order:
 *   1. DEV bypass  — VITE_DEV_SUBSCRIPTION_OVERRIDE=true (dev builds only)
 *   2. RevenueCat  — live entitlement from the native SDK (mobile only)
 *   3. Web stub    — always returns false; UI tells users to subscribe via app
 *
 * Usage:
 *   import { getSubscriptionStatus } from "./subscription";
 *   const { isPremium, source } = await getSubscriptionStatus();
 */

import { isNative } from "../shared/platform";
import { getIsPremium } from "./revenuecat";

// ── Developer bypass ──────────────────────────────────────────────────────────
// Only active when the build was started with:
//   VITE_DEV_SUBSCRIPTION_OVERRIDE=true
// Never appears in production builds because Vite statically replaces the env
// string and dead-code-eliminates the bypass branch.

const IS_DEV_OVERRIDE =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_SUBSCRIPTION_OVERRIDE === "true";

// ── Free-tier limits ──────────────────────────────────────────────────────────
// These are the default thresholds for free users.
// Premium users have no limits.

export const FREE_TIER = {
  /** Maximum AI prediction/correction calls per day */
  AI_CALLS_PER_DAY: 10,
  /** Maximum voice output (speak) calls per day */
  VOICE_OUTPUTS_PER_DAY: 20,
  /** Maximum number of saved favourite phrases */
  SAVED_PHRASES: 5,
};

// ── Status result type ────────────────────────────────────────────────────────

/**
 * @typedef {Object} SubscriptionStatus
 * @property {boolean}  isPremium  - User has active premium entitlement
 * @property {'dev'|'revenuecat'|'web_stub'|'error'} source - Where the status came from
 * @property {string|null} error   - Error message if source === 'error'
 */

// ── Main status check ─────────────────────────────────────────────────────────

/**
 * Asynchronously resolves the subscription status for the current user.
 *
 * @returns {Promise<SubscriptionStatus>}
 */
export async function getSubscriptionStatus() {
  // 1. Developer override — always premium in dev
  if (IS_DEV_OVERRIDE) {
    console.info("[Subscription] DEV override active — treating as premium.");
    return { isPremium: true, source: "dev", error: null };
  }

  // 2. Native path — ask RevenueCat
  if (isNative) {
    try {
      const premium = await getIsPremium();
      return { isPremium: premium, source: "revenuecat", error: null };
    } catch (err) {
      console.warn("[Subscription] RevenueCat check failed:", err?.message ?? err);
      return { isPremium: false, source: "error", error: err?.message ?? "Unknown error" };
    }
  }

  // 3. Web — no purchases allowed; always free tier
  return { isPremium: false, source: "web_stub", error: null };
}

/**
 * Quick synchronous guess — only useful for initial UI render before the
 * async check completes. Returns true only if the dev override is active.
 */
export function getSubscriptionStatusSync() {
  if (IS_DEV_OVERRIDE) return { isPremium: true, source: "dev", error: null };
  return { isPremium: false, source: "unknown", error: null };
}

/**
 * Whether the current platform can initiate a purchase.
 * Only mobile apps (not web) are allowed to purchase per App Store / Play rules.
 */
export const canPurchase = isNative;

/**
 * Whether the dev override is in effect.
 * Use this to show a "DEV MODE" badge in the UI.
 */
export const isDevOverride = IS_DEV_OVERRIDE;
