import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import NewOrderPage from "./pages/NewOrderPage";
import CatalogLayout from "./pages/catalog/CatalogLayout";
import GroupsPage from "./pages/catalog/GroupsPage";
import CharactersPage from "./pages/catalog/CharactersPage";

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
            <Route path="/clients" element={<PlaceholderPage title="Клиенты" />} />
            <Route path="/catalog" element={<CatalogLayout />}>
              <Route index element={<Navigate to="/catalog/groups" replace />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="characters" element={<CharactersPage />} />
              <Route path="rates" element={<PlaceholderPage title="Матрица ставок" note="Раздел в разработке" />} />
            </Route>
            <Route path="/finance" element={<PlaceholderPage title="Финансы" note="Поступления, выплаты, расходы" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
