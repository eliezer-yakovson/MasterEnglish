import { useState } from "react";
import { useAppStore } from "./store";
import AuthPage from "./components/AuthPage";
import NavBar from "./components/NavBar";
import AppRoutes from "./components/AppRoutes";
import AddWordModal from "./components/AddWordModal";

function MessageStack() {
  const { statusMessage, errorMessage } = useAppStore();
  if (!statusMessage && !errorMessage) return null;
  return (
    <div className="message-stack container">
      {statusMessage ? <div className="message success">{statusMessage}</div> : null}
      {errorMessage ? <div className="message error">{errorMessage}</div> : null}
    </div>
  );
}

export default function App() {
  const session = useAppStore((s) => s.session);
  const isAdmin = useAppStore((s) => s.session?.role === "admin");
  const [addWordOpen, setAddWordOpen] = useState(false);

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="app-layout">
      <NavBar />

      <main className="main-content">
        <MessageStack />
        <div className="container">
          <AppRoutes />
        </div>
      </main>

      {/* Global FAB — visible for regular users on all pages */}
      {!isAdmin && (
        <>
          <button
            className={`fab-add${addWordOpen ? " open" : ""}`}
            onClick={() => setAddWordOpen((o) => !o)}
            title={addWordOpen ? "סגור" : "הוסף מילה חדשה"}
            aria-label="הוסף מילה חדשה"
          >
            {addWordOpen ? "✕" : "+"}
          </button>
          {addWordOpen && <AddWordModal onClose={() => setAddWordOpen(false)} />}
        </>
      )}
    </div>
  );
}

