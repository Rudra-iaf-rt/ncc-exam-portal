import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const RequireCadet = () => {
  const token = localStorage.getItem('ncc_token');
  const user = JSON.parse(localStorage.getItem('ncc_user') || '{}');

  if (!token || user.role !== 'STUDENT') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
