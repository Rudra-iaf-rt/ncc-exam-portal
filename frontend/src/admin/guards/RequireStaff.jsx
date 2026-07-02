import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { getSavedUser } from '../../lib/auth';
import GlobalLoader from '../../components/GlobalLoader';

export function RequireStaff() {
  const { user, isLoading } = useAdminAuth();
  const savedUser = getSavedUser();
  const effectiveUser = user || savedUser;

  if (isLoading && !savedUser) {
    return <GlobalLoader text="Authenticating Staff Portal..." />;
  }

  if (!effectiveUser || (effectiveUser.role !== 'ADMIN' && effectiveUser.role !== 'INSTRUCTOR')) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

