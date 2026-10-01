import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import OrdersPage from "./pages/OrdersPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/clients" element={<PlaceholderPage title="Клиенты" />} />
            <Route path="/catalog" element={<PlaceholderPage title="Справочники" note="Персонажи, группы, ставки" />} />
            <Route path="/finance" element={<PlaceholderPage title="Финансы" note="Поступления, выплаты, расходы" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
