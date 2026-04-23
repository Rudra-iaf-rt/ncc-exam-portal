import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import {
  getSavedUser,
  saveUser,
  clearAuth,
  setToken,
  getToken,
  setRefreshToken,
  getRefreshToken,
} from '../lib/auth';

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

      const { data } = await apiFetch('/auth/me');
      if (data && data.user && (data.user.role === 'ADMIN' || data.user.role === 'INSTRUCTOR')) {
        setUser(data.user);
        saveUser(data.user);
      } else {
        // Not staff or token invalid
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
    const { data, error } = await apiFetch('/auth/login/staff', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data && data.token && (data.user.role === 'ADMIN' || data.user.role === 'INSTRUCTOR')) {
      setToken(data.token);
      setRefreshToken(data.refreshToken || null);
      saveUser(data.user);
      setUser(data.user);
      return { success: true };
    }

    return { 
      success: false, 
      error: error || (!data?.user?.role ? 'Login failed' : 'Access denied: Staff only.')
    };
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
    clearAuth();
    setUser(null);
  }

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

