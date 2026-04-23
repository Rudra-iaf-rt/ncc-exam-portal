import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, setUnauthorizedHandler } from "../lib/api";

const TOKEN_KEY = "ncc_auth_token";

type User = {
  id: number;
  name: string;
  regimentalNumber: string | null;
  email: string | null;
  role: string;
  college: string;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (regimentalNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (cancelled) return;
        if (stored) {
          api.defaults.headers.common.Authorization = `Bearer ${stored}`;
          try {
            const { data } = await api.get<{ user: User }>("/api/auth/me");
            if (cancelled) return;
            // Logout (or another login) may have cleared storage while /api/me was in flight.
            const still = await AsyncStorage.getItem(TOKEN_KEY);
            if (still !== stored) return;
            setToken(stored);
            setUser(data.user);
          } catch {
            await AsyncStorage.removeItem(TOKEN_KEY);
            delete api.defaults.headers.common.Authorization;
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (regimentalNumber: string, password: string) => {
    const { data } = await api.post<{ token: string; user: User }>("/api/auth/login", {
      regimentalNumber: regimentalNumber.trim(),
      password,
    });
    try {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
    } catch {
      delete api.defaults.headers.common.Authorization;
      throw new Error("Could not save session on this device.");
    }
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      delete api.defaults.headers.common.Authorization;
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
    }),
    [token, user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
