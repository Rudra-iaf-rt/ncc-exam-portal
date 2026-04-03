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
    password: string;
    college: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jwt, legacyToken, uJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_JWT),
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

  const persist = useCallback(async (t: string, u: ApiUser) => {
    setToken(t);
    setUser(u);
    setAuthToken(t);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_JWT, t),
      AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY),
      AsyncStorage.setItem(STORAGE_USER, JSON.stringify(u)),
    ]);
  }, []);

  const login = useCallback(
    async (regimentalNumber: string, password: string) => {
      const { data } = await api.post<{ token: string; user: ApiUser }>('/auth/login', {
        regimentalNumber,
        password,
      });
      await persist(data.token, data.user);
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
      const { data } = await api.post<{ token: string; user: ApiUser }>('/auth/login/staff', {
        email,
        password,
      });
      await persist(data.token, data.user);
    },
    [persist]
  );

  const registerStudent = useCallback(
    async (input: {
      name: string;
      regimentalNumber: string;
      password: string;
      college: string;
    }) => {
      const { data } = await api.post<{ token: string; user: ApiUser }>('/auth/register', input);
      await persist(data.token, data.user);
    },
    [persist]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_JWT),
      AsyncStorage.removeItem(STORAGE_TOKEN_LEGACY),
      AsyncStorage.removeItem(STORAGE_USER),
    ]);
  }, []);

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
