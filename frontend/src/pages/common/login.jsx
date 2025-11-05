import { Link } from 'react-router-dom';
import { useAuthLogin } from '../../hooks/auth/useAuthLogin';
import Alert, { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';
import AuthLayout from '../../components/auth/AuthLayout';
import { InputField, Checkbox, Button } from '../../components/forms';
import '../../styles/Login.css';


function Login() {
  const {
    formData,
    userType,
    showPassword,
    successMessage,
    authLoading,
    error,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    toggleShowPassword,
    navigate,
  } = useAuthLogin();

  return (
    <AuthLayout 
      title="Welcome Back"
      subtitle="Sign in to access your account"
    >
      {error && <Alert message={error} type="error" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      <form onSubmit={handleSubmit} id ="login-form">
        {/* Email Field */}
        <InputField
          type="email"
          id="email"
          name="email"
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email ? errors.email : ''}
          required
        />

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
              onBlur={handleBlur}
              required
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
          {touched.password && errors.password && (
            <span className="error-message">{errors.password}</span>
          )}
        </div>

        <div className="form-options">
          <Checkbox
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
            label="Remember me"
          />
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