import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function PrivateRoute({ children }) {
  const { loading, usuario } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-status">
        Carregando sessao...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
