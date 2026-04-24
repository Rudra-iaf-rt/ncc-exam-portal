import { useState, useEffect } from 'react';
import { authApi } from '../api';
import { getSavedUser, saveUser, clearAuth, setToken, getToken } from '../lib/auth';

import { AdminAuthContext } from './AdminAuthContext';

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser());
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        logout();
      }
      setIsLoading(false);
    }

    rehydrate();

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
        saveUser(data.user);
        setUser(data.user);
        return { success: true };
      }

      return { 
        success: false, 
        error: !isStaff ? 'Access denied: Staff only.' : 'Login failed'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed'
      };
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
  }

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

