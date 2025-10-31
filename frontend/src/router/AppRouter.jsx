import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pages
import Home from '../pages/Home';
import Login from '../pages/login';
import Signup from '../pages/Signup';

// Notification component
import Notification from '../components/Notification';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userType } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userType)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * AppRouter Component
 * Main routing configuration for the application
 */
function AppRouter() {
  return (
    <BrowserRouter>
      {}
      <Notification />
      
      <Routes>
        {}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {}
        <Route path="/static/services" element={<div>Services Page</div>} />
        <Route path="/static/about" element={<div>About Page</div>} />
        <Route path="/static/contact" element={<div>Contact Page</div>} />
        <Route path="/static/careers" element={<div>Careers Page</div>} />
        <Route path="/static/terms" element={<div>Terms Page</div>} />
        <Route path="/static/privacy" element={<div>Privacy Page</div>} />
        <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />

        {}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <div>Customer Dashboard (To be implemented)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <div>Customer Orders Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/place-order"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <div>Place Order Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <div>Customer Profile Page</div>
            </ProtectedRoute>
          }
        />

        {}
        <Route
          path="/transporter/dashboard"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>Transporter Dashboard (To be implemented)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/bid"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>Bid Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/my-bids"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>My Bids Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/orders"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>Transporter Orders Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/fleet"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>Fleet Management Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/profile"
          element={
            <ProtectedRoute allowedRoles={['transporter']}>
              <div>Transporter Profile Page</div>
            </ProtectedRoute>
          }
        />

        {}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div>Admin Dashboard (To be implemented)</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div>User Management Page</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div>Admin Orders Page</div>
            </ProtectedRoute>
          }
        />

        {}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
