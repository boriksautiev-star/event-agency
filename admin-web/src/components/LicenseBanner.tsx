import { useLicense } from "../hooks/useLicense";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LicenseBanner() {
  const { user } = useAuth();
  const { data } = useLicense();

  if (!data || data.status === "active") return null;

  let bg = "bg-yellow-50 border-yellow-200 text-yellow-800";
  let icon = "⚠️";
  
  if (data.status === "grace" || data.status === "expired" || data.status === "invalid" || data.status === "none") {
    bg = "bg-red-50 border-red-200 text-red-800";
    icon = "🚨";
  }

  return (
    <div className={`border-b px-4 py-2 text-sm flex items-center justify-between ${bg}`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{data.reason}</span>
      </div>
      {user?.role === "director" && (
        <Link to="/settings" className="font-semibold underline hover:opacity-80">
          Загрузить лицензию
        </Link>
      )}
    </div>
  );
}
