import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRedirectPath } from '../utils/redirectUser';

const LOADING_PLACEHOLDER_STYLE = { padding: '2rem', fontSize: '1.1rem' };

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  // Show loading state while checking auth
  if (loading) {
    return <div style={LOADING_PLACEHOLDER_STYLE}>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const loginType = allowedRoles.length === 1 ? allowedRoles[0] : 'customer';
    const params = new URLSearchParams();
    params.set('type', loginType);
    if (location.pathname) {
      params.set('redirect', `${location.pathname}${location.search || ''}`);
    }

    return (
      <Navigate
        to={`/login?${params.toString()}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // Redirect if user role doesn't match allowed roles
  const userRole = user?.role || user?.type;
  if (allowedRoles.length && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  // Render protected content
  return <Outlet />;
}
