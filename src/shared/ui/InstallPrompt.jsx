/**
 * InstallPrompt — PWA "Add to Home Screen" banner.
 *
 * Android/Chrome: captures the `beforeinstallprompt` event and shows a banner
 * with an "Install" button that triggers the native prompt.
 *
 * iOS Safari: the browser never fires `beforeinstallprompt`, so we detect
 * standalone mode + Safari and show manual instructions instead.
 *
 * The banner is dismissed permanently via localStorage so it never re-appears
 * after the user explicitly closes it.
 */

import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";

const STORAGE_KEY = "speakeasy_pwa_prompt_dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

export default function InstallPrompt({ ui }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIos, setShowIos]               = useState(false);
  const [visible, setVisible]               = useState(false);

  useEffect(() => {
    // Already dismissed or already installed
    if (localStorage.getItem(STORAGE_KEY) || isInStandaloneMode()) return;

    if (isIos()) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => setShowIos(true), 3000);
      return () => clearTimeout(t);
    }

    // Android / Chrome / Edge: wait for the browser prompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Keep iOS visibility in sync
  useEffect(() => {
    if (showIos) setVisible(true);
  }, [showIos]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop (iOS only, to draw attention to the sheet) */}
      {showIos && (
        <div
          onClick={dismiss}
          style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "rgba(0,0,0,0.4)",
          }}
        />
      )}

      {/* Banner / Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui?.installTitle ?? "Install SpeakEasy"}
        style={{
          position: "fixed",
          ...(showIos
            ? { bottom: 0, left: 0, right: 0, borderRadius: "22px 22px 0 0" }
            : { bottom: 24, left: 16, right: 16, borderRadius: 20 }),
          zIndex: 910,
          background: "var(--elevated)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.22)",
          padding: showIos ? "28px 22px 40px" : "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: showIos ? 18 : 14,
          animation: "slideUp 0.28s cubic-bezier(0.34,1.4,0.64,1)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/pwa-192.png"
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>
              {ui?.installTitle ?? "SpeakEasy"}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-3)", marginTop: 2 }}>
              {ui?.installSubtitle ?? "Install for offline access"}
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label={ui?.installDismiss ?? "Dismiss"}
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: "var(--grouped-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={18} strokeWidth={2.2} color="var(--text-3)" />
          </button>
        </div>

        {showIos ? (
          /* iOS instructions */
          <>
            <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
              {ui?.installIosDesc ?? "Add SpeakEasy to your home screen for the full-screen experience \u2014 works even when offline."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Step n={1} icon={<Share size={18} />} text={ui?.installStep1 ?? 'Tap the Share button in Safari'} />
              <Step n={2} icon={<PlusSquare size={18} />} text={ui?.installStep2 ?? 'Scroll down and tap \u201cAdd to Home Screen\u201d'} />
              <Step n={3} icon="\u2705" text={ui?.installStep3 ?? 'Tap \u201cAdd\u201d in the top-right corner'} />
            </div>
            <button
              onClick={dismiss}
              style={{
                marginTop: 4,
                padding: "14px 0", borderRadius: 14,
                background: "var(--tint)", color: "#fff",
                fontSize: 16, fontWeight: 700, width: "100%",
              }}
            >
              {ui?.installGotIt ?? "Got it"}
            </button>
          </>
        ) : (
          /* Android / Chrome install */
          <>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
              {ui?.installAndroidDesc ?? "Add SpeakEasy to your home screen for instant access and offline support."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={dismiss}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  background: "var(--grouped-bg)", color: "var(--text-2)",
                  fontSize: 15, fontWeight: 600,
                }}
              >
                {ui?.installNotNow ?? "Not now"}
              </button>
              <button
                onClick={install}
                style={{
                  flex: 2, padding: "12px 0", borderRadius: 12,
                  background: "var(--tint)", color: "#fff",
                  fontSize: 15, fontWeight: 700,
                }}
              >
                {ui?.installBtn ?? "Install"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Step({ n, icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: "var(--tint-soft)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "var(--tint)", fontWeight: 700, fontSize: 13,
      }}>
        {typeof icon === "string" ? icon : icon}
      </div>
      <span style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}
