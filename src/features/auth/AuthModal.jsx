/**
 * AuthModal.jsx — Email/password + Google auth modal.
 *
 * Props:
 *   isOpen       {boolean}             - controls visibility
 *   onClose      {() => void}          - dismiss callback (null when required)
 *   onSuccess    {(user) => void}      - called after successful auth
 *   initialMode  {'login'|'signup'}    - which tab to show first
 *   required     {boolean}             - no close button, no overlay dismiss
 *   lang         {string}              - UI language code (default "en")
 */

import { useState, useCallback, useEffect } from "react";
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

// ─── Localised strings ────────────────────────────────────────────────────────

const T = {
  en: {
    titleCreateReq: "Create your account",
    titleSignInReq: "Sign in to SpeakEasy",
    titleCreate:    "Create account",
    titleSignIn:    "Sign in",
    subtitleReq:    "An account is required to use SpeakEasy. Your data syncs across all your devices.",
    subtitle:       "Access your SpeakEasy account.",
    tabLogIn:       "Log in",
    tabSignUp:      "Sign up",
    google:         "Continue with Google",
    connecting:     "Connecting…",
    or:             "or",
    email:          "Email",
    password:       "Password",
    createAccount:  "Create account",
    logIn:          "Log in",
    working:        "Working…",
    googleFailed:   "Google sign-in failed. Please try again.",
    genericError:   "Something went wrong. Please try again.",
    close:          "Close",
    hidePwd:        "Hide password",
    showPwd:        "Show password",
  },
  es: {
    titleCreateReq: "Crea tu cuenta",
    titleSignInReq: "Inicia sesión en SpeakEasy",
    titleCreate:    "Crear cuenta",
    titleSignIn:    "Iniciar sesión",
    subtitleReq:    "Se necesita una cuenta para usar SpeakEasy. Tus datos se sincronizan en todos tus dispositivos.",
    subtitle:       "Accede a tu cuenta de SpeakEasy.",
    tabLogIn:       "Iniciar sesión",
    tabSignUp:      "Registrarse",
    google:         "Continuar con Google",
    connecting:     "Conectando…",
    or:             "o",
    email:          "Correo electrónico",
    password:       "Contraseña",
    createAccount:  "Crear cuenta",
    logIn:          "Iniciar sesión",
    working:        "Procesando…",
    googleFailed:   "Error al iniciar sesión con Google. Inténtalo de nuevo.",
    genericError:   "Algo salió mal. Inténtalo de nuevo.",
    close:          "Cerrar",
    hidePwd:        "Ocultar contraseña",
    showPwd:        "Mostrar contraseña",
  },
  fr: {
    titleCreateReq: "Créez votre compte",
    titleSignInReq: "Connectez-vous à SpeakEasy",
    titleCreate:    "Créer un compte",
    titleSignIn:    "Se connecter",
    subtitleReq:    "Un compte est nécessaire pour utiliser SpeakEasy. Vos données sont synchronisées sur tous vos appareils.",
    subtitle:       "Accédez à votre compte SpeakEasy.",
    tabLogIn:       "Se connecter",
    tabSignUp:      "S'inscrire",
    google:         "Continuer avec Google",
    connecting:     "Connexion…",
    or:             "ou",
    email:          "E-mail",
    password:       "Mot de passe",
    createAccount:  "Créer un compte",
    logIn:          "Se connecter",
    working:        "Chargement…",
    googleFailed:   "Échec de la connexion Google. Veuillez réessayer.",
    genericError:   "Une erreur est survenue. Veuillez réessayer.",
    close:          "Fermer",
    hidePwd:        "Masquer le mot de passe",
    showPwd:        "Afficher le mot de passe",
  },
  de: {
    titleCreateReq: "Konto erstellen",
    titleSignInReq: "Bei SpeakEasy anmelden",
    titleCreate:    "Konto erstellen",
    titleSignIn:    "Anmelden",
    subtitleReq:    "Ein Konto wird benötigt, um SpeakEasy zu nutzen. Ihre Daten werden auf allen Geräten synchronisiert.",
    subtitle:       "Auf Ihr SpeakEasy-Konto zugreifen.",
    tabLogIn:       "Anmelden",
    tabSignUp:      "Registrieren",
    google:         "Weiter mit Google",
    connecting:     "Verbinden…",
    or:             "oder",
    email:          "E-Mail",
    password:       "Passwort",
    createAccount:  "Konto erstellen",
    logIn:          "Anmelden",
    working:        "Wird geladen…",
    googleFailed:   "Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    genericError:   "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    close:          "Schließen",
    hidePwd:        "Passwort verbergen",
    showPwd:        "Passwort anzeigen",
  },
  it: {
    titleCreateReq: "Crea il tuo account",
    titleSignInReq: "Accedi a SpeakEasy",
    titleCreate:    "Crea account",
    titleSignIn:    "Accedi",
    subtitleReq:    "È necessario un account per usare SpeakEasy. I tuoi dati si sincronizzano su tutti i dispositivi.",
    subtitle:       "Accedi al tuo account SpeakEasy.",
    tabLogIn:       "Accedi",
    tabSignUp:      "Registrati",
    google:         "Continua con Google",
    connecting:     "Connessione…",
    or:             "o",
    email:          "E-mail",
    password:       "Password",
    createAccount:  "Crea account",
    logIn:          "Accedi",
    working:        "Caricamento…",
    googleFailed:   "Accesso con Google non riuscito. Riprova.",
    genericError:   "Qualcosa è andato storto. Riprova.",
    close:          "Chiudi",
    hidePwd:        "Nascondi password",
    showPwd:        "Mostra password",
  },
  pt: {
    titleCreateReq: "Crie sua conta",
    titleSignInReq: "Entre no SpeakEasy",
    titleCreate:    "Criar conta",
    titleSignIn:    "Entrar",
    subtitleReq:    "Uma conta é necessária para usar o SpeakEasy. Seus dados são sincronizados em todos os dispositivos.",
    subtitle:       "Acesse sua conta SpeakEasy.",
    tabLogIn:       "Entrar",
    tabSignUp:      "Cadastrar",
    google:         "Continuar com o Google",
    connecting:     "Conectando…",
    or:             "ou",
    email:          "E-mail",
    password:       "Senha",
    createAccount:  "Criar conta",
    logIn:          "Entrar",
    working:        "Processando…",
    googleFailed:   "Falha ao entrar com o Google. Tente novamente.",
    genericError:   "Algo deu errado. Tente novamente.",
    close:          "Fechar",
    hidePwd:        "Ocultar senha",
    showPwd:        "Mostrar senha",
  },
  ar: {
    titleCreateReq: "أنشئ حسابك",
    titleSignInReq: "سجّل الدخول إلى SpeakEasy",
    titleCreate:    "إنشاء حساب",
    titleSignIn:    "تسجيل الدخول",
    subtitleReq:    "يلزم وجود حساب لاستخدام SpeakEasy. تتم مزامنة بياناتك على جميع أجهزتك.",
    subtitle:       "ادخل إلى حسابك على SpeakEasy.",
    tabLogIn:       "تسجيل الدخول",
    tabSignUp:      "إنشاء حساب",
    google:         "المتابعة مع Google",
    connecting:     "جارٍ الاتصال…",
    or:             "أو",
    email:          "البريد الإلكتروني",
    password:       "كلمة المرور",
    createAccount:  "إنشاء حساب",
    logIn:          "تسجيل الدخول",
    working:        "جارٍ المعالجة…",
    googleFailed:   "فشل تسجيل الدخول بـ Google. يرجى المحاولة مجدداً.",
    genericError:   "حدث خطأ ما. يرجى المحاولة مجدداً.",
    close:          "إغلاق",
    hidePwd:        "إخفاء كلمة المرور",
    showPwd:        "إظهار كلمة المرور",
  },
  zh: {
    titleCreateReq: "创建您的账户",
    titleSignInReq: "登录 SpeakEasy",
    titleCreate:    "创建账户",
    titleSignIn:    "登录",
    subtitleReq:    "使用 SpeakEasy 需要一个账户。您的数据会在所有设备间同步。",
    subtitle:       "访问您的 SpeakEasy 账户。",
    tabLogIn:       "登录",
    tabSignUp:      "注册",
    google:         "使用 Google 继续",
    connecting:     "连接中…",
    or:             "或",
    email:          "电子邮箱",
    password:       "密码",
    createAccount:  "创建账户",
    logIn:          "登录",
    working:        "处理中…",
    googleFailed:   "Google 登录失败，请重试。",
    genericError:   "出现错误，请重试。",
    close:          "关闭",
    hidePwd:        "隐藏密码",
    showPwd:        "显示密码",
  },
  ja: {
    titleCreateReq: "アカウントを作成",
    titleSignInReq: "SpeakEasy にサインイン",
    titleCreate:    "アカウント作成",
    titleSignIn:    "サインイン",
    subtitleReq:    "SpeakEasy の利用にはアカウントが必要です。データはすべてのデバイスで同期されます。",
    subtitle:       "SpeakEasy アカウントにアクセス。",
    tabLogIn:       "ログイン",
    tabSignUp:      "新規登録",
    google:         "Google で続ける",
    connecting:     "接続中…",
    or:             "または",
    email:          "メールアドレス",
    password:       "パスワード",
    createAccount:  "アカウント作成",
    logIn:          "ログイン",
    working:        "処理中…",
    googleFailed:   "Google サインインに失敗しました。もう一度お試しください。",
    genericError:   "エラーが発生しました。もう一度お試しください。",
    close:          "閉じる",
    hidePwd:        "パスワードを非表示",
    showPwd:        "パスワードを表示",
  },
  ko: {
    titleCreateReq: "계정 만들기",
    titleSignInReq: "SpeakEasy에 로그인",
    titleCreate:    "계정 만들기",
    titleSignIn:    "로그인",
    subtitleReq:    "SpeakEasy를 사용하려면 계정이 필요합니다. 데이터가 모든 기기에서 동기화됩니다.",
    subtitle:       "SpeakEasy 계정에 접속하세요.",
    tabLogIn:       "로그인",
    tabSignUp:      "가입하기",
    google:         "Google로 계속",
    connecting:     "연결 중…",
    or:             "또는",
    email:          "이메일",
    password:       "비밀번호",
    createAccount:  "계정 만들기",
    logIn:          "로그인",
    working:        "처리 중…",
    googleFailed:   "Google 로그인에 실패했습니다. 다시 시도해주세요.",
    genericError:   "오류가 발생했습니다. 다시 시도해주세요.",
    close:          "닫기",
    hidePwd:        "비밀번호 숨기기",
    showPwd:        "비밀번호 표시",
  },
};

