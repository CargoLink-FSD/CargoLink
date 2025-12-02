
//App Routes
//Defines all routes for customers, transporters, admins, and static pages


import { Routes, Route } from 'react-router-dom';
import Home from '../pages/common/Home';
import Login from '../pages/common/login';
import ForgotPassword from '../pages/common/ForgotPassword';
import NotFound from '../pages/common/NotFound';
import CustomerProfile from '../pages/customer/CustomerProfile';
import CustomerSignupForm from '../pages/customer/CustomerSignupForm';
import TransporterProfile from '../pages/transporter/TransporterProfile';
import TransporterSignupForm from '../pages/transporter/TransporterSignupForm';
import BidPage from '../pages/transporter/Bid';
import ProtectedRoute from './ProtectedRoute';
import CustomerOrders from '../pages/customer/CustomerOrders';
import OrderBids from '../pages/customer/OrderBids';
import PlaceOrder from '../pages/customer/PlaceOrder';
import TransporterOrders from '../pages/transporter/TransporterOrders';
import MyBidsPage from '../pages/transporter/MyBids';
import UserManagement from '../pages/admin/UserManagement';
import OrderManagement from '../pages/admin/OrderManagement';
import Dashboard from '../pages/admin/Dashboard';
import OrderDetails from '../pages/common/OrderDetails';

export default function AppRoutes() {
  const placeholderStyle = { padding: '2rem', fontSize: '1.25rem' };
  const placeholder = (label) => <div style={placeholderStyle}>{label}</div>;

  return (
    <Routes>

      {/* Public Routes */}
      
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="/signup" element={<CustomerSignupForm />} /> */}
      <Route path="/forgot-password" element={<ForgotPassword />} />


      {/* Static Pages */}

      
      <Route path="/static/about" element={placeholder('Static: About')} />
      <Route path="/static/services" element={placeholder('Static: Services')} />
      <Route path="/static/contact" element={placeholder('Static: Contact')} />
      <Route path="/static/terms" element={placeholder('Static: Terms of Service')} />
      <Route path="/static/privacy" element={placeholder('Static: Privacy Policy')} />
      <Route path="/static/careers" element={placeholder('Static: Careers')} />


      {/* Customer Routes */}

      
      <Route path="/customer/signup" element={<CustomerSignupForm />} />

      <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
        <Route path="/customer" element={<Home />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/place-order" element={<PlaceOrder />} />
        <Route path="/customer/paynow" element={placeholder('Customer Payment')} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/order/:orderId" element={<OrderDetails />} />
        <Route path="/customer/order/:orderId/bids" element={<OrderBids />} />
        <Route path="/customer/track/:id" element={placeholder('Customer Track Order')} />
      </Route>


      {/* Transporter Routes */}

      
      <Route path="/transporter/signup" element={<TransporterSignupForm />} />

      <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
        <Route path="/transporter" element={<Home />} />
        <Route path="/transporter/profile" element={<TransporterProfile />} />
        <Route path="/transporter/fleet" element={placeholder('Transporter Fleet')} />
        <Route path="/transporter/fleet/:vehicleId" element={placeholder('Transporter Fleet Details')} />
        <Route path="/transporter/orders" element={<TransporterOrders />} />
        <Route path="/transporter/orders/:orderId" element={<OrderDetails />} />
        <Route path="/transporter/orders/:orderId/track" element={placeholder('Transporter Track Order')} />
        <Route path="/transporter/bid" element={<BidPage />} />
        <Route path="/transporter/my-bids" element={<MyBidsPage />} />
        <Route path="/transporter/track/:id" element={placeholder('Transporter Track Order')} />
        <Route path="/transporter/assignment" element={placeholder('Assignment: Dashboard')} />
        <Route path="/transporter/assignment/order/:order_id" element={placeholder('Assignment: Order Detail')} />
        <Route path="/transporter/assignment/vehicles/available" element={placeholder('Assignment: Available Vehicles')} />
        <Route path="/transporter/assignment/vehicles/by-type" element={placeholder('Assignment: Vehicles By Type')} />
      </Route>


      {/* Admin Routes */}

      
      <Route path="/admin/login" element={placeholder('Admin Login')} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<Home />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/orders" element={<OrderManagement />} />
        <Route path="/admin/users" element={<UserManagement />} />
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
