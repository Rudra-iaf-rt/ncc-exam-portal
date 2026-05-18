import { useState, useEffect } from 'react';
import { authApi } from '../api';
import { 
  getSavedUser, 
  saveUser, 
  clearAuth, 
  setToken, 
  getToken, 
  setRefreshToken, 
  getRefreshToken 
} from '../lib/auth';
import { AdminAuthContext } from './AdminAuth';

const COOKIE_AUTH_ENABLED = String(import.meta.env.VITE_COOKIE_AUTH || 'false') === 'true';

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = getSavedUser();
    const isStaff = saved?.role === 'ADMIN' || saved?.role === 'INSTRUCTOR';
    return isStaff ? saved : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      await authApi.logout(COOKIE_AUTH_ENABLED ? {} : { refreshToken });
    } catch {
      // Ignore logout errors (session may already be expired or revoked)
    }
    clearAuth();
    setUser(null);
    window.dispatchEvent(new Event('ncc_logout'));
  }

  useEffect(() => {
    async function rehydrate() {
      const token = getToken();
      if (!token && !COOKIE_AUTH_ENABLED) {
        setIsLoading(false);
        return;
      }

      // If the saved user is a STUDENT, do not perform staff rehydration or call logout()!
      const saved = getSavedUser();
      if (saved && saved.role === 'STUDENT' && !COOKIE_AUTH_ENABLED) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authApi.getMe();
        const isStaff = data?.user?.role === 'ADMIN' || data?.user?.role === 'INSTRUCTOR';
        
        if (data && data.user) {
          if (isStaff) {
            setUser(data.user);
            saveUser(data.user);
          } else if (data.user.role === 'STUDENT') {
            setUser(null);
            saveUser(data.user);
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        // Only log out if it's a definitive authentication failure (4xx except 404/429)
        const status = err.status || err.response?.status;
        const isAuthError = status >= 400 && status < 500 && status !== 404 && status !== 429;
        if (isAuthError) {
          logout();
        }
      }
      setIsLoading(false);
    }

    rehydrate();

    // Listen for global logout events from api client 401 handler
    const handleLogout = () => {
      setUser(null);
      clearAuth();
    };
    window.addEventListener('ncc_logout', handleLogout);
    return () => window.removeEventListener('ncc_logout', handleLogout);
  }, []);

  async function login(email, password) {
    try {
      const { data } = await authApi.loginStaff({ email, password });
      const isStaff = data?.user?.role === 'ADMIN' || data?.user?.role === 'INSTRUCTOR';

      if (data && data.user && isStaff) {
        if (!COOKIE_AUTH_ENABLED) {
          if (data.token) setToken(data.token);
          if (data.refreshToken) setRefreshToken(data.refreshToken);
        }
        saveUser(data.user);
        setUser(data.user);
        return { success: true };
      }

      return { 
        success: false, 
        error: data?.user && !isStaff ? 'Access denied: Staff only.' : 'Authentication failed. Please verify credentials.'
      };
    } catch (err) {
      return { 
        success: false, 
        error: err.message || 'Login failed. Connection to HQ could not be established.'
      };
    }
  }

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
