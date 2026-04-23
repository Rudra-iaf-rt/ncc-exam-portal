import { createContext, useContext } from 'react';

export const AdminAuthContext = createContext();

export { AdminAuthProvider } from './AdminAuthProvider';

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
