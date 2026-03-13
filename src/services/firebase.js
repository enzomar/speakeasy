/**
 * firebase.js — Firebase Auth client for SpeakEasy.
 *
 * Uses the Firebase JS SDK v10 (modular API).
 * Session persistence uses browserLocalPersistence on both web and native
 * (Capacitor WebView fully supports localStorage/IndexedDB).
 *
 * Configuration — add to .env.local:
 *   VITE_FIREBASE_API_KEY=AIza...
 *   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID=your-project-id
 *   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
 *
 * Firebase Console setup:
 *   Authentication → Sign-in method → enable Email/Password + Google
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut          as fbSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";

// ── Configuration ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:    import.meta.env.VITE_FIREBASE_API_KEY      ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID  ?? "",
  appId:      import.meta.env.VITE_FIREBASE_APP_ID       ?? "",
};

if (!firebaseConfig.apiKey) {
  console.warn(
    "[SpeakEasy] Firebase env vars missing. " +
    "Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, " +
    "VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to your .env.local file.",
  );
}

// Prevent duplicate initialisation in hot-reload environments
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persist session across browser restarts and app re-launches
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Sign up with email + password.
 * Returns { user, error }.
 */
export async function signUp(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err) {
    return { user: null, error: { message: _friendlyError(err.code) } };
  }
}

/**
 * Sign in with email + password.
 * Returns { user, error }.
 */
export async function signIn(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err) {
    return { user: null, error: { message: _friendlyError(err.code) } };
  }
}

/**
 * Sign in with Google via popup.
 * Works on web and inside Capacitor's WebView.
 * Returns { user, error }.
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    // Request email scope (included by default, but explicit is cleaner)
    provider.addScope("email");
    provider.addScope("profile");
    // Prompt account chooser every time so users can switch accounts
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    return { user: credential.user, error: null };
  } catch (err) {
    // User closed the popup — treat as a silent cancel
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      return { user: null, error: null };
    }
    return { user: null, error: { message: _friendlyError(err.code) } };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  try {
    await fbSignOut(auth);
    return { error: null };
  } catch (err) {
    return { error: { message: err.message } };
  }
}

/**
 * Get the currently authenticated user synchronously (null if not signed in).
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 *
 * @param {(user: User|null) => void} callback
 */
export function onAuthStateChange(callback) {
  // Wraps Firebase's onAuthStateChanged to make it easy to unsubscribe.
  return onAuthStateChanged(auth, callback);
}

// ── Password & Account management ────────────────────────────────────────────

/**
 * Re-authenticate the current user with their email + password.
 * Required before sensitive operations like password change or account deletion.
 */
async function _reauthenticate(currentPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Change the current user's password.
 * Requires re-authentication first (Firebase security rule).
 * Returns { error }.
 */
export async function changePassword(currentPassword, newPassword) {
  try {
    await _reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
    return { error: null };
  } catch (err) {
    return { error: { message: _friendlyError(err.code) } };
  }
}

/**
 * Send a password-reset email to the current user's address.
 * Returns { error }.
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (err) {
    return { error: { message: _friendlyError(err.code) } };
  }
}

/**
 * Permanently delete the current user's account.
 * Requires re-authentication. This is irreversible (GDPR compliance).
 * Returns { error }.
 */
export async function deleteAccount(currentPassword) {
  try {
    await _reauthenticate(currentPassword);
    await deleteUser(auth.currentUser);
    return { error: null };
  } catch (err) {
    return { error: { message: _friendlyError(err.code) } };
  }
}

// ── Error message humanisation ────────────────────────────────────────────────

function _friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":    return "An account with this email already exists.";
    case "auth/invalid-email":           return "Please enter a valid email address.";
    case "auth/weak-password":           return "Password must be at least 6 characters.";
    case "auth/user-not-found":          return "No account found with this email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":     return "Incorrect email or password.";
    case "auth/too-many-requests":       return "Too many attempts. Please wait a moment and try again.";
    case "auth/user-disabled":           return "This account has been disabled.";
    case "auth/network-request-failed":  return "Network error. Please check your connection.";
    case "auth/popup-blocked":           return "Google sign-in popup was blocked. Please allow popups for this site.";
    default:                             return "Something went wrong. Please try again.";
  }
}
