import { useAppStore } from "./store";
import AuthPage from "./components/AuthPage";
import NavBar from "./components/NavBar";
import AppRoutes from "./components/AppRoutes";

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
    </div>
  );
}
