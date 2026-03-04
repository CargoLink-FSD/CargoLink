
//App Routes
//Defines all routes for customers, transporters, admins, and static pages


import { Routes, Route } from 'react-router-dom';
import Home from '../pages/common/Home';
import Login from '../pages/common/login';
import ForgotPassword from '../pages/common/ForgotPassword';
import NotFound from '../pages/common/NotFound';
import ProtectedRoute from './ProtectedRoute';

import CustomerSignupForm from '../pages/customer/CustomerSignupForm';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerProfile from '../pages/customer/CustomerProfile';

import CustomerOrders from '../pages/customer/CustomerOrders';
import OrderBids from '../pages/customer/OrderBids';
import PlaceOrder from '../pages/customer/PlaceOrder';
import PayNow from '../pages/customer/PayNow';
import TrackOrder from '../pages/TrackOrder'
import OrderDetails from '../pages/common/OrderDetails';

import TransporterSignupForm from '../pages/transporter/TransporterSignupForm';
import TransporterDashboard from '../pages/transporter/TransporterDashboard';
import TransporterProfile from '../pages/transporter/TransporterProfile';

import TransporterOrders from '../pages/transporter/TransporterOrders';
import MyBidsPage from '../pages/transporter/MyBids';
import BidPage from '../pages/transporter/Bid';
import FleetManagement from '../pages/transporter/FleetManagement';
import VehicleDetails from '../pages/transporter/VehicleDetails';
import DriverManagement from '../pages/transporter/DriverManagement';
import TripPlanner from '../pages/transporter/TripPlanner';
import TripManagement from '../pages/transporter/TripManagement';
import TripInfo from '../pages/transporter/TripInfo';

import DriverSignupForm from '../pages/driver/DriverSignupForm';
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverProfile from '../pages/driver/DriverProfile';
import DriverSchedule from '../pages/driver/DriverSchedule';
import DriverTrips from '../pages/driver/DriverTrips';
import JoinTransporter from '../pages/driver/JoinTransporter';
import ActiveTrip from '../pages/driver/ActiveTrip';

import QuoteBuilder from '../pages/transporter/QuoteBuilder';
import About from '../pages/static/About';
import Services from '../pages/static/Services';
import Contact from '../pages/static/Contact';
import Careers from '../pages/static/Careers';
import Terms from '../pages/static/Terms';
import Privacy from '../pages/static/Privacy';

import UserManagement from '../pages/admin/UserManagement';
import OrderManagement from '../pages/admin/OrderManagement';
import Dashboard from '../pages/admin/Dashboard';

import FleetOverview from '../pages/admin/FleetOverview';
import TicketsOverview from '../pages/admin/TicketsOverview';



import ManagerLogin from '../pages/manager/ManagerLogin';
import ManagerRegister from '../pages/manager/ManagerRegister';
import ManagerDashboard from '../pages/manager/ManagerDashboard';
import ManagerSupport from '../pages/manager/ManagerSupport';
import ManagerManagement from '../pages/admin/ManagerManagement';
import SupportTickets from '../pages/support/SupportTickets';
import TicketDetail from '../pages/support/TicketDetail';

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


      <Route path="/static/about" element={<About />} />
      <Route path="/static/services" element={<Services />} />
      <Route path="/static/contact" element={<Contact />} />
      <Route path="/static/terms" element={<Terms />} />
      <Route path="/static/privacy" element={<Privacy />} />
      <Route path="/static/careers" element={<Careers />} />


      {/* Customer Routes */}
      
      <Route path="/customer/signup" element={<CustomerSignupForm />} />

      <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
        <Route path="/customer" element={<Home />} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
        <Route path="/customer/place-order" element={<PlaceOrder />} />
        <Route path="/customer/paynow" element={<PayNow />} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/orders/:orderId" element={<OrderDetails />} />
        <Route path="/customer/order/:orderId/bids" element={<OrderBids />} />
        <Route path="/customer/orders/:orderId/track" element={<TrackOrder />} />
      </Route>


      {/* Transporter Routes */}
      
      <Route path="/transporter/signup" element={<TransporterSignupForm />} />

      <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
        <Route path="/transporter" element={<Home />} />
        <Route path="/transporter/dashboard" element={<TransporterDashboard />} />
        <Route path="/transporter/profile" element={<TransporterProfile />} />
        <Route path="/transporter/fleet" element={<FleetManagement />} />
        <Route path="/transporter/fleet/:vehicleId" element={<VehicleDetails />} />
        <Route path="/transporter/orders" element={<TransporterOrders />} />
        <Route path="/transporter/orders/:orderId" element={<OrderDetails />} />
        <Route path="/transporter/orders/:orderId/track" element={<TrackOrder />} />
        <Route path="/transporter/bid" element={<BidPage />} />
        <Route path="/transporter/orders/:orderId/quote" element={<QuoteBuilder />} />
        <Route path="/transporter/my-bids" element={<MyBidsPage />} />
        <Route path="/transporter/drivers" element={<DriverManagement />} />
        <Route path="/transporter/trips" element={<TripManagement />} />
        <Route path="/transporter/trips/create" element={<TripPlanner />} />
        <Route path="/transporter/trips/:tripId" element={<TripInfo />} />
      </Route>


      {/* Driver Routes */}

      <Route path="/driver/signup" element={<DriverSignupForm />} />

      <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
        <Route path="/driver" element={<Home />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/profile" element={<DriverProfile />} />
        <Route path="/driver/join-transporter" element={<JoinTransporter />} />
        <Route path="/driver/trips" element={<DriverTrips />} />
        <Route path="/driver/trips/:tripId" element={<ActiveTrip />} />
        <Route path="/driver/schedule" element={<DriverSchedule />} />
      </Route>

     
      {/* Manager Routes */}


      {/* Admin Routes */}
      
      <Route path="/admin/login" element={placeholder('Admin Login')} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/orders" element={<OrderManagement />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/fleet" element={<FleetOverview />} />
        <Route path="/admin/tickets" element={<TicketsOverview />} />
        <Route path="/admin/managers" element={<ManagerManagement />} />
      </Route>


      {/* Manager Routes */}


      <Route path="/manager/login" element={<ManagerLogin />} />
      <Route path="/manager/register" element={<ManagerRegister />} />

      <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/support" element={<ManagerSupport />} />
      </Route>


      {/* Shared Routes */}


      <Route element={<ProtectedRoute allowedRoles={['customer', 'transporter', 'driver']} />}>
        <Route path="/chat/orders/:orderId" element={placeholder('Chat: Order Conversation')} />
        <Route path="/support/tickets" element={<SupportTickets />} />
        <Route path="/support/tickets/:id" element={<TicketDetail />} />
      </Route>


      {/* 404 Fallback */}


      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
