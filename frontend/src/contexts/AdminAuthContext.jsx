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

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser());
  const [isLoading, setIsLoading] = useState(true);

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout({ refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
    setUser(null);
  }

  useEffect(() => {
    async function rehydrate() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authApi.getMe();
        const isStaff = data?.user?.role === 'ADMIN' || data?.user?.role === 'INSTRUCTOR';
        
        if (data && data.user && isStaff) {
          setUser(data.user);
          saveUser(data.user);
        } else {
          logout();
        }
      } catch {
        logout();
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

      if (data && data.token && isStaff) {
        setToken(data.token);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
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
