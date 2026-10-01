import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ??
        err?.message ??
        "Не удалось войти";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-primary">Event Agency</div>
          <div className="text-sm text-gray-500 mt-1">Вход в админ-панель</div>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        />

        {error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primaryDark disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {loading ? "Вхожу…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
