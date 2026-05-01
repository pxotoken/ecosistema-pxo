import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { PATHS } from './paths';

export function RequireAuth() {
  const { isAuthenticated, loading, isLoadingAutoConnect } = useAuthContext();
  if (loading || isLoadingAutoConnect) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to={PATHS.home} replace />;
}
