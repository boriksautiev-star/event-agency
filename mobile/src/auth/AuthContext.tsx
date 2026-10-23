import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../api/client";
import { loadServerUrl, saveServerUrl, clearServerUrl } from "../config/serverConfig";
import type { LoginResponse, User } from "../api/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  serverUrl: string | null;
  serverLoading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  resetServer: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(true);

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
      const url = await loadServerUrl();
      setServerUrlState(url);
      setServerLoading(false);
      if (url) {
        const access = await tokenStore.getAccess();
        if (access) await refreshMe();
      }
      setLoading(false);
    })();
  }, [refreshMe]);

  const setServerUrl = useCallback(async (url: string) => {
    await saveServerUrl(url);
    setServerUrlState(url);
  }, []);


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

  const resetServer = useCallback(async () => {
    await logout();
    await clearServerUrl();
    setServerUrlState(null);
  }, [logout]);


  const value = useMemo(
    () => ({ user, loading, serverUrl, serverLoading, login, logout, refreshMe, setServerUrl, resetServer }),
    [user, loading, serverUrl, serverLoading, login, logout, refreshMe, setServerUrl, resetServer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}