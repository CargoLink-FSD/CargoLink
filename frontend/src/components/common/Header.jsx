import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { useHeaderScroll, useMobileMenu } from '../../hooks/useHome';
import logo from '../../assets/images/logo.svg';
import '../../styles/layout.css';
import Modal from './Modal';

export default function Header() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const unreadCount = useSelector((state) => state.notifications?.unreadCount || 0);
  const userType = user?.role || user?.type;


  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  // Enable header scroll behavior
  useHeaderScroll();


  const openLoginModal = () => setIsModalOpen(true);
  const closeLoginModal = () => setIsModalOpen(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  const handleLinkClick = () => {
    closeMobileMenu();
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            <img src={logo} alt="CargoLink Logo" width="75" height="50" />
            <span>CargoLink</span>
          </Link>

          <nav className="nav-links">
            {!isAuthenticated && (
              <>
                <Link className="underline-link" to="/static/services" onClick={handleLinkClick}>Services</Link>
                <Link className="underline-link" to="/static/about" onClick={handleLinkClick}>About</Link>
                <Link className="underline-link" to="/static/contact" onClick={handleLinkClick}>Contact</Link>
                <button onClick={openLoginModal} className="btn btn-gradient-outline">Login</button>
              </>
            )}

            {isAuthenticated && userType === 'customer' && (
              <>
                <Link className="underline-link" to="/customer/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                <Link className="underline-link" to="/customer/orders" onClick={handleLinkClick}>My Orders</Link>
                <Link className="underline-link" to="/customer/place-order" onClick={handleLinkClick}>Place Order</Link>
                <Link className="underline-link" to="/customer/profile" onClick={handleLinkClick}>Profile</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Customer</span>
                  <div className="dropdown-content">
                    <Link to="/notifications" className="dropdown-link notification-link" onClick={handleLinkClick}>
                      Notifications
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <Link to="/support/tickets" className="dropdown-link" onClick={handleLinkClick}>Need Help?</Link>
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'transporter' && (
              <>
                <Link className="underline-link" to="/transporter/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                <Link className="underline-link" to="/transporter/my-bids" onClick={handleLinkClick}>My Bids</Link>
                <Link className="underline-link" to="/transporter/bid" onClick={handleLinkClick}>Place Bid</Link>
                <Link className="underline-link" to="/transporter/orders" onClick={handleLinkClick}>My Orders</Link>
                <Link className="underline-link" to="/transporter/trips" onClick={handleLinkClick}>Trips</Link>
                <Link className="underline-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} to="/transporter/wallet" onClick={handleLinkClick}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                  Wallet
                </Link>
                <Link className="underline-link" to="/transporter/fleet" onClick={handleLinkClick}>Manage Fleet</Link>
                <Link className="underline-link" to="/transporter/drivers" onClick={handleLinkClick}>Manage Drivers</Link>
                <Link className="underline-link" to="/transporter/profile" onClick={handleLinkClick}>Profile</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Transporter</span>
                  <div className="dropdown-content">
                    <Link to="/notifications" className="dropdown-link notification-link" onClick={handleLinkClick}>
                      Notifications
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <Link to="/support/tickets" className="dropdown-link" onClick={handleLinkClick}>Need Help?</Link>
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'driver' && (
              <>
                <Link className="underline-link" to="/driver/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                <Link className="underline-link" to="/driver/trips" onClick={handleLinkClick}>Trips</Link>
                <Link className="underline-link" to="/driver/schedule" onClick={handleLinkClick}>Schedule</Link>
                <Link className="underline-link" to="/driver/join-transporter" onClick={handleLinkClick}>Join Transporter</Link>
                <Link className="underline-link" to="/driver/profile" onClick={handleLinkClick}>Profile</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Driver</span>
                  <div className="dropdown-content">
                    <Link to="/notifications" className="dropdown-link notification-link" onClick={handleLinkClick}>
                      Notifications
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <Link to="/support/tickets" className="dropdown-link" onClick={handleLinkClick}>Need Help?</Link>
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'admin' && (
              <>
                <Link className="underline-link" to="/admin/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                <Link className="underline-link" to="/admin/users" onClick={handleLinkClick}>Users</Link>
                <Link className="underline-link" to="/admin/orders" onClick={handleLinkClick}>Orders</Link>
                <Link className="underline-link" to="/admin/fleet" onClick={handleLinkClick}>Fleet</Link>
                <Link className="underline-link" to="/admin/tickets" onClick={handleLinkClick}>Tickets</Link>
                <Link className="underline-link" to="/admin/managers" onClick={handleLinkClick}>Managers</Link>
                <Link className="underline-link" to="/admin/cashouts" onClick={handleLinkClick}>Cashouts</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Admin</span>
                  <div className="dropdown-content">
                    <Link to="/notifications" className="dropdown-link notification-link" onClick={handleLinkClick}>
                      Notifications
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'manager' && (
              <>
                <Link className="underline-link" to="/manager/dashboard" onClick={handleLinkClick}>Verification Queue</Link>
                <Link className="underline-link" to="/manager/support" onClick={handleLinkClick}>Support Tickets</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Manager</span>
                  <div className="dropdown-content">
                    <Link to="/notifications" className="dropdown-link notification-link" onClick={handleLinkClick}>
                      Notifications
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="mobile-menu-btn" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </header>

      <Modal isOpen={isModalOpen} onClose={closeLoginModal} size="large">
        <div className="login-options">
          <Link to="/login?type=customer" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Customer</h3>
            <p>Access your shipping dashboard and manage your cargo deliveries</p>
          </Link>

          <Link to="/login?type=transporter" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Transporter</h3>
            <p>Manage your fleet and access available shipping requests</p>
          </Link>

          <Link to="/login?type=driver" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Driver</h3>
            <p>Execute order shipment and manage trip schedule</p>
          </Link>
          <Link to="/login?type=admin" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Admin</h3>
            <p>Access administrative controls and manage platform settings.</p>
          </Link>

          <Link to="/manager/login" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Manager</h3>
            <p>Review and verify transporter documents for platform compliance.</p>
          </Link>
        </div>
      </Modal>
    </>
  );
}
