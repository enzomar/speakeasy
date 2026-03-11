/**
 * ProfilePanel — Profile / Identity page.
 * Contains: Identity (avatar + name + gender), About.
 */

import { memo, useState, useCallback } from "react";
import { MessageSquare, Search } from "lucide-react";
import {
  Section, Row, AvatarPicker, store, load,
} from "../../shared/ui/settingsUI";

export default memo(function ProfilePanel({
  uiLangCode,
  onNameChange,
  gender, setGender,
  ui,
}) {
  const [avatar, setAvatar] = useState(() => load("speakeasy_avatar_v1", "🧑"));
  const [name,   setName]   = useState(() => load("speakeasy_name_v1",   ""));
  const [searchQuery, setSearchQuery] = useState("");

  const handleAvatar = useCallback((a) => {
    setAvatar(a); store("speakeasy_avatar_v1", a);
  }, []);
  const handleName = useCallback((e) => {
    const v = e.target.value; setName(v); store("speakeasy_name_v1", v);
    onNameChange?.(v);
  }, [onNameChange]);

  const q = searchQuery.trim().toLowerCase();
  const show = (...terms) => !q || terms.some(t => String(t ?? "").toLowerCase().includes(q));

  const GENDERS = [
    { value: "male",    label: ui?.genderMale    ?? "Male"    },
    { value: "female",  label: ui?.genderFemale  ?? "Female"  },
    { value: "neutral", label: ui?.genderNeutral ?? "Neutral" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
      {/* ── Search bar ── */}
      <div style={{ padding: "12px 16px 0", position: "sticky", top: 0, zIndex: 10, background: "var(--bg)" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-3)", pointerEvents: "none",
          }} />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={ui?.searchProfile ?? "Search profile…"}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              borderRadius: "var(--radius-md)", border: "none",
              background: "var(--surface)", fontSize: 15,
              color: "var(--text)", outline: "none",
              WebkitAppearance: "none",
            }}
          />
        </div>
      </div>
      <div style={{ padding: "16px 16px 40px" }}>

        {/* ── Identity ── */}
        {show("identity", "name", "avatar", "gender", ui?.sectionIdentity ?? "identity") && (
        <Section title={ui?.sectionIdentity ?? "Identity"}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px",
          }}>
            <AvatarPicker value={avatar} onChange={handleAvatar} />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={name}
                onChange={handleName}
                placeholder={ui?.namePlaceholder ?? "Your name (optional)"}
                maxLength={32}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  fontSize: 16, fontWeight: 500,
                  color: "var(--text)",
                  background: "var(--bg)",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontWeight: 400 }}>
                {ui?.nameHint ?? "Shown only on this device"}
              </div>
            </div>
          </div>

          {/* Gender selector */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 16px 14px",
            borderTop: "0.5px solid var(--sep)",
          }}>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
              {ui?.rowGender ?? "Gender"}
            </div>
            <div style={{
              display: "flex", borderRadius: "var(--radius-sm)",
              overflow: "hidden", border: "1px solid var(--sep)",
            }}>
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGender?.(g.value)}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    background: gender === g.value ? "var(--tint)" : "var(--bg)",
                    color: gender === g.value ? "#fff" : "var(--text-2)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </Section>
        )}

        {/* ── About ── */}
        {show("about", "version", "speakeasy") && (
        <Section title={ui?.sectionAbout ?? "About"}>
          <Row
            Icon={MessageSquare}
            iconBg="linear-gradient(135deg, var(--tint), #5856D6)"
            label="SpeakEasy"
            sublabel="AAC · On-device AI · v1.0"
            border={false}
          />
        </Section>
        )}

      </div>
    </div>
  );
});
