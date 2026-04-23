import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, setAuthToken, type ApiUser } from '@/lib/api';

/** JWT stored in AsyncStorage (legacy `portal_auth_token` still read on boot). */
const STORAGE_JWT = 'jwt';
const STORAGE_REFRESH_TOKEN = 'refresh_token';
const STORAGE_TOKEN_LEGACY = 'portal_auth_token';
const STORAGE_USER = 'portal_auth_user';

type AuthContextValue = {
  token: string | null;
  user: ApiUser | null;
  loading: boolean;
  /** POST /auth/login — regimental number + password */
  login: (regimentalNumber: string, password: string) => Promise<void>;
  loginStudent: (regimentalNumber: string, password: string) => Promise<void>;
  loginStaff: (email: string, password: string) => Promise<void>;
  registerStudent: (input: {
    name: string;
    regimentalNumber: string;
    email: string;
    mobile: string;
    password: string;
    college: string;
    batch: string;
    year: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jwt, savedRefreshToken, legacyToken, uJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_JWT),
          AsyncStorage.getItem(STORAGE_REFRESH_TOKEN),
          AsyncStorage.getItem(STORAGE_TOKEN_LEGACY),
          AsyncStorage.getItem(STORAGE_USER),
        ]);
        const t = jwt ?? legacyToken;
        if (cancelled) return;
        if (legacyToken && !jwt) {
          await AsyncStorage.setItem(STORAGE_JWT, legacyToken);
        }
        if (t && uJson) {
          setToken(t);
          setRefreshToken(savedRefreshToken);
          setAuthToken(t);
          setUser(JSON.parse(uJson) as ApiUser);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (t: string, rt: string | null, u: ApiUser) => {
    setToken(t);
    setRefreshToken(rt);
    setUser(u);
    setAuthToken(t);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_JWT, t),
      ...(rt
        ? [AsyncStorage.setItem(STORAGE_REFRESH_TOKEN, rt)]
        : [AsyncStorage.removeItem(STORAGE_REFRESH_TOKEN)]),
      AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY),
      AsyncStorage.setItem(STORAGE_USER, JSON.stringify(u)),
    ]);
  }, []);

  const login = useCallback(
    async (regimentalNumber: string, password: string) => {
      const { data } = await api.post<{ token: string; refreshToken: string; user: ApiUser }>('/auth/login', {
        regimentalNumber,
        password,
      });
      await persist(data.token, data.refreshToken ?? null, data.user);
    },
    [persist]
  );

  const loginStudent = useCallback(
    async (regimentalNumber: string, password: string) => {
      await login(regimentalNumber, password);
    },
    [login]
  );

  const loginStaff = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{ token: string; refreshToken: string; user: ApiUser }>('/auth/login/staff', {
        email,
        password,
      });
      await persist(data.token, data.refreshToken ?? null, data.user);
    },
    [persist]
  );

  const registerStudent = useCallback(
    async (input: {
      name: string;
      regimentalNumber: string;
      email: string;
      mobile: string;
      password: string;
      college: string;
      batch: string;
      year: string;
    }) => {
      const { data } = await api.post<{ token: string; refreshToken: string; user: ApiUser }>(
        '/auth/register',
        input
      );
      await persist(data.token, data.refreshToken ?? null, data.user);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_JWT),
      AsyncStorage.removeItem(STORAGE_REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY),
      AsyncStorage.removeItem(STORAGE_USER),
    ]);
  }, [refreshToken]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error?.config as
          | ({ _retry?: boolean; headers?: Record<string, string> } & Record<string, unknown>)
          | undefined;
        const status = error?.response?.status;
        if (!originalRequest || status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        if (
          String(originalRequest.url || '').includes('/auth/login') ||
          String(originalRequest.url || '').includes('/auth/register') ||
          String(originalRequest.url || '').includes('/auth/refresh')
        ) {
          return Promise.reject(error);
        }
        if (!refreshToken) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        try {
          const { data } = await api.post<{ token: string; refreshToken: string; user: ApiUser }>(
            '/auth/refresh',
            { refreshToken }
          );
          await persist(data.token, data.refreshToken ?? null, data.user);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          await logout();
          return Promise.reject(refreshError);
        }
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshToken, persist, logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      loginStudent,
      loginStaff,
      registerStudent,
      logout,
    }),
    [token, user, loading, login, loginStudent, loginStaff, registerStudent, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
