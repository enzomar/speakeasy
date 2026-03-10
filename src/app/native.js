/**
 * native.js — Capacitor native bootstrap + haptic feedback.
 *
 * Runs only on native (iOS/Android); no-op on web.
 */

import { isNative, isIOS } from "../shared/platform";

// ── StatusBar + SplashScreen ────────────────────────────────────────────────
if (isNative) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (!isIOS) StatusBar.setBackgroundColor({ color: "#FFFFFF" }).catch(() => {});
  });
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide().catch(() => {});
  });
}

/** Fire a light haptic tap on native (no-op on web) */
export async function haptic() {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
}
