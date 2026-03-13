/**
 * SubscriptionBanner.jsx — Small upgrade nudge banner.
 *
 * Shows usage counters (AI calls left, voice outputs left) and an
 * "Upgrade to Premium" button that opens the Paywall.
 *
 * Props:
 *   remainingAI    {number}   - AI calls remaining today
 *   remainingVoice {number}   - voice outputs remaining today
 *   aiLimit        {number}   - daily AI limit
 *   voiceLimit     {number}   - daily voice limit
 *   isPremium      {boolean}  - hide banner when premium
 *   onUpgrade      {fn}       - open paywall callback
 */

import { Star } from "lucide-react";

export default function SubscriptionBanner({
  remainingAI,
  remainingVoice,
  aiLimit,
  voiceLimit,
  isPremium,
  onUpgrade,
}) {
  if (isPremium) return null;

  const aiLow    = remainingAI    <= Math.floor(aiLimit    * 0.3);
  const voiceLow = remainingVoice <= Math.floor(voiceLimit * 0.3);
  const anyLow   = aiLow || voiceLow;

  return (
    <div style={{
      margin: "12px 16px",
      padding: "14px 16px",
      borderRadius: 16,
      background: anyLow
        ? "linear-gradient(135deg,rgba(255,149,0,0.12),rgba(255,59,48,0.08))"
        : "linear-gradient(135deg,rgba(0,122,255,0.08),rgba(88,86,214,0.06))",
      border: `1.5px solid ${anyLow ? "rgba(255,149,0,0.35)" : "rgba(0,122,255,0.18)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {anyLow ? "⚠️ Running low on free uses" : "Free plan"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
            AI: <strong>{remainingAI}</strong>/{aiLimit} left today
            &nbsp;&nbsp;·&nbsp;&nbsp;
            Voice: <strong>{remainingVoice}</strong>/{voiceLimit} left today
          </div>
        </div>
        <button
          onClick={onUpgrade}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", borderRadius: 10, border: "none",
            background: "var(--tint)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Star size={13} fill="#fff" /> Upgrade
        </button>
      </div>
    </div>
  );
}
