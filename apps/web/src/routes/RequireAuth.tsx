import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/PageLoader';
import { PATHS } from './paths';

export function RequireAuth() {
  const { isAuthenticated, loading, isLoadingAutoConnect } = useAuthContext();
  if (loading || isLoadingAutoConnect) return <PageLoader />;
  return isAuthenticated ? <Outlet /> : <Navigate to={PATHS.home} replace />;
}
