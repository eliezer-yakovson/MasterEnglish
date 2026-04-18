import { useState } from "react";
import { useAppStore, useApi } from "../store";
import type { Session, LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm } from "../types";

const initialLoginForm: LoginForm = { identifier: "", password: "" };
const initialRegisterForm: RegisterForm = { name: "", email: "", phone: "", password: "", role: "user" };
const initialForgotForm: ForgotPasswordForm = { identifier: "" };
const initialResetForm: ResetPasswordForm = { identifier: "", code: "", new_password: "", confirm_password: "" };

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AuthPage() {
  const { setSession, setStatusMessage, setErrorMessage, statusMessage, errorMessage } =
    useAppStore();
  const api = useApi();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState<ForgotPasswordForm>(initialForgotForm);
  const [resetForm, setResetForm] = useState<ResetPasswordForm>(initialResetForm);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [maskedTarget, setMaskedTarget] = useState("");

  function switchMode(mode: AuthMode) {
    setAuthMode(mode);
    setErrorMessage("");
    setStatusMessage("");
    setDebugCode(null);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await api.login({ identifier: loginForm.identifier, password: loginForm.password });
      const nextSession: Session = { ...result };
      setSession(nextSession);
      setLoginForm(initialLoginForm);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "אירעה שגיאה בהתחברות.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const body = {
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
        role: registerForm.role,
      };
      const result = await api.register(body);
      setRegisterForm(initialRegisterForm);
      switchMode("login");
      setStatusMessage(`נרשם משתמש חדש בהצלחה. מזהה: ${result.user_id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "אירעה שגיאה בהרשמה.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setDebugCode(null);
    try {
      const result = await api.forgotPassword(forgotForm);
      setMaskedTarget(result.masked_target);
      if (result.debug_code) {
        setDebugCode(result.debug_code);
      }
      setResetForm((f) => ({ ...f, identifier: forgotForm.identifier }));
      switchMode("reset");
      setStatusMessage(
        result.masked_target
          ? `נשלח קוד לאיפוס ל: ${result.masked_target}`
          : "אם החשבון קיים, ישלח אליו קוד לאיפוס.",
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "אירעה שגיאה. נסה שנית.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (resetForm.new_password !== resetForm.confirm_password) {
      setErrorMessage("הסיסמאות אינן תואמות.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      await api.resetPassword({
        identifier: resetForm.identifier,
        code: resetForm.code,
        new_password: resetForm.new_password,
      });
      setResetForm(initialResetForm);
      switchMode("login");
      setStatusMessage("הסיסמה אופסה בהצלחה. ניתן להתחבר עכשיו.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "קוד שגוי או פג תוקף. נסה שנית.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-dot"></span>
          <h1>Master English</h1>
        </div>
        <h2>ברוכים הבאים</h2>
        <p className="auth-subtitle">מערכת חכמה לניהול ולמידת אוצר מילים</p>

        {authMode !== "forgot" && authMode !== "reset" && (
          <div className="segmented-control">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              התחברות
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              הרשמה
            </button>
          </div>
        )}

        <div className="message-stack">
          {statusMessage ? <div className="message success">{statusMessage}</div> : null}
          {errorMessage ? <div className="message error">{errorMessage}</div> : null}
          {debugCode && (
            <div className="message" style={{ background: "#fff3cd", color: "#856404", border: "1px solid #ffc107", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.9rem" }}>
              <strong>מצב פיתוח — קוד האיפוס:</strong> <span style={{ fontFamily: "monospace", fontSize: "1.2rem", letterSpacing: "0.2em" }}>{debugCode}</span>
              <br /><small>קוד זה מוצג כי לא הוגדר SMTP/Twilio. בסביבת ייצור יישלח ב-SMS/מייל.</small>
            </div>
          )}
        </div>

        {authMode === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label>אימייל או טלפון</label>
              <input
                type="text"
                value={loginForm.identifier}
                onChange={(e) => setLoginForm((c) => ({ ...c, identifier: e.target.value }))}
                placeholder="yael@example.com או 0501234567"
                required
                autoComplete="username"
              />
            </div>
            <div className="input-group">
              <label>סיסמה</label>
              <div className="password-wrapper">
                <input
                  type={showLoginPwd ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowLoginPwd((v) => !v)}
                  aria-label={showLoginPwd ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showLoginPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "מתחבר..." : "כניסה למערכת"}
            </button>
            <button
              type="button"
              className="forgot-link"
              onClick={() => switchMode("forgot")}
            >
              שכחתי סיסמה
            </button>
          </form>
        )}

        {authMode === "register" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="input-group">
              <label>שם מלא</label>
              <input
                value={registerForm.name}
                onChange={(e) => setRegisterForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="שם מלא"
                required
              />
            </div>
            <div className="input-group">
              <label>אימייל</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="yael@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <label>מספר טלפון <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(לאיפוס סיסמה)</span></label>
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm((c) => ({ ...c, phone: e.target.value }))}
                placeholder="0501234567 או +972501234567"
                autoComplete="tel"
              />
            </div>
            <div className="input-group">
              <label>סיסמה</label>
              <div className="password-wrapper">
                <input
                  type={showRegisterPwd ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                  placeholder="לפחות 6 תווים"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowRegisterPwd((v) => !v)}
                  aria-label={showRegisterPwd ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showRegisterPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>תפקיד</label>
              <select
                value={registerForm.role}
                onChange={(e) =>
                  setRegisterForm((c) => ({
                    ...c,
                    role: e.target.value as "user" | "admin",
                  }))
                }
              >
                <option value="user">משתמש לומד</option>
                <option value="admin" disabled>מנהל (Admin) — זמין בקרוב</option>
              </select>
            </div>
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "יוצר מחשבון..." : "צור חשבון חדש"}
            </button>
          </form>
        )}

        {authMode === "forgot" && (
          <form className="auth-form" onSubmit={handleForgotSubmit}>
            <h3 style={{ marginBottom: "0.5rem" }}>איפוס סיסמה</h3>
            <p className="auth-subtitle" style={{ marginBottom: "1rem" }}>
              הזן את האימייל שלך ונשלח קוד לאיפוס.
            </p>
            <div className="input-group">
              <label>אימייל</label>
              <input
                type="email"
                value={forgotForm.identifier}
                onChange={(e) => setForgotForm((c) => ({ ...c, identifier: e.target.value }))}
                placeholder="yael@example.com"
                required
                autoFocus
              />
            </div>
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "שולח קוד..." : "שלח קוד לאיפוס"}
            </button>
            <button
              type="button"
              className="forgot-link"
              onClick={() => switchMode("login")}
            >
              ← חזרה להתחברות
            </button>
          </form>
        )}

        {authMode === "reset" && (
          <form className="auth-form" onSubmit={handleResetSubmit}>
            <h3 style={{ marginBottom: "0.5rem" }}>הזן קוד וסיסמה חדשה</h3>
            {maskedTarget && (
              <p className="auth-subtitle" style={{ marginBottom: "1rem" }}>
                הקוד נשלח ל: <strong>{maskedTarget}</strong>
              </p>
            )}
            <div className="input-group">
              <label>קוד האיפוס (6 ספרות)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={resetForm.code}
                onChange={(e) => setResetForm((c) => ({ ...c, code: e.target.value.replace(/\D/g, "") }))}
                placeholder="123456"
                required
                autoFocus
                style={{ letterSpacing: "0.3em", fontSize: "1.2rem", textAlign: "center" }}
              />
            </div>
            <div className="input-group">
              <label>סיסמה חדשה</label>
              <div className="password-wrapper">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm((c) => ({ ...c, new_password: e.target.value }))}
                  placeholder="לפחות 6 תווים"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowNewPwd((v) => !v)}
                  aria-label={showNewPwd ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showNewPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>אישור סיסמה</label>
              <input
                type="password"
                value={resetForm.confirm_password}
                onChange={(e) => setResetForm((c) => ({ ...c, confirm_password: e.target.value }))}
                placeholder="הקלד שוב את הסיסמה"
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "מאפס..." : "אפס סיסמה"}
            </button>
            <button
              type="button"
              className="forgot-link"
              onClick={() => switchMode("forgot")}
            >
              ← שלח קוד חדש
            </button>
          </form>
        )}

      </div>
    </div>
  );
}