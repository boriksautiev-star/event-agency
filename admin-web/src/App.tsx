import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import NewOrderPage from "./pages/NewOrderPage";
import ClientsPage from "./pages/clients/ClientsPage";
import FinanceLayout from "./pages/finance/FinanceLayout";
import FinanceOverviewPage from "./pages/finance/FinanceOverviewPage";
import FinancePayoutsPage from "./pages/finance/FinancePayoutsPage";
import FinanceExpensesPage from "./pages/finance/FinanceExpensesPage";
import FinancePaymentsPage from "./pages/finance/FinancePaymentsPage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";
import CatalogLayout from "./pages/catalog/CatalogLayout";
import GroupsPage from "./pages/catalog/GroupsPage";
import CharactersPage from "./pages/catalog/CharactersPage";
import RatesMatrixPage from "./pages/catalog/RatesMatrixPage";
import AnimatorsLayout from "./pages/animators/AnimatorsLayout";
import AnimatorsListPage from "./pages/animators/AnimatorsListPage";
import SettingsPage from "./pages/SettingsPage";
import StaffListPage from "./pages/staff/StaffListPage";
import StaffDetailPage from "./pages/staff/StaffDetailPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<NewOrderPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/staff" element={<StaffListPage />} />
            <Route path="/staff/:id" element={<StaffDetailPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/animators" element={<AnimatorsLayout />}>
              <Route index element={<Navigate to="/animators/list" replace />} />
              <Route path="list" element={<AnimatorsListPage />} />
              <Route path="rates" element={<RatesMatrixPage />} />
            </Route>

            {/* Редирект старых ссылок */}
            <Route path="/catalog/rates" element={<Navigate to="/animators/rates" replace />} />

            <Route path="/catalog" element={<CatalogLayout />}>
              <Route index element={<Navigate to="/catalog/groups" replace />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="characters" element={<CharactersPage />} />
            </Route>
            <Route path="/finance" element={<FinanceLayout />}>
              <Route index element={<Navigate to="/finance/overview" replace />} />
              <Route path="overview" element={<FinanceOverviewPage />} />
              <Route path="payouts" element={<FinancePayoutsPage />} />
              <Route path="expenses" element={<FinanceExpensesPage />} />
              <Route path="payments" element={<FinancePaymentsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
