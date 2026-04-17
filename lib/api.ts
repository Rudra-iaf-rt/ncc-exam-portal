import axios, { type AxiosError, isAxiosError } from "axios";
import Constants from "expo-constants";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "http://127.0.0.1:3000";

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/** Set from `AuthProvider` so 401s clear storage + axios header + React state without importing this file from context. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      try {
        onUnauthorized?.();
      } catch {
        /* avoid breaking the rejection chain */
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{ error?: string }>;
  const msg = ax.response?.data?.error;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (ax.message) return ax.message;
  return fallback;
}
