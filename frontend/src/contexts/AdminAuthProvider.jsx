import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
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

      const { data, error } = await apiFetch('/auth/me');
      if (data && data.user && data.user.role === 'ADMIN') {
        setUser(data.user);
        saveUser(data.user);
      } else {
        // Not an admin or token invalid
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

    if (data && data.token && data.user.role === 'ADMIN') {
      setToken(data.token);
      saveUser(data.user);
      setUser(data.user);
      return { success: true };
    }

    return { 
      success: false, 
      error: error || (data?.user?.role !== 'ADMIN' ? 'Access denied: Admins only.' : 'Login failed')
    };
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

