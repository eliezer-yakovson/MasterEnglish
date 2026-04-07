import { useState, useEffect, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { canInstall, triggerInstall } = usePwaInstall();
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.role === "admin";

  // Close menu when navigating
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  function active(path: string) {
    return location.pathname === path ? "active" : "";
  }

  function go(path: string) {
    navigate(path);
    setMenuOpen(false);
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

  const userLinks = [
    { path: "/library",  icon: "📚", label: "ספרייה" },
    { path: "/import",   icon: "➕", label: "יבוא מילים" },
    { path: "/training", icon: "🎯", label: "תרגול" },
    { path: "/progress", icon: "📊", label: "התקדמות" },
    { path: "/capture",  icon: "🔍", label: "לכידה" },
    { path: "/games",    icon: "🎮", label: "משחקים" },
    { path: "/about",    icon: "ℹ️",  label: "אודות" },
  ];

  const adminLinks = [
    { path: "/admin", icon: "⚙️", label: "ניהול מערכת" },
    { path: "/about", icon: "ℹ️", label: "אודות" },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <>
      <nav className="main-navbar">
        <div className="nav-container">
          {/* Hamburger button — mobile only */}
          <button
            className="hamburger-btn"
            aria-label="פתח תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`ham-line${menuOpen ? " open" : ""}`}></span>
            <span className={`ham-line${menuOpen ? " open" : ""}`}></span>
            <span className={`ham-line${menuOpen ? " open" : ""}`}></span>
          </button>

          <div className="nav-brand">
            <span className="brand-dot"></span>
            <span className="brand-text">Master English</span>
          </div>

          {/* Desktop links */}
          <div className="nav-links desktop-links">
            {links.map((l) => (
              <button key={l.path} className={active(l.path)} onClick={() => go(l.path)}>
                {l.icon} {l.label}
              </button>
            ))}
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

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="mobile-drawer" ref={menuRef}>
            {canInstall && (
              <button className="drawer-install-btn" onClick={() => { triggerInstall(); setMenuOpen(false); }}>
                📲 התקן כאפליקציה
              </button>
            )}
            {links.map((l) => (
              <button key={l.path} className={`drawer-item${location.pathname === l.path ? " active" : ""}`} onClick={() => go(l.path)}>
                <span className="drawer-icon">{l.icon}</span>
                <span>{l.label}</span>
              </button>
            ))}
            <div className="drawer-divider" />
            <button className="drawer-item drawer-logout" onClick={handleLogout} disabled={isLoggingOut}>
              <span className="drawer-icon">🚪</span>
              <span>{isLoggingOut ? "יוצא..." : "יציאה"}</span>
            </button>
          </div>
        )}
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
            <button className={active("/games")} onClick={() => navigate("/games")}>
              🎮<br /><small>משחקים</small>
            </button>
            <button className={active("/about")} onClick={() => navigate("/about")}>
              ℹ️<br /><small>אודות</small>
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
