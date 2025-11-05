import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHeaderScroll } from '../../hooks/home/useHeaderScroll';
import { useMobileMenu } from '../../hooks/home/useMobileMenu';
import logo from '../../assets/images/logo.svg';
import '../../styles/layout.css';
import Modal from './Modal';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const userType = user?.role || user?.type;

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();
  
  // Enable header scroll behavior
  useHeaderScroll();
  

  const openLoginModal = () => setIsModalOpen(true);
  const closeLoginModal = () => setIsModalOpen(false);

  const handleLogout = async () => {
    await logout();
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
                <Link className="underline-link" to="/customer/orders" onClick={handleLinkClick}>My Orders</Link>
                <Link className="underline-link" to="/customer/place-order" onClick={handleLinkClick}>Place Order</Link>
                <Link className="underline-link" to="/customer/profile" onClick={handleLinkClick}>Profile</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Customer</span>
                  <div className="dropdown-content">
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'transporter' && (
              <>
                <Link className="underline-link" to="/transporter/my-bids" onClick={handleLinkClick}>My Bids</Link>
                <Link className="underline-link" to="/transporter/bid" onClick={handleLinkClick}>Place Bid</Link>
                <Link className="underline-link" to="/transporter/orders" onClick={handleLinkClick}>My Orders</Link>
                <Link className="underline-link" to="/transporter/fleet" onClick={handleLinkClick}>Manage Fleet</Link>
                <Link className="underline-link" to="/transporter/profile" onClick={handleLinkClick}>Profile</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Transporter</span>
                  <div className="dropdown-content">
                    <button onClick={handleLogout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {isAuthenticated && userType === 'admin' && (
              <>
                <Link className="underline-link" to="/admin/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                <Link className="underline-link" to="/admin/users" onClick={handleLinkClick}>User Management</Link>
                <Link className="underline-link" to="/admin/orders" onClick={handleLinkClick}>Orders List</Link>
                <div className="profile-dropdown">
                  <span className="profile-name">Admin</span>
                  <div className="dropdown-content">
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

          <Link to="/login?type=admin" className="login-card" onClick={() => { closeLoginModal(); handleLinkClick(); }}>
            <h3>Login as Admin</h3>
            <p>Access administrative controls and manage platform settings.</p>
          </Link>
        </div>
      </Modal>
    </>
  );
}
