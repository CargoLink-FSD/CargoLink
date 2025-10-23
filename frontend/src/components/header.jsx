import { useState } from 'react';
import { useUser } from '../context/userContext';

export default function Header() {
  const { userType, setUserType } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openLoginModal = () => setIsModalOpen(true);
  const closeLoginModal = () => setIsModalOpen(false);

  const logout = () => {
    setUserType(null);
    // You can later clear localStorage or call logout API
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <a href="/" className="logo">
            <img src="/img/logo.svg" alt="CargoLink Logo" width="75" height="50" />
            <span>CargoLink</span>
          </a>

          <nav className="nav-links">
            {!userType && (
              <>
                <a className="underline-link" href="/static/services">Services</a>
                <a className="underline-link" href="/static/about">About</a>
                <a className="underline-link" href="/static/contact">Contact</a>
                <button onClick={openLoginModal} className="btn btn-gradient-outline">Login</button>
              </>
            )}

            {userType === 'customer' && (
              <>
                <a className="underline-link" href="/customer/orders">My Orders</a>
                <a className="underline-link" href="/customer/place-order">Place Order</a>
                <a className="underline-link" href="/customer/profile">Profile</a>
                <div className="profile-dropdown">
                  <span className="profile-name">{userType}</span>
                  <div className="dropdown-content">
                    <button onClick={logout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {userType === 'transporter' && (
              <>
                <a className="underline-link" href="/transporter/my-bids">My Bids</a>
                <a className="underline-link" href="/transporter/bid">Place Bid</a>
                <a className="underline-link" href="/transporter/orders">My Orders</a>
                <a className="underline-link" href="/transporter/fleet">Manage Fleet</a>
                <a className="underline-link" href="/transporter/profile">Profile</a>
                <div className="profile-dropdown">
                  <span className="profile-name">{userType}</span>
                  <div className="dropdown-content">
                    <button onClick={logout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}

            {userType === 'admin' && (
              <>
                <a className="underline-link" href="/admin/dashboard">Dashboard</a>
                <a className="underline-link" href="/admin/users">User Management</a>
                <a className="underline-link" href="/admin/orders">Orders List</a>
                <div className="profile-dropdown">
                  <span className="profile-name">{userType}</span>
                  <div className="dropdown-content">
                    <button onClick={logout} className="logout-link">Logout</button>
                  </div>
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Login Modal */}
      {isModalOpen && (
        <div id="login-modal" className="modal-overlay" onClick={closeLoginModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeLoginModal}>
              &times;
            </button>

            <div className="login-options">
              <a href="/customer/login" className="login-card">
                <h3>Login as Customer</h3>
                <p>Access your shipping dashboard and manage your cargo deliveries</p>
              </a>

              <a href="/transporter/login" className="login-card">
                <h3>Login as Transporter</h3>
                <p>Manage your fleet and access available shipping requests</p>
              </a>

              <a href="/admin/login" className="login-card">
                <h3>Login as Admin</h3>
                <p>Access administrative controls and manage platform settings.</p>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
