import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RoleName } from '../lib/types';
import { LoadingSpinner } from './Feedback';

// Gates a route subtree behind authentication and (optionally) a specific role. Role checks here
// are a UX convenience only — the backend's RolesGuard is the real enforcement point
// (architecture.md §4: "role checks must never be trusted client-side only").
export function ProtectedRoute({ allowedRoles }: { allowedRoles?: RoleName[] }) {
  const { isAuthenticated, isLoading, user, activeRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && activeRole && !allowedRoles.includes(activeRole)) {
    // User has the role but is currently viewing under a different active role (role switcher) —
    // send them to the section matching their active role rather than blocking outright.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
