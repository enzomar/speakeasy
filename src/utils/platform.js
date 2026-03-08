/**
 * platform.js — Capacitor platform detection & utilities.
 *
 * Provides a thin abstraction layer so the rest of the app can run
 * identically on web (Vite dev server) and native (iOS/Android via Capacitor).
 *
 * localStorage works in both environments (Capacitor WebView supports it),
 * so hooks that only use localStorage need no changes.
 */

import { Capacitor } from "@capacitor/core";

/** Is the app running inside a Capacitor native shell? */
export const isNative = Capacitor.isNativePlatform();

/** "ios" | "android" | "web" */
export const platform = Capacitor.getPlatform();

/** Is the device iOS? */
export const isIOS = platform === "ios";

/** Is the device Android? */
export const isAndroid = platform === "android";
