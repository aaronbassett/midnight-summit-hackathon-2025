import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import AppLoadingSkeleton from '../components/skeletons/AppLoadingSkeleton';
import { ROUTES } from '../types/routes';
import type { LoginLocationState } from '../types/routes';

/**
 * ProtectedRoute component
 *
 * Layout route that wraps all protected pages.
 * Checks authentication status and redirects to login if necessary.
 * Preserves the attempted location for redirect after successful login.
 */
export default function ProtectedRoute() {
  const { user, loading, initialized } = useAuthStore();
  const location = useLocation();

  // Show loading skeleton while auth is initializing
  if (!initialized || loading) {
    return <AppLoadingSkeleton />;
  }

  // Redirect to login if not authenticated, preserving the attempted location
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location } as LoginLocationState} replace />;
  }

  // User is authenticated, render child routes
  return <Outlet />;
}
