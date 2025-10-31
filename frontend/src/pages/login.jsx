import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/authService';
import '../styles/Login.css';
import loginLeft from '../assets/images/login-left.avif';
import logo from '../assets/images/logo.svg';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, showNotification, isAuthenticated } = useAuth();
  
  // Get user type from URL query params (e.g., ?type=customer)
  const [userType, setUserType] = useState(searchParams.get('type') || 'customer');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle input field changes
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    if (!validateEmail(formData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);

    try {
      // Call login API
      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      }, userType);

      // If successful, update auth context with user data
      // Note: Backend should return user info, adjust this based on your API response
      const userData = {
        email: formData.email,
        type: userType,
        name: response.name || formData.email.split('@')[0],
        ...response.user, // Merge any additional user data from backend
      };

      login(userData);
      showNotification('Successfully logged in!', 'success');

      // Redirect based on user type
      setTimeout(() => {
        if (userType === 'customer') {
          navigate('/customer/dashboard');
        } else if (userType === 'transporter') {
          navigate('/transporter/dashboard');
        } else if (userType === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      showNotification(error.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-main-content">
      <div className="login-content">
        <div className="card-container">
          {/* Left Side - Branding */}
          <div className="left-side">
            <img src={loginLeft} alt="Login Background" />
            <div className="overlay">
              <img className="logo" src={logo} alt="Company Logo" />
              <div className="brand">CargoLink</div>
              <p className="tagline">Unified Logistics Platform</p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="right-side">
            <div className="login-form">
              <h1>Welcome Back</h1>
              <p className="subtitle">Sign in to access your account</p>


              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="form-group">
                  <label className="input-label" htmlFor="email">Email</label>
                  <input
                    className="input-field"
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="form-group">
                  <label className="input-label" htmlFor="password">Password</label>
                  <div className="password-container">
                    <input
                      className="input-field"
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <span 
                      className="toggle-password" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        // Eye Off Icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        // Eye Icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </span>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="form-options">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="link">Forgot password?</Link>
                </div>

                {/* Buttons */}
                <div className="buttons">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => navigate('/')}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>

              {/* Register Link */}
              <p className="register-text">
                Not a user?{' '}
                <Link className="link" to={`/signup?type=${userType}`}>
                  Register now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;