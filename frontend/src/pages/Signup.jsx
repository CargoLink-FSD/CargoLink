import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupUser } from '../services/authService';
import '../styles/Signup.css';
import loginLeft from '../assets/images/login-left.avif';
import logo from '../assets/images/logo.svg';
/**
 * Signup Component
 * Multi-step registration form for customers and transporters
 */
function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, showNotification, isAuthenticated } = useAuth();
  
  // Get user type from URL query params
  const userType = searchParams.get('type') || 'customer';
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    phone: '',
    email: '',
    dob: '',
    street_address: '',
    city: '',
    state: '',
    pin: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
   * Validate phone number format
   */
  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  /**
   * Validate PIN code format
   */
  const validatePIN = (pin) => {
    if (!pin) return true; // Optional field
    const pinRegex = /^\d{6}$/;
    return pinRegex.test(pin);
  };

  /**
   * Validate current step before proceeding
   */
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.gender) {
          showNotification('Please fill in all required fields', 'error');
          return false;
        }
        return true;

      case 2:
        if (!formData.phone || !formData.email || !formData.dob) {
          showNotification('Please fill in all required fields', 'error');
          return false;
        }
        if (!validateEmail(formData.email)) {
          showNotification('Please enter a valid email address', 'error');
          return false;
        }
        if (!validatePhone(formData.phone)) {
          showNotification('Please enter a valid 10-digit phone number', 'error');
          return false;
        }
        return true;

      case 3:
        if (!validatePIN(formData.pin)) {
          showNotification('PIN code must be 6 digits', 'error');
          return false;
        }
        return true;

      case 4:
        if (!formData.password || !formData.confirmPassword) {
          showNotification('Please fill in all password fields', 'error');
          return false;
        }
        if (formData.password.length < 6) {
          showNotification('Password must be at least 6 characters long', 'error');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          showNotification('Passwords do not match', 'error');
          return false;
        }
        if (!formData.terms) {
          showNotification('You must agree to the Terms and Privacy Policy', 'error');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  /**
   * Navigate to next step
   */
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  /**
   * Navigate to previous step
   */
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const signupData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        dob: formData.dob,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: {
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          pin: formData.pin,
        },
      };

      // Call signup API
      const response = await signupUser(signupData, userType);

      showNotification('Registration successful!', 'success');

      // Auto-login after successful signup
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        type: userType,
        ...response.user,
      };

      login(userData);

      // Redirect based on user type
      setTimeout(() => {
        if (userType === 'customer') {
          navigate('/customer/dashboard');
        } else if (userType === 'transporter') {
          navigate('/transporter/dashboard');
        } else {
          navigate('/');
        }
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      showNotification(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="signup-content">
        <div className="card-container">
          {/* Left Side - Branding */}
          <div className="left-side">
            <img src={loginLeft} alt="Signup Background" />
            <div className="overlay">
              <img className="logo" src={logo} alt="Company Logo" />
              <div className="brand">CargoLink</div>
              <p className="tagline">Unified Logistics Platform</p>
            </div>
          </div>

          {/* Right Side - Signup Form */}
          <div className="right-side">
            <div className="signup-form">
              <h1>Create Account</h1>
              <p className="subtitle">
                Sign up to join CargoLink as {userType === 'customer' ? 'a Customer' : 'a Transporter'}
              </p>

              {/* Progress Steps */}
              <div className="progress-container">
                {[1, 2, 3, 4].map((step, index) => (
                  <div key={step}>
                    <div
                      className={`progress-step ${
                        currentStep === step ? 'active' : ''
                      } ${currentStep > step ? 'completed' : ''}`}
                    >
                      {step}
                    </div>
                    {index < 3 && (
                      <div
                        className={`progress-line ${
                          currentStep > step ? 'active' : ''
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <div className="form-step">
                    <div className="form-group">
                      <label className="input-label" htmlFor="firstName">First Name</label>
                      <input
                        className="input-field"
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Enter your first name"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="lastName">Last Name</label>
                      <input
                        className="input-field"
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Enter your last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="gender">Gender</label>
                      <select
                        className="input-field"
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>Select your gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="buttons">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate('/')}
                      >
                        Back
                      </button>
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Contact Info */}
                {currentStep === 2 && (
                  <div className="form-step">
                    <div className="form-group">
                      <label className="input-label" htmlFor="phone">Phone Number</label>
                      <input
                        className="input-field"
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>

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

                    <div className="form-group">
                      <label className="input-label" htmlFor="dob">Date of Birth</label>
                      <input
                        className="input-field"
                        type="date"
                        id="dob"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="buttons">
                      <button type="button" className="btn btn-outline" onClick={prevStep}>
                        Previous
                      </button>
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Address */}
                {currentStep === 3 && (
                  <div className="form-step">
                    <div className="form-group">
                      <label className="input-label" htmlFor="street_address">Street Address</label>
                      <input
                        className="input-field"
                        type="text"
                        id="street_address"
                        name="street_address"
                        placeholder="Enter your street address"
                        value={formData.street_address}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="city">City</label>
                      <input
                        className="input-field"
                        type="text"
                        id="city"
                        name="city"
                        placeholder="Enter your city"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="state">State</label>
                      <input
                        className="input-field"
                        type="text"
                        id="state"
                        name="state"
                        placeholder="Enter your state"
                        value={formData.state}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="pin">PIN Code</label>
                      <input
                        className="input-field"
                        type="text"
                        id="pin"
                        name="pin"
                        placeholder="Enter your PIN code"
                        value={formData.pin}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="buttons">
                      <button type="button" className="btn btn-outline" onClick={prevStep}>
                        Previous
                      </button>
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Password */}
                {currentStep === 4 && (
                  <div className="form-step">
                    <div className="form-group">
                      <label className="input-label" htmlFor="password">Password</label>
                      <div className="password-container">
                        <input
                          className="input-field"
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          placeholder="Create a password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <span
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
                      <div className="password-container">
                        <input
                          className="input-field"
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <span
                          className="toggle-password"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="terms-checkbox">
                        <input
                          type="checkbox"
                          name="terms"
                          checked={formData.terms}
                          onChange={handleChange}
                          required
                        />
                        I agree to the{' '}
                        <Link to="/static/terms" className="link">Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/static/privacy" className="link">Privacy Policy</Link>
                      </label>
                    </div>

                    <div className="buttons">
                      <button type="button" className="btn btn-outline" onClick={prevStep}>
                        Previous
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* Login Link */}
              <p className="login-text">
                Already have an account?{' '}
                <Link className="link" to={`/login?type=${userType}`}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
