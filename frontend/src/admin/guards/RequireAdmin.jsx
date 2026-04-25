import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuth';

export function RequireAdmin() {
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
        Loading Admin Portal...
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
