import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { getSavedUser } from '../../lib/auth';
import GlobalLoader from '../../components/GlobalLoader';

export function RequireAdmin() {
  const { user, isLoading } = useAdminAuth();
  const savedUser = getSavedUser();
  const effectiveUser = user || savedUser;

  if (isLoading && !savedUser) {
    return <GlobalLoader text="Authenticating Administrator..." />;
  }
  
  if (!effectiveUser || effectiveUser.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
