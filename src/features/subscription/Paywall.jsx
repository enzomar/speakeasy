/**
 * Paywall.jsx — Subscription paywall modal.
 *
 * Behaviour differs by platform:
 *   Mobile — shows subscription packages from RevenueCat and a purchase button.
 *   Web    — shows a message directing the user to the mobile app.
 *
 * Props:
 *   isOpen      {boolean}              - controls visibility
 *   onClose     {() => void}           - dismiss callback (paywall is dismissible)
 *   onPurchased {() => void}           - called after a successful purchase
 *   offering    {object|null}          - RevenueCat offering (from useSubscription)
 *   restore     {() => Promise}        - restorePurchases from useSubscription
 *   reason      {string}               - why the paywall is showing (for copy)
 */

import { useState, useCallback } from "react";
import { X, Star, Zap, Infinity, Globe, Loader2, RotateCcw } from "lucide-react";
import { isNative } from "../../shared/platform";
import { purchasePackage } from "../../services/revenuecat";
import { isDevOverride }   from "../../services/subscription";

// ── Premium feature list ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: Zap,      text: "Unlimited AI suggestions & corrections" },
  { icon: Infinity, text: "Unlimited voice outputs per day"         },
  { icon: Star,     text: "Unlimited saved favourite phrases"        },
  { icon: Globe,    text: "Priority support"                        },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1100,
    background: "rgba(0,0,0,0.60)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "fadeIn 0.15s ease",
  },
  sheet: {
    width: "100%", maxWidth: 500,
    background: "var(--bg)",
    borderRadius: "22px 22px 0 0",
    padding: "32px 24px calc(env(safe-area-inset-bottom, 0px) + 32px)",
    boxShadow: "0 -4px 40px rgba(0,0,0,0.20)",
    animation: "slideUp 0.25s cubic-bezier(.32,1.1,.6,1)",
  },
  closeBtn: {
    position: "absolute", top: 18, right: 18,
    width: 34, height: 34, borderRadius: 17,
    border: "none", background: "var(--surface)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--text-2)",
    WebkitTapHighlightColor: "transparent",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 12px", borderRadius: 20,
    background: "linear-gradient(135deg, #f7b955, #f58a5b)",
    color: "#fff", fontSize: 13, fontWeight: 700,
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 24 },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 28px" },
  featureItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 0",
    borderBottom: "0.5px solid var(--sep)",
    fontSize: 15, color: "var(--text)",
  },
  featureIcon: { color: "var(--tint)", flexShrink: 0 },
  packageCard: (selected) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", borderRadius: 14, marginBottom: 10,
    border: selected ? "2px solid var(--tint)" : "1.5px solid var(--sep)",
    background: selected ? "rgba(var(--tint-rgb, 0,122,255),0.07)" : "var(--surface)",
    cursor: "pointer", WebkitTapHighlightColor: "transparent",
    transition: "all 0.15s",
  }),
  pkgTitle:  { fontSize: 16, fontWeight: 700, color: "var(--text)" },
  pkgPrice:  { fontSize: 15, fontWeight: 600, color: "var(--tint)" },
  pkgPer:    { fontSize: 12, color: "var(--text-3)", marginTop: 2 },
  primaryBtn: (disabled) => ({
    width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
    background: disabled ? "var(--sep)" : "var(--tint)",
    color: disabled ? "var(--text-3)" : "#fff",
    fontSize: 17, fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    WebkitTapHighlightColor: "transparent",
    transition: "background 0.15s",
  }),
  restoreBtn: {
    width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 14,
    border: "1.5px solid var(--sep)", background: "transparent",
    color: "var(--text-2)", fontSize: 14, fontWeight: 600,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    WebkitTapHighlightColor: "transparent",
  },
  webMessage: {
    padding: "20px 16px", borderRadius: 16, textAlign: "center",
    background: "var(--surface)",
    border: "1.5px solid var(--sep)",
    color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, marginBottom: 24,
  },
  errorBox: {
    marginTop: 14, padding: "10px 14px", borderRadius: 10,
    background: "rgba(255,59,48,0.10)", color: "var(--red, #FF3B30)", fontSize: 14,
  },
};