function t(lang, key) {
  return (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "fadeIn 0.15s ease",
  },
  sheet: {
    width: "100%", maxWidth: 480,
    background: "var(--bg)",
    borderRadius: "20px 20px 0 0",
    padding: "28px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)",
    boxShadow: "0 -4px 40px rgba(0,0,0,0.18)",
    animation: "slideUp 0.25s cubic-bezier(.32,1.1,.6,1)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: 800, color: "var(--text)" },
  subtitle: { fontSize: 14, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.5 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    border: "none", background: "var(--surface)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--text-2)",
    WebkitTapHighlightColor: "transparent",
  },
  tabs: { display: "flex", gap: 8, marginBottom: 24 },
  tab: (active) => ({
    flex: 1, padding: "10px 0", borderRadius: 12,
    border: active ? "none" : "1.5px solid var(--sep)",
    background: active ? "var(--tint)" : "transparent",
    color: active ? "#fff" : "var(--text-2)",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    transition: "all 0.15s",
  }),
  googleBtn: (disabled) => ({
    width: "100%", padding: "14px 0", borderRadius: 14,
    border: "1.5px solid var(--sep)", background: disabled ? "var(--surface)" : "var(--bg)",
    color: "var(--text)", fontSize: 15, fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    WebkitTapHighlightColor: "transparent",
    transition: "background 0.15s",
  }),
  divider: {
    display: "flex", alignItems: "center", gap: 10, margin: "18px 0",
    color: "var(--text-3)", fontSize: 13,
  },
  dividerLine: { flex: 1, height: 1, background: "var(--sep)" },
  label: {
    fontSize: 13, fontWeight: 600, color: "var(--text-2)",
    marginBottom: 6, marginTop: 16, display: "block",
  },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: 14, color: "var(--text-3)", pointerEvents: "none" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "14px 14px 14px 42px",
    borderRadius: 12, border: "1.5px solid var(--sep)",
    background: "var(--surface)",
    fontSize: 16, color: "var(--text)",
    outline: "none", WebkitAppearance: "none",
    transition: "border-color 0.15s",
  },
  eyeBtn: {
    position: "absolute", right: 14, background: "none", border: "none",
    cursor: "pointer", color: "var(--text-3)", padding: 4,
    WebkitTapHighlightColor: "transparent",
  },
  primaryBtn: (disabled) => ({
    width: "100%", marginTop: 20,
    padding: "16px 0", borderRadius: 14, border: "none",
    background: disabled ? "var(--sep)" : "var(--tint)",
    color: disabled ? "var(--text-3)" : "#fff",
    fontSize: 17, fontWeight: 700, cursor: disabled ? "default" : "pointer",
    WebkitTapHighlightColor: "transparent",
    transition: "background 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  }),
  errorBox: {
    marginTop: 14, padding: "12px 14px", borderRadius: 10,
    background: "rgba(255,59,48,0.10)", border: "1px solid rgba(255,59,48,0.25)",
    color: "var(--red, #FF3B30)", fontSize: 14,
  },
};
export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login", required = false, lang = "en" }) {
  const [mode,          setMode]          = useState(initialMode); // 'login' | 'signup'
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setError(null);
      setLoading(false);
      setGoogleLoading(false);
    }
  }, [isOpen, initialMode]);

  // ── Google sign-in ──────────────────────────────────────────────────────────
  const handleGoogle = useCallback(async () => {
    if (googleLoading || loading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { signInWithGoogle } = await import("../../services/firebase");
      const { user, error: err } = await signInWithGoogle();
      if (err) { setError(err.message); return; }
      if (user) { onSuccess?.(user); onClose?.(); }
    } catch (err) {
      setError(err?.message ?? t(lang, "googleFailed"));
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, loading, onSuccess, onClose]);

  // ── Email / password ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (loading || googleLoading) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { signUp } = await import("../../services/firebase");
        const { user, error: err } = await signUp(email.trim(), password);
        if (err) { setError(err.message); return; }
        if (user) { onSuccess?.(user); onClose?.(); }
        return;
      }
      const { signIn } = await import("../../services/firebase");
      const { user, error: err } = await signIn(email.trim(), password);
      if (err) { setError(err.message); return; }
      onSuccess?.(user);
      onClose?.();
    } catch (err) {
      setError(err?.message ?? t(lang, "genericError"));
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, loading, googleLoading, onSuccess, onClose]);

  if (!isOpen) return null;

  const busy        = loading || googleLoading;
  const submitLabel = mode === "signup" ? t(lang, "createAccount") : t(lang, "logIn");
  const titleText   = required
    ? (mode === "signup" ? t(lang, "titleCreateReq") : t(lang, "titleSignInReq"))
    : (mode === "signup" ? t(lang, "titleCreate")    : t(lang, "titleSignIn"));

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes spin    { to   { transform:rotate(360deg) } }
      `}</style>

      <div
        style={S.overlay}
        onClick={(e) => { if (!required && e.target === e.currentTarget) onClose?.(); }}
      >
        <div style={S.sheet} role="dialog" aria-modal="true" aria-label={titleText}>

          {/* Header */}
          <div style={S.header}>
            <span style={S.title}>{titleText}</span>
            {!required && (
              <button style={S.closeBtn} onClick={onClose} aria-label={t(lang, "close")}>
                <X size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Subtitle */}
          <p style={S.subtitle}>
            {required
              ? t(lang, "subtitleReq")
              : t(lang, "subtitle")}
          </p>

          {/* Tabs */}
          <div style={S.tabs}>
            <button style={S.tab(mode === "login")}  onClick={() => { setMode("login");  setError(null); }} disabled={busy}>{t(lang, "tabLogIn")}</button>
            <button style={S.tab(mode === "signup")} onClick={() => { setMode("signup"); setError(null); }} disabled={busy}>{t(lang, "tabSignUp")}</button>
          </div>

          {/* Google button */}
          <button style={S.googleBtn(busy)} onClick={handleGoogle} disabled={busy} type="button">
            {googleLoading
              ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> {t(lang, "connecting")}</>
              : <><GoogleLogo /> {t(lang, "google")}</>}
          </button>

          {/* Divider */}
          <div style={S.divider}>
            <span style={S.dividerLine} />
            <span>{t(lang, "or")}</span>
            <span style={S.dividerLine} />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit}>
            <label style={{ ...S.label, marginTop: 0 }} htmlFor="auth-email">{t(lang, "email")}</label>
            <div style={S.inputWrap}>
              <Mail size={17} style={S.inputIcon} />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={S.input}
                required
                disabled={busy}
              />
            </div>

            <label style={S.label} htmlFor="auth-password">{t(lang, "password")}</label>
            <div style={S.inputWrap}>
              <Lock size={17} style={S.inputIcon} />
              <input
                id="auth-password"
                type={showPwd ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...S.input, paddingRight: 44 }}
                required
                minLength={6}
                disabled={busy}
              />
              <button
                type="button"
                style={S.eyeBtn}
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? t(lang, "hidePwd") : t(lang, "showPwd")}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <div style={S.errorBox} role="alert">{error}</div>}

            <button
              type="submit"
              style={S.primaryBtn(busy || !email || !password)}
              disabled={busy || !email || !password}
            >
              {loading
                ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> {t(lang, "working")}</>
                : submitLabel}
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
