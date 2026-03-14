/**
 * PhraseGrid — tappable grid of pre-built phrases.
 * Used by Quick Reply, Questions, and Emergency board tabs.
 * Single tap = speak immediately (1-tap UX).
 */

import { memo } from "react";
import { Volume2 } from "lucide-react";

export default memo(function PhraseGrid({
  phrases,
  langCode = "en",
  isEmergency = false,
  onTapSpeak,
}) {
  if (!phrases?.length) return null;

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "12px 14px 88px",
      background: "var(--bg)",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isEmergency
          ? "repeat(auto-fill, minmax(150px, 1fr))"
          : "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8,
      }}>
        {phrases.map(phrase => {
          const text = phrase.translations?.[langCode]
            || phrase.translations?.en
            || phrase.label;
          const isUrgent = phrase.urgent && isEmergency;

          return (
            <button
              key={phrase.id}
              onClick={() => onTapSpeak(text)}
              aria-label={text}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isUrgent ? "18px 10px" : "14px 10px",
                borderRadius: "var(--radius-lg)",
                border: isUrgent
                  ? "2px solid var(--red)"
                  : isEmergency
                    ? "1.5px solid rgba(255,59,48,0.3)"
                    : "1px solid var(--sep)",
                background: isUrgent
                  ? "rgba(255,59,48,0.1)"
                  : isEmergency
                    ? "rgba(255,59,48,0.04)"
                    : "var(--surface)",
                cursor: "pointer",
                transition: "transform 0.1s ease, background 0.1s ease",
                minHeight: isUrgent ? 90 : 72,
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              onPointerDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
              onPointerUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
              onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              onPointerCancel={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{
                fontSize: isUrgent ? 28 : 24,
                lineHeight: 1,
              }}>
                {phrase.emoji}
              </span>
              <span style={{
                fontSize: isUrgent ? 14 : 13,
                fontWeight: isUrgent ? 800 : 600,
                color: isUrgent ? "var(--red)" : isEmergency ? "#CC2C22" : "var(--text)",
                textAlign: "center",
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textTransform: isUrgent ? "uppercase" : "none",
                letterSpacing: isUrgent ? "0.5px" : "normal",
              }}>
                {text}
              </span>

              {/* Speak indicator */}
              <Volume2
                size={11}
                strokeWidth={2}
                style={{
                  position: "absolute",
                  top: 6, right: 6,
                  color: isEmergency ? "rgba(255,59,48,0.4)" : "var(--text-4)",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
