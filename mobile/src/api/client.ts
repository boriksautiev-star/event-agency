import axios, { AxiosInstance } from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config/env";

const ACCESS_KEY = "ea_access_token";
const REFRESH_KEY = "ea_refresh_token";

// Универсальное хранилище: SecureStore на native, localStorage в web
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const tokenStore = {
  async getAccess(): Promise<string | null> {
    return storage.get(ACCESS_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return storage.get(REFRESH_KEY);
  },
  async set(access: string, refresh: string) {
    await storage.set(ACCESS_KEY, access);
    await storage.set(REFRESH_KEY, refresh);
  },
  async clear() {
    await storage.remove(ACCESS_KEY);
    await storage.remove(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken: refresh,
    });
    await tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);