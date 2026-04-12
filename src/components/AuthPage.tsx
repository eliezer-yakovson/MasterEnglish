import { useState } from "react";
import { useAppStore, useApi } from "../store";
import type { Session, LoginForm, RegisterForm } from "../types";

const initialLoginForm: LoginForm = { email: "", password: "" };
const initialRegisterForm: RegisterForm = { name: "", email: "", password: "", role: "user" };

export default function AuthPage() {
  const { config, setConfig, setSession, setStatusMessage, setErrorMessage, statusMessage, errorMessage } =
    useAppStore();
  const api = useApi();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await api.login(loginForm);
      const nextSession: Session = { ...result, email: loginForm.email };
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
      const result = await api.register(registerForm);
      setRegisterForm(initialRegisterForm);
      setAuthMode("login");
      setStatusMessage(`נרשם משתמש חדש בהצלחה. מזהה: ${result.user_id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "אירעה שגיאה בהרשמה.");
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

        <div className="segmented-control">
          <button
            className={authMode === "login" ? "active" : ""}
            onClick={() => setAuthMode("login")}
          >
            התחברות
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            onClick={() => setAuthMode("register")}
          >
            הרשמה
          </button>
        </div>

        <div className="message-stack">
          {statusMessage ? <div className="message success">{statusMessage}</div> : null}
          {errorMessage ? <div className="message error">{errorMessage}</div> : null}
        </div>

        {authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label>אימייל</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="yael@example.com"
                required
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
          </form>
        ) : (
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


      </div>
    </div>
  );
}