export default function Paywall({ isOpen, onClose, onPurchased, offering, restore }) {
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [restoring,   setRestoring]   = useState(false);
  const [error,       setError]       = useState(null);

  // Auto-select first/monthly package when offering loads
  const packages = offering?.availablePackages ?? [];
  const activeSelection = selectedPkg ?? packages[0] ?? null;

  const handlePurchase = useCallback(async () => {
    if (!activeSelection || loading) return;
    setError(null);
    setLoading(true);
    try {
      const { success, error: err } = await purchasePackage(activeSelection);
      if (err) { setError(err); return; }
      if (success) {
        onPurchased?.();
        onClose?.();
      }
    } catch (e) {
      setError(e?.message ?? "Purchase failed.");
    } finally {
      setLoading(false);
    }
  }, [activeSelection, loading, onPurchased, onClose]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    setError(null);
    try {
      const { success, error: err } = await restore?.() ?? { success: false, error: "No restore function provided." };
      if (err) { setError(err); return; }
      if (success) {
        onPurchased?.();
        onClose?.();
      } else {
        setError("No active subscription found on this account.");
      }
    } finally {
      setRestoring(false);
    }
  }, [restore, onPurchased, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>

      <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
        <div style={{ ...S.sheet, position: "relative" }}
             role="dialog" aria-modal="true" aria-label="Premium subscription">

          {/* Close button */}
          <button style={S.closeBtn} onClick={onClose} aria-label="Close paywall">
            <X size={17} strokeWidth={2.5} />
          </button>

          {/* Dev bypass badge */}
          {isDevOverride && (
            <div style={{ ...S.badge, background: "rgba(0,200,100,0.2)", color: "var(--green)", marginBottom: 10 }}>
              🛠 DEV OVERRIDE — paywall bypassed in production
            </div>
          )}

          {/* Premium badge */}
          <div style={S.badge}>
            <Star size={13} fill="#fff" /> SpeakEasy Premium
          </div>

          <h2 style={S.title}>Unlock full access</h2>
          <p style={S.subtitle}>
            Communicate without limits. Upgrade to Premium to remove all restrictions.
          </p>

          {/* Feature list */}
          <ul style={S.featureList}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} style={S.featureItem}>
                <Icon size={20} strokeWidth={2} style={S.featureIcon} />
                {text}
              </li>
            ))}
          </ul>

          {/* ── Mobile: show packages ── */}
          {isNative ? (
            <>
              {packages.length > 0 ? (
                <>
                  {packages.map((pkg) => (
                    <div
                      key={pkg.identifier}
                      style={S.packageCard(pkg === activeSelection)}
                      onClick={() => setSelectedPkg(pkg)}
                      role="radio"
                      aria-checked={pkg === activeSelection}
                    >
                      <div>
                        <div style={S.pkgTitle}>{pkg.product?.title ?? pkg.packageType}</div>
                        <div style={S.pkgPer}>{pkg.packageType === "MONTHLY" ? "per month" : "per year"}</div>
                      </div>
                      <div style={S.pkgPrice}>{pkg.product?.priceString ?? "—"}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={S.webMessage}>
                  Loading subscription options…
                </div>
              )}

              {error && <div style={S.errorBox}>{error}</div>}

              <button
                style={S.primaryBtn(loading || !activeSelection)}
                onClick={handlePurchase}
                disabled={loading || !activeSelection}
              >
                {loading
                  ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Processing…</>
                  : "Start free trial"}
              </button>

              <button style={S.restoreBtn} onClick={handleRestore} disabled={restoring}>
                {restoring
                  ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Restoring…</>
                  : <><RotateCcw size={16} /> Restore purchases</>}
              </button>
            </>
          ) : (
            /* ── Web: redirect to mobile ── */
            <>
              <div style={S.webMessage}>
                📱 <strong>Subscriptions are available in the mobile app.</strong>
                <br /><br />
                Please install <strong>SpeakEasy</strong> on iOS or Android to subscribe.
                Your account and progress sync automatically between web and mobile.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <a
                  href="https://apps.apple.com/app/speakeasy-aac"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...S.primaryBtn(false), flex: 1, textDecoration: "none" }}
                >
                  🍎 App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=io.speakeasy.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...S.primaryBtn(false), flex: 1, textDecoration: "none" }}
                >
                  🤖 Google Play
                </a>
              </div>
            </>
          )}

          <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 16 }}>
            Recurring billing. Cancel any time in your App Store / Play Store settings.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </>
  );
}
