/**
 * ConfirmSheet — reusable bottom-sheet confirmation dialog.
 */

export default function ConfirmSheet({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "destructive",
}) {
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
