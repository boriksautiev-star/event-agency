import { useBackupStatus } from "../hooks/useBackups";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";

export function BackupBanner() {
  const { user } = useAuth();
  const { data } = useBackupStatus();

  if (!data || !data.isStale || user?.role !== "director") return null;

  return (
    <div className="border-b px-4 py-2 text-sm flex items-center justify-between bg-red-50 border-red-200 text-red-800">
      <div className="flex items-center gap-2">
        <span>💾</span>
        <span>
          Бэкап БД не создавался {data.ageHours !== null ? `${data.ageHours} ч` : "ни разу"}.
          Проверьте планировщик или создайте вручную.
        </span>
      </div>
      <Link to="/settings" className="font-semibold underline hover:opacity-80">
        Открыть настройки
      </Link>
    </div>
  );
}
