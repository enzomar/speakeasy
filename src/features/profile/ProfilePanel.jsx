/**
 * ProfilePanel — Profile / Identity / Account / Subscription page.
 * Contains: Identity, Subscription, Account.
 */

import { memo, useState, useCallback } from "react";
import {
  Search, LogOut, KeyRound, Trash2,
  Crown, Clock, ShieldCheck, Mail,
} from "lucide-react";
import {
  Section, Row, AvatarPicker, ActionButton, store, load,
} from "../../shared/ui/settingsUI";

// ── Tiny modal for password input / confirmation dialogs ──────────────────────
function MiniModal({ title, children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-md)",
          padding: 24, width: "100%", maxWidth: 360,
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <input
      type="password"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "10px 12px", borderRadius: "var(--radius-sm)",
        border: "1px solid var(--sep)", background: "var(--bg)",
        fontSize: 15, color: "var(--text)", outline: "none",
        marginBottom: 10,
      }}
    />
  );
}

export default memo(function ProfilePanel({
  uiLangCode,
  onNameChange,
  gender, setGender,
  ui,
  // Subscription
  isPremium,
  isInTrial,
  trialDaysLeft,
  // Account
  isAuthenticated,
  userEmail,
  userProvider,
  onOpenAuth,
  onSignOut,
  onChangePassword,
  onResetPassword,
  onDeleteAccount,
  onUpgrade,
  // Demo
  isDemo,
}) {
  const [avatar, setAvatar] = useState(() => load("speakeasy_avatar_v1", "🧑"));
  const [name,   setName]   = useState(() => load("speakeasy_name_v1",   ""));
  const [searchQuery, setSearchQuery] = useState("");

  // Password change modal
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [curPw,        setCurPw]        = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [pwError,      setPwError]      = useState("");
  const [pwSuccess,    setPwSuccess]    = useState(false);
  const [pwBusy,       setPwBusy]       = useState(false);

  // Delete account modal
  const [showDelModal, setShowDelModal] = useState(false);
  const [delPw,        setDelPw]        = useState("");
  const [delError,     setDelError]     = useState("");
  const [delBusy,      setDelBusy]      = useState(false);
  const [delConfirm,   setDelConfirm]   = useState(false);

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

  const isEmailProvider = userProvider === "password";

  // ── Password change handler ───────────────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    if (!curPw || !newPw || newPw.length < 6) {
      setPwError(ui?.pwMinLength ?? "Password must be at least 6 characters.");
      return;
    }
    setPwBusy(true); setPwError("");
    const { error } = await onChangePassword(curPw, newPw);
    setPwBusy(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setTimeout(() => { setShowPwModal(false); setPwSuccess(false); setCurPw(""); setNewPw(""); }, 1500);
  }, [curPw, newPw, onChangePassword, ui]);

  // ── Delete account handler ────────────────────────────────────────────────
  const handleDeleteAccount = useCallback(async () => {
    if (!delPw) { setDelError(ui?.pwRequired ?? "Password required."); return; }
    setDelBusy(true); setDelError("");
    const { error } = await onDeleteAccount(delPw);
    setDelBusy(false);
    if (error) { setDelError(error.message); return; }
    setShowDelModal(false);
  }, [delPw, onDeleteAccount, ui]);

  // ── Subscription status label ─────────────────────────────────────────────
  let subStatus, subColor, SubIcon;
  if (isPremium) {
    subStatus = ui?.subPremium ?? "Premium";
    subColor  = "var(--tint)";
    SubIcon   = Crown;
  } else if (isInTrial) {
    subStatus = (ui?.subTrial ?? "Trial · {n} days left").replace("{n}", trialDaysLeft);
    subColor  = "var(--orange, #FF9500)";
    SubIcon   = Clock;
  } else {
    subStatus = ui?.subFree ?? "Free plan";
    subColor  = "var(--text-3)";
    SubIcon   = ShieldCheck;
  }

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

        {/* ── Subscription (hidden in demo) ── */}
        {!isDemo && show("subscription", "premium", "trial", "plan", "upgrade",
              ui?.sectionSubscription ?? "subscription") && (
        <Section title={ui?.sectionSubscription ?? "Subscription"}>
          {/* Status row */}
          <Row
            Icon={SubIcon}
            iconBg={isPremium
              ? "linear-gradient(135deg, #FFD700, #FF9500)"
              : isInTrial
                ? "linear-gradient(135deg, #FF9500, #FF6B00)"
                : "linear-gradient(135deg, var(--text-3), var(--text-2))"}
            label={subStatus}
            sublabel={isPremium
              ? (ui?.subPremiumDesc ?? "Unlimited AI, voice and saved phrases")
              : isInTrial
                ? (ui?.subTrialDesc ?? "Full access during your trial period")
                : (ui?.subFreeDesc ?? "Limited daily AI and voice usage")}
            border={!isPremium}
          />
          {/* Upgrade button for non-premium */}
          {!isPremium && (
            <div style={{ padding: "8px 16px 14px", display: "flex", justifyContent: "center" }}>
              <ActionButton onClick={onUpgrade}>
                {isInTrial
                  ? (ui?.subUpgradeNow ?? "Upgrade to Premium")
                  : (ui?.subUnlock ?? "Unlock Premium")}
              </ActionButton>
            </div>
          )}
        </Section>
        )}

        {/* ── Account (hidden in demo) ── */}
        {!isDemo && show("account", "email", "logout", "sign out", "password", "delete",
              ui?.sectionAccount ?? "account") && (
        <Section title={ui?.sectionAccount ?? "Account"}>
          {isAuthenticated ? (
            <>
              {/* Email */}
              <Row
                Icon={Mail}
                iconBg="linear-gradient(135deg, #5856D6, #AF52DE)"
                label={userEmail ?? ""}
                sublabel={isEmailProvider
                  ? (ui?.accountEmailProvider ?? "Signed in with email")
                  : (ui?.accountGoogleProvider ?? "Signed in with Google")}
                border
              />
              {/* Change password — only for email/password accounts */}
              {isEmailProvider && (
                <Row
                  Icon={KeyRound}
                  iconBg="linear-gradient(135deg, #34C759, #30D158)"
                  label={ui?.accountChangePassword ?? "Change password"}
                  sublabel={ui?.accountChangePasswordDesc ?? "Update your login password"}
                  onClick={() => { setShowPwModal(true); setPwError(""); setPwSuccess(false); setCurPw(""); setNewPw(""); }}
                  border
                />
              )}
              {/* Password reset for email users */}
              {isEmailProvider && (
                <Row
                  Icon={Mail}
                  iconBg="linear-gradient(135deg, #007AFF, #5856D6)"
                  label={ui?.accountResetPassword ?? "Reset password via email"}
                  sublabel={ui?.accountResetPasswordDesc ?? "Receive a reset link at your email address"}
                  onClick={async () => {
                    if (userEmail) {
                      const { error } = await onResetPassword(userEmail);
                      if (!error) alert(ui?.accountResetSent ?? "Password reset email sent!");
                      else alert(error.message);
                    }
                  }}
                  border
                />
              )}
              {/* Sign out */}
              <Row
                Icon={LogOut}
                iconBg="linear-gradient(135deg, #FF9500, #FF6B00)"
                label={ui?.accountSignOut ?? "Sign out"}
                sublabel={ui?.accountSignOutDesc ?? "Log out of your account"}
                onClick={onSignOut}
                border
              />
              {/* Delete account (GDPR) */}
              <div style={{ padding: "8px 16px 14px" }}>
                <ActionButton
                  variant="destructive"
                  onClick={() => { setShowDelModal(true); setDelPw(""); setDelError(""); setDelConfirm(false); }}
                >
                  {ui?.accountDelete ?? "Delete account"}
                </ActionButton>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
                  {ui?.accountDeleteHint ?? "Permanently removes your account and all associated data. This cannot be undone."}
                </div>
              </div>
            </>
          ) : (
            /* Not signed in */
            <div style={{ padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 12 }}>
                {ui?.accountNotSignedIn ?? "Sign in to sync your data and manage your subscription."}
              </div>
              <ActionButton onClick={onOpenAuth}>
                {ui?.accountSignIn ?? "Sign in / Create account"}
              </ActionButton>
            </div>
          )}
        </Section>
        )}

        {/* About & Help section removed — available via Help modal in header */}

      </div>

      {/* ── Change Password Modal ── */}
      {showPwModal && (
        <MiniModal
          title={ui?.accountChangePassword ?? "Change password"}
          onClose={() => setShowPwModal(false)}
        >
          {pwSuccess ? (
            <div style={{ color: "var(--tint)", fontWeight: 600, textAlign: "center", padding: 16 }}>
              ✓ {ui?.pwChanged ?? "Password changed successfully!"}
            </div>
          ) : (
            <>
              <PasswordInput
                value={curPw}
                onChange={setCurPw}
                placeholder={ui?.pwCurrent ?? "Current password"}
                autoFocus
              />
              <PasswordInput
                value={newPw}
                onChange={setNewPw}
                placeholder={ui?.pwNew ?? "New password (min. 6 chars)"}
              />
              {pwError && (
                <div style={{ color: "var(--red, #FF3B30)", fontSize: 13, marginBottom: 10 }}>
                  {pwError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <ActionButton onClick={() => setShowPwModal(false)}>
                  {ui?.cancel ?? "Cancel"}
                </ActionButton>
                <ActionButton onClick={handleChangePassword}>
                  {pwBusy ? "…" : (ui?.save ?? "Save")}
                </ActionButton>
              </div>
            </>
          )}
        </MiniModal>
      )}

      {/* ── Delete Account Modal ── */}
      {showDelModal && (
        <MiniModal
          title={ui?.accountDeleteTitle ?? "Delete your account?"}
          onClose={() => setShowDelModal(false)}
        >
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.5 }}>
            {ui?.accountDeleteWarning ??
              "This will permanently delete your account, all your data, and cancel any active subscription. This action cannot be undone."}
          </div>
          {!delConfirm ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <ActionButton onClick={() => setShowDelModal(false)}>
                {ui?.cancel ?? "Cancel"}
              </ActionButton>
              <ActionButton variant="destructive" onClick={() => setDelConfirm(true)}>
                {ui?.accountDeleteConfirm ?? "I understand, continue"}
              </ActionButton>
            </div>
          ) : (
            <>
              <PasswordInput
                value={delPw}
                onChange={setDelPw}
                placeholder={ui?.pwCurrent ?? "Current password"}
                autoFocus
              />
              {delError && (
                <div style={{ color: "var(--red, #FF3B30)", fontSize: 13, marginBottom: 10 }}>
                  {delError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <ActionButton onClick={() => setShowDelModal(false)}>
                  {ui?.cancel ?? "Cancel"}
                </ActionButton>
                <ActionButton variant="destructive" onClick={handleDeleteAccount}>
                  {delBusy ? "…" : (ui?.accountDeleteFinal ?? "Delete my account")}
                </ActionButton>
              </div>
            </>
          )}
        </MiniModal>
      )}
    </div>
  );
});
