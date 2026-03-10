/**
 * EmotionStrip — AAC emotional tone selector.
 *
 * A thin horizontal row of 5 emoji buttons representing emotional axes.
 * Default: auto-detected (dim highlight). Tap to override; tap again to return to auto.
 *
 * Renders between MessageBar and IntentBar.
 */

import { memo, useCallback } from "react";

const EMOTION_OPTIONS = [
  { id: "neutral",   emoji: "😐", label: "Neutral"   },
  { id: "positive",  emoji: "😊", label: "Positive"  },
  { id: "negative",  emoji: "😞", label: "Negative"  },
  { id: "urgent",    emoji: "⚡", label: "Urgent"    },
  { id: "uncertain", emoji: "🤔", label: "Uncertain" },
];

export default memo(function EmotionStrip({ emotion, onChange, detectedEmotion }) {
  const handleTap = useCallback((id) => {
    // Toggle: tap the active emotion again → return to auto (null)
    onChange(emotion === id ? null : id);
  }, [emotion, onChange]);

  return (
    <div
      role="radiogroup"
      aria-label="Emotional tone"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "3px 10px",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--sep)",
        flexShrink: 0,
        minHeight: 36,
      }}
    >
      {EMOTION_OPTIONS.map(({ id, emoji, label }) => {
        const isActive   = emotion === id;
        const isDetected = emotion === null && detectedEmotion === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => handleTap(id)}
            style={{
              width: 34,
              height: 30,
              borderRadius: 10,
              border: isActive ? "1.5px solid var(--tint)" : "1.5px solid transparent",
              background: isActive
                ? "var(--tint-soft)"
                : isDetected
                  ? "rgba(128,128,128,0.1)"
                  : "transparent",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              transition: "all 0.12s ease",
              opacity: isActive ? 1 : isDetected ? 0.85 : 0.45,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            {emoji}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-4)",
          marginLeft: 4,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        {emotion ? emotion : "auto"}
      </span>
    </div>
  );
});
