// Route guard. Redirects unauthenticated users to /login.
//   adminOnly      -> only 'admin' may enter (kept for compatibility).
//   roles={[...]}  -> only the listed roles may enter.
// Anyone signed in but not permitted is sent to the browse page.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, roles = null }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
