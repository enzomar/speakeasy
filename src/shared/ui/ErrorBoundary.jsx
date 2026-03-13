/**
 * ErrorBoundary — catches unhandled render errors and shows a friendly message
 * instead of a blank screen. Required to be a class component per React API.
 */
import { Component } from "react";
import { getUI } from "../../i18n/ui-strings";

/** Read UI language from localStorage (same key used by useLanguage). */
function detectLang() {
  try {
    return localStorage.getItem("speakeasy_uilang_v1") ||
           localStorage.getItem("speakeasy_typelang_v1") ||
           navigator.language?.slice(0, 2) || "en";
  } catch { return "en"; }
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; replace with a reporting service if needed.
    console.error("[SpeakEasy] Uncaught render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const ui = getUI(detectLang());

    return (
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100svh",
        padding:        "32px 24px",
        background:     "var(--bg, #F2F2F7)",
        textAlign:      "center",
        gap:            16,
      }}>
        <div style={{ fontSize: 52 }}>😔</div>
        <div style={{
          fontSize:   20,
          fontWeight: 700,
          color:      "var(--text, #1C1C1E)",
        }}>
          {ui?.errorTitle ?? "Something went wrong"}
        </div>
        <div style={{
          fontSize: 14,
          color:    "var(--text-3, #8E8E93)",
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          {ui?.errorDesc ?? "SpeakEasy encountered an unexpected error. Your history and settings are safe."}
        </div>
        <button
          onClick={this.handleReset}
          style={{
            marginTop:    8,
            padding:      "12px 28px",
            borderRadius: 14,
            border:       "none",
            background:   "var(--tint, #007AFF)",
            color:        "#fff",
            fontSize:     15,
            fontWeight:   600,
            cursor:       "pointer",
          }}
        >
          {ui?.errorRetry ?? "Try again"}
        </button>
        <details style={{ marginTop: 8, fontSize: 11, color: "var(--text-4, #C7C7CC)", maxWidth: 340 }}>
          <summary style={{ cursor: "pointer" }}>{ui?.errorDetails ?? "Error details"}</summary>
          <pre style={{ marginTop: 8, textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error.message}
          </pre>
        </details>
      </div>
    );
  }
}
