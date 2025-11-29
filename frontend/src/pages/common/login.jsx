import { Link } from 'react-router-dom';
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
          <div className="remember-me">
            <input
              type="checkbox"
              id="rememberMe"
              checked={formData.rememberMe || false}
              {...register('rememberMe')}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
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

      <p className="register-text">
        Not a user?{' '}
        <Link className="link" to={`/signup?type=${userType}`}>
          Register now
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;