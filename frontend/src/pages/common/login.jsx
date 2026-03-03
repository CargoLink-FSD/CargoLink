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
    // 2FA
    twoFAState,
    otpRefs,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitOtp,
    resendOtp,
    cancelTwoFA,
  } = useAuthLogin();

  // ─── 2FA OTP Verification Screen ───
  if (twoFAState.active) {
    return (
      <AuthLayout
        title="Verify Your Identity"
        subtitle={`Enter the 6-digit code sent to ${twoFAState.maskedEmail}`}
      >
        <div className="otp-verification">
          <div className="otp-icon">🔐</div>

          <div className="otp-inputs" onPaste={handleOtpPaste}>
            {twoFAState.otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (otpRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`otp-box ${digit ? 'filled' : ''}`}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                disabled={twoFAState.verifying}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <p className="otp-hint">Check your email inbox (and spam folder)</p>

          <div className="buttons">
            <Button
              type="button"
              variant="outline"
              onClick={cancelTwoFA}
              disabled={twoFAState.verifying}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={submitOtp}
              disabled={twoFAState.verifying || twoFAState.otp.join('').length !== 6}
              loading={twoFAState.verifying}
            >
              Verify & Login
            </Button>
          </div>

          <p className="resend-text">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="resend-btn"
              onClick={resendOtp}
              disabled={twoFAState.resending}
            >
              {twoFAState.resending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ─── Normal Login Form ───
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your account"
    >
      <form onSubmit={handleSubmit} id="login-form">
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