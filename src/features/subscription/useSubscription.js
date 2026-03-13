/**
 * useSubscription.js — React hook for subscription / entitlement state.
 *
 * Resolves premium status once on mount (and whenever the user changes)
 * and exposes helpers to open the paywall or restore purchases.
 *
 * Returns:
 *   isPremium      {boolean}   - user has active premium entitlement
 *   isLoading      {boolean}   - still resolving from RevenueCat
 *   source         {string}    - 'dev' | 'revenuecat' | 'web_stub' | 'error'
 *   isDevOverride  {boolean}   - dev bypass is active
 *   offering       {object|null} - RevenueCat Offering (mobile only)
 *   refresh()      {fn}        - re-check subscription status (after purchase)
 *   restore()      {Promise}   - restore purchases
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getSubscriptionStatus, isDevOverride } from "../../services/subscription";
import { getOffering, restorePurchases }         from "../../services/revenuecat";
import { isNative }                              from "../../shared/platform";

export function useSubscription(user) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [source,    setSource]    = useState("unknown");
  const [offering,  setOffering]  = useState(null);

  // Track the last user ID we fetched for to avoid redundant calls
  const lastUserIdRef = useRef(undefined);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { isPremium: premium, source: src } = await getSubscriptionStatus();
      setIsPremium(premium);
      setSource(src);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Also fetch the RevenueCat offering so the Paywall can display products.
  const fetchOffering = useCallback(async () => {
    if (!isNative) return;
    const offer = await getOffering();
    setOffering(offer);
  }, []);

  // Re-fetch whenever the authenticated user changes
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === lastUserIdRef.current) return;
    lastUserIdRef.current = uid;
    fetchStatus();
    fetchOffering();
  }, [user, fetchStatus, fetchOffering]);

  const refresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  const restore = useCallback(async () => {
    const result = await restorePurchases();
    if (result.success) {
      refresh();
    }
    return result;
  }, [refresh]);

  return {
    isPremium,
    isLoading,
    source,
    isDevOverride,
    offering,
    refresh,
    restore,
  };
}
