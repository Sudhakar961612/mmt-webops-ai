import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccess } from '../config/nav.js';
import Spinner from './Spinner.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner label="Checking session…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Enforce role access for a specific path.
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  if (!canAccess(user.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
