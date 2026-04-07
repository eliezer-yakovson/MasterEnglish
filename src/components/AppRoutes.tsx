import { Navigate, Route, Routes } from "react-router-dom";
import { useAppStore } from "../store";
import ProtectedRoute from "./ProtectedRoute";
import Library from "../pages/Library/Library";
import Import from "../pages/Import/Import";
import Training from "../pages/Training/Training";
import Progress from "../pages/Progress/Progress";
import Capture from "../pages/Capture/Capture";
import Admin from "../pages/Admin/Admin";
import Games from "../pages/Games/Games";
import SnakeGame from "../pages/Games/SnakeGame";
import SpeedMatch from "../pages/Games/SpeedMatch";
import About from "../pages/About/About";

export default function AppRoutes() {
  const isAdmin = useAppStore((s) => s.session?.role === "admin");

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/library"} replace />} />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <Library />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <Import />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <Training />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <Progress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/capture"
        element={
          <ProtectedRoute>
            <Capture />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games"
        element={
          <ProtectedRoute>
            <Games />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/snake"
        element={
          <ProtectedRoute>
            <SnakeGame />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/speedmatch"
        element={
          <ProtectedRoute>
            <SpeedMatch />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
