import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import './ManagerLogin.css';

export default function ManagerLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError, showSuccess } = useNotification();
  const { loading } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showError('Please enter both email and password');
      return;
    }

    try {
      await dispatch(loginUser({ email, password, role: 'manager' })).unwrap();
      showSuccess('Login successful!');
      setTimeout(() => navigate('/manager/dashboard', { replace: true }), 500);
    } catch (err) {
      showError(err || 'Invalid manager credentials');
    }
  };

  return (
    <>
      <Header />
      <div className="manager-login-container">
        <div className="manager-login-card">
          <div className="manager-login-header">
            <div className="manager-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h1>Manager Portal</h1>
            <p>Sign in to manage document verification</p>
          </div>

          <form onSubmit={handleSubmit} className="manager-login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter manager email"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button type="submit" className="manager-login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.88rem', color: '#64748b' }}>
              Have an invitation code?{' '}
              <Link to="/manager/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
