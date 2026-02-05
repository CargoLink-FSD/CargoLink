import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { getRedirectPath } from '../utils/redirectUser';
import { refreshAccessToken } from '../store/slices/authSlice';
import tokenStorage from '../utils/token';

const LOADING_PLACEHOLDER_STYLE = { padding: '2rem', fontSize: '1.1rem' };

export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const accessToken = tokenStorage.getAccessToken();
      
      if (accessToken && tokenStorage.isTokenExpired(accessToken)) {
        const refreshToken = tokenStorage.getRefreshToken();
        
        if (refreshToken && !tokenStorage.isTokenExpired(refreshToken)) {
          try {
            await dispatch(refreshAccessToken()).unwrap();
          } catch (error) {
            console.error('Token refresh failed:', error);
          }
        }
      }
      
      setIsCheckingToken(false);
    };

    checkAndRefreshToken();
  }, [dispatch, location.pathname]);

  // Show loading state while checking auth or refreshing token
  if (loading || isCheckingToken) {
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
