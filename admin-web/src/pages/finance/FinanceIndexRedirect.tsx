import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function FinanceIndexRedirect() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <Navigate to="/finance/me-orders" replace />;
  }
  return <Navigate to="/finance/overview" replace />;
}
