import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../../api';
import { getSavedUser, getRefreshToken, clearAuth } from '../../lib/auth';

const COOKIE_AUTH_ENABLED = String(import.meta.env.VITE_COOKIE_AUTH || 'false') === 'true';

export const useAuth = () => {
  const [user, setUser] = useState(() => getSavedUser());

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('ncc_logout', handleLogout);
    return () => window.removeEventListener('ncc_logout', handleLogout);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      await authApi.logout(COOKIE_AUTH_ENABLED ? {} : { refreshToken });
    } catch (e) {
      // ignore logout failures
    } finally {
      clearAuth();
      setUser(null);
      // Dispatch event to sync other tabs/components
      window.dispatchEvent(new Event('ncc_logout'));
    }
  }, []);

  return {
    user,
    logout,
    isAuthenticated: !!user,
    role: user?.role
  };
};
