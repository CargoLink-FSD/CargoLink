import React from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Lock } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import { useDriverSignup } from '../../hooks/auth/useDriverSignup';
import { Button } from '../../components/forms';
import ProgressSteps from '../../components/forms/ProgressSteps';
import { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';
import DriverDocumentUploadStep from '../../components/driver/DriverDocumentUploadStep';
import '../../components/forms/forms.css';
import '../../styles/Signup.css';

const stepConfigs = [
  [
    { label: 'First Name', type: 'text', name: 'firstName', placeholder: 'Enter your first name', required: true },
    { label: 'Last Name', type: 'text', name: 'lastName', placeholder: 'Enter your last name', required: true },
    { label: 'Gender', type: 'select', name: 'gender', placeholder: 'Select your gender', required: true, options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }] },
    { label: 'Email', type: 'email', name: 'email', placeholder: 'Enter your email', required: true, showGoogleButton: true },
  ],
  [
    { label: 'Phone Number', type: 'tel', name: 'phone', placeholder: 'Enter your phone number', required: true },
    { label: 'License Number', type: 'text', name: 'licenseNumber', placeholder: 'Enter your license number', required: true },
    { label: 'Street Address', type: 'text', name: 'address', placeholder: 'Enter your street address', required: true },
    { label: 'City', type: 'text', name: 'city', placeholder: 'Enter your city', required: true },
    { label: 'State', type: 'text', name: 'state', placeholder: 'Enter your state', required: true },
    { label: 'PIN Code', type: 'text', name: 'pin', placeholder: 'Enter your PIN code', required: true },
  ],
];

const DriverSignupForm = () => {
  const state = useDriverSignup();
  const {
    handleSubmit,
    currentStep,
    totalSteps,
    showPassword,
    showConfirmPassword,
    formData,
    errors,
    loading,
    nextStep,
    prevStep,
    toggleShowPassword,
    toggleShowConfirmPassword,
    register,
    navigate,
    handleGoogleSignup,
    handleGoogleError,
    documentFiles,
    setDocumentFiles,
    documentErrors,
    setDocumentErrors,
    signupOtpState,
    otpRefs,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitSignupOtp,
    resendSignupOtp,
    cancelSignupOtp,
  } = state;

  if (signupOtpState.active) {
    return (
      <AuthLayout
        title="Verify Your Email"
        subtitle={`Enter the 6-digit code sent to ${signupOtpState.maskedEmail}`}
      >
        <div className="otp-verification">
          <div className="otp-icon" aria-hidden="true">
            <Lock size={40} />
          </div>

          <div className="otp-inputs" onPaste={handleOtpPaste}>
            {signupOtpState.otp.map((digit, idx) => (
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
                disabled={signupOtpState.verifying}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <p className="otp-hint">Check your email inbox (and spam folder)</p>

          <div className="buttons">
            <Button
              type="button"
              variant="outline"
              onClick={cancelSignupOtp}
              disabled={signupOtpState.verifying}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={submitSignupOtp}
              disabled={signupOtpState.verifying || signupOtpState.otp.join('').length !== 6}
              loading={signupOtpState.verifying}
            >
              Verify & Create Account
            </Button>
          </div>

          <p className="resend-text">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="resend-btn"
              onClick={resendSignupOtp}
              disabled={signupOtpState.resending}
            >
              {signupOtpState.resending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Sign up to join CargoLink as a Driver"
    >
      <ProgressSteps current={currentStep} total={totalSteps} />

      <form onSubmit={handleSubmit}>
        {[1, 2].includes(currentStep) && (
          <div className="form-step">
            {stepConfigs[currentStep - 1].map((field, idx) => {
              const error = errors?.[field.name]?.message || '';

              if (field.type === 'select') {
                return (
                  <div key={`${currentStep}-${idx}`} className="form-group">
                    <label className="input-label" htmlFor={field.name}>
                      {field.label} {field.required && '*'}
                    </label>
                    <select
                      className="input-field"
                      id={field.name}
                      value={formData[field.name] || ''}
                      {...register(field.name)}
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {error && <span className="error-message">{error}</span>}
                  </div>
                );
              }

              return (
                <div key={`${currentStep}-${idx}`} className="form-group">
                  <label className="input-label" htmlFor={field.name}>
                    {field.label} {field.required && '*'}
                  </label>
                  <input
                    className="input-field"
                    type={field.type}
                    id={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    {...register(field.name)}
                  />
                  {error && <span className="error-message">{error}</span>}

                  {/* Google OAuth button for email field */}
                  {field.showGoogleButton && currentStep === 1 && (
                    <>
                      <div className="oauth-divider-small">
                        <span>OR</span>
                      </div>
                      <div className="google-signup-container">
                        <GoogleLogin
                          onSuccess={handleGoogleSignup}
                          onError={handleGoogleError}
                          text="continue_with"
                          size="medium"
                          width="100%"
                        />
                        <p className="google-help-text">Get email from Google</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="buttons">
              {currentStep === 1 ? (
                <Button type="button" variant="outline" onClick={() => navigate('/')}>Back</Button>
              ) : (
                <Button type="button" variant="outline" onClick={prevStep}>Previous</Button>
              )}
              <Button type="button" variant="primary" onClick={nextStep}>Next</Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="form-step">
            <DriverDocumentUploadStep
              documentFiles={documentFiles}
              setDocumentFiles={setDocumentFiles}
              documentErrors={documentErrors}
              setDocumentErrors={setDocumentErrors}
            />
            <div className="buttons">
              <Button type="button" variant="outline" onClick={prevStep}>Previous</Button>
              <Button type="button" variant="primary" onClick={nextStep}>Next</Button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="form-step">
            <div className="form-group">
              <label className="input-label" htmlFor="password">Password *</label>
              <div className="password-container">
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Create a password"
                  value={formData.password || ''}
                  {...register('password')}
                />
                <span className="toggle-password" onClick={toggleShowPassword} role="button" tabIndex="0" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
              {errors.password && <span className="error-message">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label className="input-label" htmlFor="confirmPassword">Confirm Password *</label>
              <div className="password-container">
                <input
                  className="input-field"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword || ''}
                  {...register('confirmPassword')}
                />
                <span className="toggle-password" onClick={toggleShowConfirmPassword} role="button" tabIndex="0" aria-label="Toggle confirm password visibility">
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword.message}</span>}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.terms || false}
                  {...register('terms')}
                />
                <span>
                  I agree to the{' '}
                  <Link to="/static/terms" className="link">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/static/privacy" className="link">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <span className="error-message">{errors.terms.message}</span>}
            </div>

            <div className="buttons">
              <Button type="button" variant="outline" onClick={prevStep}>Previous</Button>
              <Button type="submit" variant="primary" disabled={loading} loading={loading}>Create Account</Button>
            </div>
          </div>
        )}
      </form>

      <p className="login-text">
        Already have an account? <Link className="link" to="/login?type=driver">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default DriverSignupForm;
