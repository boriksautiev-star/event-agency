import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, authStorage } from "../api/client";

export type Role = "director" | "admin" | "animator";

export type User = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: "active" | "blocked" | "invited";
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Восстановление сессии при старте
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authStorage.getAccess()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<{ user: User }>("/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        authStorage.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Реакция на принудительный logout из axios-интерсептора
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = async (phone: string, password: string) => {
    const { data } = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { phone, password },
    );
    if (data.user.role !== "director" && data.user.role !== "admin") {
      throw new Error("Доступ только для директора и админа");
    }
    authStorage.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен быть внутри <AuthProvider>");
  return ctx;
}
