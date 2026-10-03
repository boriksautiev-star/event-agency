import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Role = "director" | "admin" | "animator";

type Props = {
  roles: Role[];
  redirectTo?: string;
};

export default function RequireRole({ roles, redirectTo }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Загрузка…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!roles.includes(user.role as Role)) {
    const fallback =
      redirectTo ?? (location.pathname.startsWith("/finance") ? "/finance" : "/orders");
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
}
