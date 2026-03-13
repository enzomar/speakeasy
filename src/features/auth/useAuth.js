/**
 * useAuth.js — React hook for Firebase authentication state.
 *
 * Provides:
 *   user        - current Firebase User object (null = not logged in)
 *   isLoading   - true while initial auth state is being resolved
 *   signUp()    - create account
 *   signIn()    - email/password login
 *   signOut()   - log out
 *
 * Also handles:
 *   - Linking the Firebase UID to RevenueCat on login
 *   - Unlinking RevenueCat on logout
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChange,
  getCurrentUser,
  signUp          as fbSignUp,
  signIn          as fbSignIn,
  signOut         as fbSignOut,
  changePassword  as fbChangePassword,
  resetPassword   as fbResetPassword,
  deleteAccount   as fbDeleteAccount,
} from "../../services/firebase";
import {
  initRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
} from "../../services/revenuecat";

export function useAuth() {
  const [user,      setUser]      = useState(() => getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);

  // Track whether RC has been initialised so we only do it once.
  const rcInitRef  = useRef(false);
  const prevUidRef = useRef(undefined);

  // ── Bootstrap: Firebase fires onAuthStateChanged immediately ─────────────
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChange((fbUser) => {
      if (cancelled) return;

      setUser(fbUser);
      setIsLoading(false);

      const uid = fbUser?.uid ?? null;

      // Initialise RevenueCat once (anonymous if no user yet)
      if (!rcInitRef.current) {
        rcInitRef.current = true;
        initRevenueCat(uid);
      }

      // Sign-in transition
      if (uid && prevUidRef.current !== uid) {
        loginRevenueCat(uid);
      }
      // Sign-out transition
      if (!uid && prevUidRef.current) {
        logoutRevenueCat();
      }
      prevUidRef.current = uid;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // ── Action wrappers ───────────────────────────────────────────────────────

  const signUp = useCallback(async (email, password) => {
    return fbSignUp(email, password);
  }, []);

  const signIn = useCallback(async (email, password) => {
    return fbSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    return fbSignOut();
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return fbChangePassword(currentPassword, newPassword);
  }, []);

  const resetPassword = useCallback(async (email) => {
    return fbResetPassword(email);
  }, []);

  const deleteAccount = useCallback(async (currentPassword) => {
    const result = await fbDeleteAccount(currentPassword);
    if (!result.error) {
      // Account deleted — unlink RevenueCat
      logoutRevenueCat();
    }
    return result;
  }, []);

  return {
    user,
    // Firebase user UID (used as RevenueCat app user ID)
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    changePassword,
    resetPassword,
    deleteAccount,
  };
}
