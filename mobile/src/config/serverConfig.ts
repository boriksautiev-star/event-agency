import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL as ENV_API_URL } from "./env";

const KEY = "ea_server_url";
let cachedUrl: string | null = null;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

async function rawGet(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return window.localStorage.getItem(KEY); } catch { return null; }
  }
  return SecureStore.getItemAsync(KEY);
}

async function rawSet(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value === null) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, value);
    } catch {}
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

/** Загружает URL из хранилища (или из .env как fallback для dev). */
export async function loadServerUrl(): Promise<string | null> {
  const stored = await rawGet();
  const url = stored || (ENV_API_URL && ENV_API_URL.trim() ? normalize(ENV_API_URL) : null);
  cachedUrl = url;
  return url;
}

/** Сохраняет URL в хранилище. */
export async function saveServerUrl(url: string): Promise<void> {
  const normalized = normalize(url);
  await rawSet(normalized);
  cachedUrl = normalized;
}

/** Удаляет URL (при смене сервера). */
export async function clearServerUrl(): Promise<void> {
  await rawSet(null);
  cachedUrl = null;
}

/** Синхронный доступ (для interceptor). */
export function getServerUrlSync(): string | null {
  return cachedUrl;
}

/** Проверка подключения к серверу (GET /api/health). */
export async function testServerUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalize(url);
  if (!/^https?:\/\//i.test(normalized)) {
    return { ok: false, error: "URL должен начинаться с http:// или https://" };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(normalized + "/api/health", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: "HTTP " + res.status };
    const data = await res.json();
    if (data?.status === "ok") return { ok: true };
    return { ok: false, error: "Сервер ответил, но статус не OK" };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "Таймаут подключения" : (e?.message || String(e)) };
  }
}
