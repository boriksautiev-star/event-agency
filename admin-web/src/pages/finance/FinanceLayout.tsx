import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";

type Tab = { to: string; label: string };

const DIRECTOR_TABS: Tab[] = [
  { to: "/finance/overview", label: "Обзор" },
  { to: "/finance/payouts", label: "Выплаты" },
  { to: "/finance/expenses", label: "Расходы" },
  { to: "/finance/payments", label: "Поступления" },
];

const ADMIN_TABS: Tab[] = [
  { to: "/finance/me-orders", label: "Мои заказы" },
  { to: "/finance/me-ledger", label: "Мои начисления" },
];

export default function FinanceLayout() {
  const { user } = useAuth();
  const tabs = user?.role === "admin" ? ADMIN_TABS : DIRECTOR_TABS;

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
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
