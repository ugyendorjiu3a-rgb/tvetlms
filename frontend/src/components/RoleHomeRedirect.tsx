import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../lib/roleTheme';

// "/" always bounces to whichever dashboard matches the current active role.
export function RoleHomeRedirect() {
  const { activeRole } = useAuth();
  if (!activeRole) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[activeRole]} replace />;
}
