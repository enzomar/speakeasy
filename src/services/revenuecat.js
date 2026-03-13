/**
 * revenuecat.js — RevenueCat subscription management for SpeakEasy.
 *
 * RevenueCat is only available on native (iOS/Android).
 * This module exports a unified API; on web every function is a no-op that
 * returns a "not subscribed" result so the rest of the app can handle web
 * gracefully.
 *
 * Configuration (Vite env vars):
 *   VITE_RC_IOS_KEY=appl_xxxxxxxxxxxx
 *   VITE_RC_ANDROID_KEY=goog_xxxxxxxxxxxx
 *
 * The entitlement ID to check for premium access:
 *   VITE_RC_ENTITLEMENT=premium
 *
 * The product offering identifier in RevenueCat:
 *   VITE_RC_OFFERING=default
 */

import { isNative, isIOS, isAndroid } from "../shared/platform";

// ── Configuration ─────────────────────────────────────────────────────────────

const RC_IOS_KEY     = import.meta.env.VITE_RC_IOS_KEY      ?? "";
const RC_ANDROID_KEY = import.meta.env.VITE_RC_ANDROID_KEY  ?? "";
const ENTITLEMENT_ID = import.meta.env.VITE_RC_ENTITLEMENT  ?? "premium";
const OFFERING_ID    = import.meta.env.VITE_RC_OFFERING     ?? "default";

// ── Internal state ────────────────────────────────────────────────────────────

let _purchases = null;   // RevenueCat Purchases instance (native only)
let _initialised = false;

// ── Lazy SDK initialisation ───────────────────────────────────────────────────

async function getPurchases() {
  if (!isNative) return null;
  if (_purchases) return _purchases;
  if (_initialised) return null; // already tried and failed

  _initialised = true;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    _purchases = Purchases;
    return _purchases;
  } catch (err) {
    console.warn("[RevenueCat] Failed to load SDK — purchases disabled.", err);
    return null;
  }
}

// ── Initialise with API key + user ID ────────────────────────────────────────

/**
 * Call once on app start, after the user is identified.
 * @param {string|null} userId - Firebase auth UID (or null for anonymous)
 */
export async function initRevenueCat(userId) {
  if (!isNative) return;

  const RC = await getPurchases();
  if (!RC) return;

  const apiKey = isIOS ? RC_IOS_KEY : isAndroid ? RC_ANDROID_KEY : "";
  if (!apiKey) {
    console.warn("[RevenueCat] API key not configured for platform.");
    return;
  }

  try {
    await RC.configure({ apiKey, appUserID: userId ?? null });
    console.info("[RevenueCat] Configured. userId=", userId ?? "anonymous");
  } catch (err) {
    console.warn("[RevenueCat] Configure failed:", err?.message ?? err);
  }
}

// ── User identity ─────────────────────────────────────────────────────────────

/**
 * Log in a known user — links RevenueCat purchases to the Firebase UID.
 * Call after Firebase login/signup.
 */
export async function loginRevenueCat(userId) {
  if (!isNative || !userId) return;
  const RC = await getPurchases();
  if (!RC) return;
  try {
    await RC.logIn({ appUserID: userId });
  } catch (err) {
    console.warn("[RevenueCat] logIn failed:", err?.message ?? err);
  }
}

/**
 * Log out — reverts to a random anonymous user ID in RevenueCat.
 * Call after Firebase signOut.
 */
export async function logoutRevenueCat() {
  if (!isNative) return;
  const RC = await getPurchases();
  if (!RC) return;
  try {
    await RC.logOut();
  } catch (err) {
    console.warn("[RevenueCat] logOut failed:", err?.message ?? err);
  }
}

// ── Entitlement / subscription status ────────────────────────────────────────

/**
 * Returns whether the user has an active premium entitlement.
 * Always returns false on web.
 *
 * @returns {Promise<boolean>}
 */
export async function getIsPremium() {
  if (!isNative) return false;
  const RC = await getPurchases();
  if (!RC) return false;
  try {
    const { customerInfo } = await RC.getCustomerInfo();
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (err) {
    console.warn("[RevenueCat] getCustomerInfo failed:", err?.message ?? err);
    return false;
  }
}

/**
 * Returns full CustomerInfo object, or null on failure / web.
 */
export async function getCustomerInfo() {
  if (!isNative) return null;
  const RC = await getPurchases();
  if (!RC) return null;
  try {
    const { customerInfo } = await RC.getCustomerInfo();
    return customerInfo ?? null;
  } catch {
    return null;
  }
}

// ── Offering + purchase ───────────────────────────────────────────────────────

/**
 * Fetch the current offering from RevenueCat.
 * Returns the offering object or null.
 */
export async function getOffering() {
  if (!isNative) return null;
  const RC = await getPurchases();
  if (!RC) return null;
  try {
    const { offerings } = await RC.getOfferings();
    return offerings?.current ?? offerings?.[OFFERING_ID] ?? null;
  } catch (err) {
    console.warn("[RevenueCat] getOfferings failed:", err?.message ?? err);
    return null;
  }
}

/**
 * Purchase a specific package from an offering.
 *
 * @param {object} rcPackage - Package object from getOffering()
 * @returns {Promise<{ success: boolean; customerInfo: object|null; error: string|null }>}
 */
export async function purchasePackage(rcPackage) {
  if (!isNative) {
    return { success: false, customerInfo: null, error: "Purchases not available on web." };
  }
  const RC = await getPurchases();
  if (!RC) {
    return { success: false, customerInfo: null, error: "RevenueCat SDK not available." };
  }
  try {
    const { customerInfo } = await RC.purchasePackage({ aPackage: rcPackage });
    const success = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return { success, customerInfo, error: null };
  } catch (err) {
    // User cancelled is not a real error
    if (err?.userCancelled || err?.code === "1") {
      return { success: false, customerInfo: null, error: null };
    }
    return { success: false, customerInfo: null, error: err?.message ?? "Purchase failed." };
  }
}

/**
 * Restore previous purchases (e.g. after re-install).
 * @returns {Promise<{ success: boolean; customerInfo: object|null; error: string|null }>}
 */
export async function restorePurchases() {
  if (!isNative) {
    return { success: false, customerInfo: null, error: "Not available on web." };
  }
  const RC = await getPurchases();
  if (!RC) {
    return { success: false, customerInfo: null, error: "RevenueCat SDK not available." };
  }
  try {
    const { customerInfo } = await RC.restorePurchases();
    const success = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return { success, customerInfo, error: null };
  } catch (err) {
    return { success: false, customerInfo: null, error: err?.message ?? "Restore failed." };
  }
}
