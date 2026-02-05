import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthLogin } from '../../hooks/auth/useAuthLogin';
import { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';
import AuthLayout from '../../components/auth/AuthLayout';
import { Button } from '../../components/forms';
import '../../styles/Login.css';


function Login() {
  const {
    formData,
    userType,
    showPassword,
    authLoading,
    errors,
    register,
    handleSubmit,
    toggleShowPassword,
    navigate,
    handleGoogleLogin,
    handleGoogleError,
  } = useAuthLogin();

  return (
    <AuthLayout 
      title="Welcome Back"
      subtitle="Sign in to access your account"
    >
      <form onSubmit={handleSubmit} id ="login-form">
        <div className="form-group">
          <label className="input-label" htmlFor="email">Email *</label>
          <input
            className="input-field"
            type="email"
            id="email"
            placeholder="Enter your email"
            value={formData.email || ''}
            {...register('email')}
          />
          {errors.email && <span className="error-message">{errors.email.message}</span>}
        </div>

        <div className="form-group">
          <label className="input-label" htmlFor="password">Password *</label>
          <div className="password-container">
            <input
              className="input-field"
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Enter your password"
              value={formData.password || ''}
              {...register('password')}
            />
            <span 
              className="toggle-password" 
              onClick={toggleShowPassword}
              role="button"
              tabIndex="0"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </span>
          </div>
          {errors.password && <span className="error-message">{errors.password.message}</span>}
        </div>

        <div className="form-options">
          <Link to={`/forgot-password?type=${userType}`} className="link">Forgot password?</Link>
        </div>

        {/* Buttons */}
        <div className="buttons">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={authLoading}
            loading={authLoading}
          >
            Sign In
          </Button>
        </div>
      </form>

      {/* Google OAuth Button */}
      <div className="oauth-divider">
        <span>OR</span>
      </div>
      
      <div className="google-login-container">
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={handleGoogleError}
          text="continue_with"
          size="large"
          width="100%"
        />
      </div>

      <p className="register-text">
        Not a user?{' '}
        <Link
          className="link"
          to={userType === 'transporter' ? '/transporter/signup' : '/customer/signup'}
        >
          Register now
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;