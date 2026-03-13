/**
 * demoMode.js — Central demo-mode flag.
 *
 * When VITE_DEMO=true the app runs in a restricted "showcase" mode:
 *   • AI is completely disabled (red diagonal strike on the AI header button)
 *   • Listen mode is disabled (red diagonal strike on the Ear header button,
 *     long-press on the FAB is a no-op)
 *   • Subscription / paywall logic and UI are hidden
 *   • Trial-day counter is hidden
 *   • Login / sign-up is bypassed — the app is usable without an account
 *
 * Set VITE_DEMO=true in your .env.local (or pass it on the CLI) to activate.
 * By default (missing or "false") everything works as normal.
 */

export const IS_DEMO = import.meta.env.VITE_DEMO === "true";
