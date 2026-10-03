import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Role = "director" | "admin" | "animator";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
};

const NAV: NavItem[] = [
  { to: "/orders", label: "Заказы", icon: "📋" },
  { to: "/clients", label: "Клиенты", icon: "👥" },
  { to: "/animators", label: "Аниматоры", icon: "🎭" },
  { to: "/catalog", label: "Справочники", icon: "📚" },
  { to: "/finance", label: "Финансы", icon: "💰" },
  { to: "/settings", label: "Настройки", icon: "⚙️", roles: ["director"] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const visibleNav = NAV.filter(
    (item) =>
      !item.roles ||
      (user?.role && item.roles.includes(user.role as Role)),
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="text-lg font-extrabold text-primary">Event Agency</div>
          <div className="text-xs text-gray-400 mt-0.5">Admin</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 px-2 mb-2">
            {user?.firstName} {user?.lastName}
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
          <div className="text-sm text-gray-500">
            {user?.role === "director" ? "Директор" : "Администратор"}
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
