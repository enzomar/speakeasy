/**
 * ConfirmSheet — reusable bottom-sheet confirmation dialog.
 */

import { useEffect, useRef } from "react";

export default function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "destructive",
}) {
  const sheetRef = useRef(null);

  /* Escape to dismiss + auto-focus + focus trap */
  useEffect(() => {
    const el = sheetRef.current;
    if (el) el.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") { onCancel(); return; }
      if (e.key === "Tab" && el) {
        const focusable = el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (focusable.length === 0) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);
  const confirmBg =
    variant === "warning" ? "var(--orange)"
    : variant === "default" ? "var(--tint)"
    : "var(--red, #FF3B30)";

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--surface)",
          borderRadius: "16px 16px 0 0",
          padding: "24px 20px",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</p>
        <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{message}</p>
        <button
          onClick={onConfirm}
          style={{
            padding: "14px", borderRadius: "var(--radius-lg)", border: "none",
            background: confirmBg, color: "#fff",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "14px", borderRadius: "var(--radius-lg)", border: "none",
            background: "var(--bg)", color: "var(--tint)",
            fontSize: 16, fontWeight: 600, cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
