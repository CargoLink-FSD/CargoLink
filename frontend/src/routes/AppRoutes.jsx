
//App Routes
//Defines all routes for customers, transporters, admins, and static pages


import { Routes, Route } from 'react-router-dom';
import Home from '../pages/common/Home';
import Login from '../pages/common/login';
import Signup from '../pages/common/signup';
import ForgotPassword from '../pages/common/ForgotPassword';
import NotFound from '../pages/common/NotFound';
import ProtectedRoute from './ProtectedRoute';
import CustomerOrders from '../pages/customer/CustomerOrders';
import TransporterOrders from '../pages/transporter/TransporterOrders';

export default function AppRoutes() {
  const placeholderStyle = { padding: '2rem', fontSize: '1.25rem' };
  const placeholder = (label) => <div style={placeholderStyle}>{label}</div>;

  return (
    <Routes>

      {/* Public Routes */}
      
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />


      {/* Static Pages */}

      
      <Route path="/static/about" element={placeholder('Static: About')} />
      <Route path="/static/services" element={placeholder('Static: Services')} />
      <Route path="/static/contact" element={placeholder('Static: Contact')} />
      <Route path="/static/terms" element={placeholder('Static: Terms of Service')} />
      <Route path="/static/privacy" element={placeholder('Static: Privacy Policy')} />
      <Route path="/static/careers" element={placeholder('Static: Careers')} />


      {/* Customer Routes */}

      
      <Route path="/customer/login" element={placeholder('Customer Login')} />
      <Route path="/customer/signup" element={placeholder('Customer Signup')} />

      <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
        <Route path="/customer" element={<Home />} />
        <Route path="/customer/profile" element={placeholder('Customer Profile')} />
        <Route path="/customer/place-order" element={placeholder('Customer Place Order')} />
        <Route path="/customer/paynow" element={placeholder('Customer Payment')} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/order/:orderId" element={placeholder('Customer Order Details')} />
        <Route path="/customer/order/:orderId/bids" element={placeholder('Customer Order Bids')} />
        <Route path="/customer/track/:id" element={placeholder('Customer Track Order')} />
      </Route>


      {/* Transporter Routes */}

      
      <Route path="/transporter/login" element={placeholder('Transporter Login')} />
      <Route path="/transporter/signup" element={placeholder('Transporter Signup')} />

      <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
        <Route path="/transporter" element={<Home />} />
        <Route path="/transporter/profile" element={placeholder('Transporter Profile')} />
        <Route path="/transporter/fleet" element={placeholder('Transporter Fleet')} />
        <Route path="/transporter/fleet/:vehicleId" element={placeholder('Transporter Fleet Details')} />
        <Route path="/transporter/orders" element={<TransporterOrders />} />
        <Route path="/transporter/order/:orderId" element={placeholder('Transporter Order Details')} />
        <Route path="/transporter/orders/:orderId/track" element={placeholder('Transporter Track Order')} />
        <Route path="/transporter/bid" element={placeholder('Transporter Bid Page')} />
        <Route path="/transporter/my-bids" element={placeholder('Transporter My Bids')} />
        <Route path="/transporter/track/:id" element={placeholder('Transporter Track Order')} />
        <Route path="/transporter/assignment" element={placeholder('Assignment: Dashboard')} />
        <Route path="/transporter/assignment/order/:order_id" element={placeholder('Assignment: Order Detail')} />
        <Route path="/transporter/assignment/vehicles/available" element={placeholder('Assignment: Available Vehicles')} />
        <Route path="/transporter/assignment/vehicles/by-type" element={placeholder('Assignment: Vehicles By Type')} />
      </Route>


      {/* Admin Routes */}

      
      <Route path="/admin/login" element={placeholder('Admin Login')} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={placeholder('Admin Dashboard')} />
        <Route path="/admin/dashboard" element={placeholder('Admin Dashboard')} />
        <Route path="/admin/orders" element={placeholder('Admin Orders')} />
        <Route path="/admin/users" element={placeholder('Admin Users')} />
      </Route>


      {/* Shared Routes */}

      
      <Route element={<ProtectedRoute allowedRoles={['customer', 'transporter']} />}>
        <Route path="/chat/orders/:orderId" element={placeholder('Chat: Order Conversation')} />
      </Route>


      {/* 404 Fallback */}

      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
