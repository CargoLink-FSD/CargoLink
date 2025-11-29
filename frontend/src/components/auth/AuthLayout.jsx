import PropTypes from 'prop-types';
import loginLeft from '../../assets/images/login-left.avif';
import logo from '../../assets/images/logo.svg';

// Auth layout component with left side branding and right side form area
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="login-main-content">
      <div className="login-content">
        <div className="card-container">
          <div className="left-side">
            <img src={loginLeft} alt="Login Background" />
            <div className="overlay">
              <img className="logo" src={logo} alt="Company Logo" />
              <div className="brand">CargoLink</div>
              <p className="tagline">Unified Logistics Platform</p>
            </div>
          </div>

          {/* Right Side - Form Area */}
          <div className="right-side">
            <div className="login-form">
              <h1>{title}</h1>
              <p className="subtitle">{subtitle}</p>
              
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default AuthLayout;
