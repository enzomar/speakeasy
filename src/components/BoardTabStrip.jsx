/**
 * BoardTabStrip — horizontal tab selector for board intent tabs.
 * Symbols | Quick Reply | Questions | Emergency
 */

import { memo } from "react";
import {
  Grid3X3, MessageCircle, HelpCircle, AlertTriangle,
} from "lucide-react";

const ICONS = {
  Grid3X3,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
};

export default memo(function BoardTabStrip({ tabs, active, onChange, ui }) {
  return (
    <div style={{
      display: "flex",
      gap: 4,
      padding: "6px 12px 8px",
      background: "var(--surface)",
      borderBottom: "0.5px solid var(--sep)",
      flexShrink: 0,
      overflowX: "auto",
      scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {tabs.map(tab => {
        const Icon = ICONS[tab.icon] || Grid3X3;
        const isActive = active === tab.id;
        const isEmergency = tab.id === "emergency";

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-selected={isActive}
            role="tab"
            style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              padding: "8px 6px 6px",
              borderRadius: "var(--radius-lg)",
              border: isActive
                ? `2px solid ${isEmergency ? "var(--red)" : "var(--tint)"}`
                : "1.5px solid var(--sep)",
              background: isActive
                ? isEmergency ? "rgba(255,59,48,0.08)" : "rgba(0,122,255,0.06)"
                : "var(--surface)",
              color: isActive
                ? isEmergency ? "var(--red)" : "var(--tint)"
                : "var(--text-3)",
              cursor: "pointer",
              transition: "all 0.15s",
              minWidth: 0,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <Icon
              size={isEmergency && isActive ? 22 : 18}
              strokeWidth={isActive ? 2.2 : 1.6}
            />
            <span style={{
              fontSize: 11,
              fontWeight: isActive ? 700 : 600,
              lineHeight: 1.1,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}>
              {ui?.[tab.labelKey] ?? tab.labelKey}
            </span>
          </button>
        );
      })}
    </div>
  );
});
