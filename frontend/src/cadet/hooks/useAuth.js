import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../../api';

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ncc_user') || 'null');
    } catch (e) {
      console.log(e)
      return null;
    }
  });

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('ncc_logout', handleLogout);
    return () => window.removeEventListener('ncc_logout', handleLogout);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore logout failures
    } finally {
      localStorage.removeItem('ncc_token');
      localStorage.removeItem('ncc_user');
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
