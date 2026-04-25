import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const RequireCadet = () => {
  const [token, setToken] = useState(localStorage.getItem('ncc_token'));
  const user = JSON.parse(localStorage.getItem('ncc_user') || '{}');

  useEffect(() => {
    const handleLogout = () => setToken(null);
    window.addEventListener('ncc_logout', handleLogout);
    return () => window.removeEventListener('ncc_logout', handleLogout);
  }, []);

  if (!token || user.role !== 'STUDENT') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
