import { Navigate } from "react-router-dom";
import { useAppStore } from "../store";

interface Props {
  children: React.ReactNode;
  role?: "admin" | "user";
}

export default function ProtectedRoute({ children, role }: Props) {
  const session = useAppStore((s) => s.session);

  if (!session) return <Navigate to="/" replace />;
  if (role && session.role !== role) return <Navigate to="/library" replace />;

  return <>{children}</>;
}
