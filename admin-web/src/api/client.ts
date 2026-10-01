import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const ACCESS_KEY = "ea.accessToken";
const REFRESH_KEY = "ea.refreshToken";

export const authStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ---- Request: подставить accessToken ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Response: на 401 — попытка refresh один раз ----
let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = authStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post("/api/auth/refresh", { refreshToken: refresh });
    if (data?.accessToken && data?.refreshToken) {
      authStorage.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      if (!refreshing) {
        refreshing = tryRefresh().finally(() => { refreshing = null; });
      }
      const newAccess = await refreshing;
      if (newAccess) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api.request(original);
      }
      authStorage.clear();
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  },
);
