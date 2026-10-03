import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";

type Tab = { to: string; label: string; directorOnly?: boolean };

const TABS: Tab[] = [
  { to: "/animators/list", label: "Аниматоры" },
  { to: "/animators/rates", label: "Матрица ставок", directorOnly: true },
];

export default function AnimatorsLayout() {
  const { user } = useAuth();
  const isDirector = user?.role === "director";

  const visible = TABS.filter((t) => !t.directorOnly || isDirector);

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {visible.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 transition",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
