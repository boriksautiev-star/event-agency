import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../api/client";
import type { LoginResponse, User } from "../api/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const access = await tokenStore.getAccess();
      if (access) await refreshMe();
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await api.post<LoginResponse>("/api/auth/login", { phone, password });
    await tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    // Перед выходом — снимаем push-токен с текущего пользователя,
    // чтобы не было путаницы при смене аккаунта на одном устройстве.
    if (user) {
      try {
        await api.patch(`/api/users/${user.id}/push-token`, { expoPushToken: null });
      } catch (e) {
        console.warn("[push] failed to clear token on logout:", e);
      }
    }

    try {
      const refreshToken = await tokenStore.getRefresh();
      await api.post("/api/auth/logout", { refreshToken });
    } catch {
      // игнорируем
    }
    await tokenStore.clear();
    setUser(null);
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}