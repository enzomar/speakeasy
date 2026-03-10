/**
 * HistoryPanel — list of past spoken utterances.
 * Native iOS-style: grouped cards, Lucide icons for actions.
 */

import { memo, useState } from "react";
import { Play, Pencil, Trash2, MessageCircle } from "lucide-react";
import ConfirmSheet from "../../shared/ui/ConfirmSheet";

function HistoryEntry({ item, isRecent, onReuse, onSpeak, onDeleteRequest, leftHanded = false }) {
  const timeLabel = item.updatedAt
    ? new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Earlier";

  return (
    <div style={{
      background:   "var(--surface)",
      borderRadius: "var(--radius-md)",
      padding:      "12px 14px",
      display:      "flex",
      flexDirection: leftHanded ? "row-reverse" : "row",
      alignItems:   "center",
      gap:          10,
      boxShadow:    isRecent
        ? "0 0 0 2px rgba(0,122,255,0.2)"
        : "0 1px 3px rgba(0,0,0,0.04)",
      animation:    isRecent ? "highlightEntry 0.6s ease" : "none",
    }}>
      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onReuse(item.text)} style={actionBtn(false)} aria-label="Edit">
          <Pencil size={15} strokeWidth={1.8} />
        </button>
        <button onClick={() => onSpeak(item.text)} style={actionBtn(true)} aria-label="Speak">
          <Play size={15} strokeWidth={2} fill="currentColor" />
        </button>
        <button onClick={() => onDeleteRequest(item)} style={actionBtn(false, true)} aria-label="Delete">
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: "var(--text)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textAlign: leftHanded ? "right" : "left",
        }}>
          {item.text}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, fontWeight: 500,
          textAlign: leftHanded ? "right" : "left",
        }}>
          {timeLabel}
        </div>
      </div>

      {/* Frequency badge */}
      <div style={{
        width: 32, height: 32, borderRadius: "var(--radius-sm)",
        background: "var(--tint-soft)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "var(--tint)", flexShrink: 0,
      }}>
        {item.count}×
      </div>
    </div>
  );
}

function actionBtn(primary = false, danger = false) {
  return {
    width: 44, height: 44, borderRadius: "var(--radius-sm)",
    border: "none",
    background: primary ? "var(--tint)" : danger ? "rgba(255,59,48,0.08)" : "var(--bg)",
    color: primary ? "#fff" : danger ? "var(--red)" : "var(--tint)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "all 0.12s",
    WebkitTapHighlightColor: "transparent",
  };
}

function HistoryPanel({ history, recentId, onReuse, onSpeak, onDelete, onClearAll, leftHanded = false, ui }) {
  const [confirm, setConfirm] = useState(null);
  const emptyTitle    = ui?.noHistory    ?? "No history yet";
  const emptySubtitle = ui?.noHistoryHint ?? "Every message you speak is saved here";
  const memLabel      = ui?.phrasesInMem
    ? ui.phrasesInMem(history.length).toUpperCase()
    : `${history.length} PHRASES IN MEMORY`;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "12px 14px 8px",
      }}>
        <span style={{
          fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.04em",
        }}>
          {memLabel}
        </span>
        {history.length > 0 && (
          <button
            onClick={() => setConfirm({
              action: onClearAll,
              title: ui?.confirmClearTitle ?? "Clear all history?",
              message: ui?.confirmClearMsg ?? "This will permanently delete all your saved phrases.",
              label: ui?.confirmYes ?? "Delete",
            })}
            style={toolbarBtn(true)}
          >
            <Trash2 size={13} strokeWidth={2} style={{ marginRight: 4 }} />
            {ui?.clear ?? "Clear"}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 70, color: "var(--text-3)" }}>
            <MessageCircle size={44} strokeWidth={1.2} style={{ marginBottom: 12, color: "var(--text-4)" }} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>{emptyTitle}</div>
            <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-4)" }}>{emptySubtitle}</div>
          </div>
        ) : (
          history.map((item, i) => (
            <div
              key={item.id}
              style={{ animation: i < 12 ? `fadeUp 0.18s ease ${(i % 12) * 0.04}s both` : "none" }}
            >
              <HistoryEntry
                item={item}
                isRecent={item.id === recentId}
                onReuse={onReuse}
                onSpeak={onSpeak}
                onDeleteRequest={(entry) => setConfirm({
                  action: () => onDelete(entry.id),
                  title: ui?.confirmDeleteHistoryTitle ?? "Delete this phrase?",
                  message: ui?.confirmDeleteHistoryMsg ?? `Remove "${entry.text}" from history?`,
                  label: ui?.confirmYes ?? "Delete",
                })}
                leftHanded={leftHanded}
              />
            </div>
          ))
        )}
      </div>

      {confirm && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          cancelLabel={ui?.confirmCancel ?? "Cancel"}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function toolbarBtn(danger = false) {
  return {
    padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "none",
    background: danger ? "rgba(255,59,48,0.08)" : "var(--tint-soft)",
    color: danger ? "var(--red)" : "var(--tint)",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center",
    WebkitTapHighlightColor: "transparent",
  };
}

export default memo(HistoryPanel);
