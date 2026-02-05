import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { useTransporterSignup } from '../../hooks/auth/useTransporterSignup';
import { Button } from '../../components/forms';
import ProgressSteps from '../../components/forms/ProgressSteps';
import VehiclesEditor from '../../components/transporter/VehiclesEditor';
import { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';
import '../../components/forms/forms.css';
import '../../styles/Signup.css';

const stepConfigs = [
  [
    { type: 'text', name: 'name', label: 'Full Name', placeholder: 'Enter your full name', required: true },
    { type: 'tel', name: 'primary_contact', label: 'Primary Phone Number', placeholder: 'Enter your primary phone number', required: true },
    { type: 'tel', name: 'secondary_contact', label: 'Secondary Phone Number', placeholder: 'Enter your secondary phone number', required: true },
    { type: 'email', name: 'email', label: 'Email', placeholder: 'Enter your email', required: true },
  ],
  [
    { heading: 'Business Details' },
    { type: 'text', name: 'gst_in', label: 'GST Number', placeholder: 'Enter your GSTIN number', required: true, helpText: 'Format: 22AAAAA0000A1Z5' },
    { type: 'text', name: 'pan', label: 'PAN Number', placeholder: 'Enter your PAN number', required: true, helpText: 'Format: ABCDE1234F' },
    { heading: 'Address Details' },
    { type: 'text', name: 'street_address', label: 'Street Address', placeholder: 'Enter street address', required: true },
    { type: 'text', name: 'city', label: 'City', placeholder: 'Enter city', required: true },
    { type: 'text', name: 'state', label: 'State', placeholder: 'Enter state', required: true },
    { type: 'text', name: 'pin', label: 'PIN Code', placeholder: 'Enter PIN code', required: true },
  ],
];

const TransporterSignupForm = () => {
  const state = useTransporterSignup();
  const {
    handleSubmit,
    currentStep,
    totalSteps,
    showPassword,
    showConfirmPassword,
    loading,
    nextStep,
    prevStep,
    toggleShowPassword,
    toggleShowConfirmPassword,
    addVehicle,
    removeVehicle,
    vehicles,
    formData,
    errors,
    register,
    navigate,
  } = state;

  return (
    <AuthLayout
      title="Create Transporter Account"
      subtitle="Sign up to join CargoLink as a Transport Partner"
    >
      <ProgressSteps current={currentStep} total={totalSteps} />

      <form onSubmit={handleSubmit}>
        {[1, 2].includes(currentStep) && (
          <div className="form-step">
            {stepConfigs[currentStep - 1].map((field, idx) => {
              if (field.heading) {
                return <h3 key={`${currentStep}-${idx}`} className="form-section-title">{field.heading}</h3>;
              }

              const error = errors?.[field.name]?.message || '';

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
                  {field.helpText && <span className="help-text">{field.helpText}</span>}
                  {error && <span className="error-message">{error}</span>}
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
            <VehiclesEditor
              vehicles={vehicles}
              errors={errors}
              onRemove={removeVehicle}
              onAdd={addVehicle}
              register={register}
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
        Already have an account? <Link className="link" to="/login?type=transporter">Sign in</Link>
      </p>
    </AuthLayout>
  );
};

export default TransporterSignupForm;
