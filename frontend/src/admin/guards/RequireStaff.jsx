import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export function RequireStaff() {
  const { user, isLoading } = useAdminAuth();

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

  if (!user || (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

