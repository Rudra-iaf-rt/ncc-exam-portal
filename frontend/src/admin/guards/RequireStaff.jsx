import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { getSavedUser } from '../../lib/auth';

export function RequireStaff() {
  const { user, isLoading } = useAdminAuth();
  const savedUser = getSavedUser();
  const effectiveUser = user || savedUser;

  if (isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f1a0e',
        color: '#c9982a'
      }}>
        Loading Staff Portal...
      </div>
    );
  }

  if (!effectiveUser || (effectiveUser.role !== 'ADMIN' && effectiveUser.role !== 'INSTRUCTOR')) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

