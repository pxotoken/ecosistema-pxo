import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { PATHS } from './paths';

export function RequireGuest() {
  const { isAuthenticated, loading, isLoadingAutoConnect } = useAuthContext();
  if (loading || isLoadingAutoConnect) return null;
  return isAuthenticated ? <Navigate to={PATHS.dashboard.wallet} replace /> : <Outlet />;
}
