import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore, useApi } from "../store";
import { usePwaInstall } from "../hooks/usePwaInstall";

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, setSession, setStatusMessage } = useAppStore();
  const api = useApi();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { canInstall, triggerInstall } = usePwaInstall();

  const isAdmin = session?.role === "admin";

  function active(path: string) {
    return location.pathname === path ? "active" : "";
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // tolerate logout API errors — local session is cleared regardless
    }
    setSession(null);
    queryClient.clear();
    setStatusMessage("היציאה בוצעה בהצלחה.");
    setIsLoggingOut(false);
  }

  return (
    <>
      <nav className="main-navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-dot"></span>
            <span className="brand-text">Master English</span>
          </div>

          <div className="nav-links desktop-links">
            {!isAdmin && (
              <>
                <button className={active("/library")} onClick={() => navigate("/library")}>
                  📚 ספרייה
                </button>
                <button className={active("/import")} onClick={() => navigate("/import")}>
                  ➕ יבוא מילים
                </button>
                <button className={active("/training")} onClick={() => navigate("/training")}>
                  🎯 תרגול
                </button>
                <button className={active("/progress")} onClick={() => navigate("/progress")}>
                  📊 התקדמות
                </button>
                <button className={active("/capture")} onClick={() => navigate("/capture")}>
                  🔍 לכידה
                </button>
                <button className={active("/games")} onClick={() => navigate("/games")}>
                  🎮 משחקים
                </button>
              </>
            )}
            {isAdmin && (
              <button className={active("/admin")} onClick={() => navigate("/admin")}>
                ⚙️ ניהול מערכת
              </button>
            )}
          </div>

          <div className="nav-user">
            {canInstall && (
              <button className="btn-install" onClick={triggerInstall} title="התקן כאפליקציה">
                📲 התקן
              </button>
            )}
            <span className="user-badge">
              {session?.email?.charAt(0).toUpperCase() || "U"}
            </span>
            <button
              className="btn-logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              יציאה
            </button>
          </div>
        </div>
      </nav>

      <nav className="mobile-bottom-nav">
        {!isAdmin && (
          <>
            <button className={active("/library")} onClick={() => navigate("/library")}>
              📚<br /><small>ספרייה</small>
            </button>
            <button className={active("/import")} onClick={() => navigate("/import")}>
              ➕<br /><small>יבוא</small>
            </button>
            <button className={active("/training")} onClick={() => navigate("/training")}>
              🎯<br /><small>תרגול</small>
            </button>
            <button className={active("/progress")} onClick={() => navigate("/progress")}>
              📊<br /><small>התקדמות</small>
            </button>
            <button className={active("/capture")} onClick={() => navigate("/capture")}>
              🔍<br /><small>לכידה</small>
            </button>
            <button className={active("/games")} onClick={() => navigate("/games")}>
              🎮<br /><small>משחקים</small>
            </button>
          </>
        )}
        {isAdmin && (
          <button className={active("/admin")} onClick={() => navigate("/admin")}>
            ⚙️ ניהול
          </button>
        )}
      </nav>
    </>
  );
}
