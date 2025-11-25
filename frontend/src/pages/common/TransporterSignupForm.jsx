import React from 'react';
import { Link } from 'react-router-dom';
import { InputField, Button, Checkbox } from '../../components/forms';
import ProgressSteps from '../../components/forms/ProgressSteps';
import VehiclesEditor from '../../components/transporter/VehiclesEditor';
import { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';

const stepConfigs = [
  [
    { component: 'InputField', props: { type: 'text', name: 'name', label: 'Full Name', placeholder: 'Enter your full name', required: true } },
    { component: 'InputField', props: { type: 'tel', name: 'primary_contact', label: 'Primary Phone Number', placeholder: 'Enter your primary phone number', required: true } },
    { component: 'InputField', props: { type: 'tel', name: 'secondary_contact', label: 'Secondary Phone Number', placeholder: 'Enter your secondary phone number (optional)', helpText: 'Optional: Alternative contact number' } },
    { component: 'InputField', props: { type: 'email', name: 'email', label: 'Email', placeholder: 'Enter your email', required: true } },
  ],
  [
    { heading: 'Business Details' },
    { component: 'InputField', props: { type: 'text', name: 'gst_in', label: 'GST Number', placeholder: 'Enter your GSTIN number', required: true, helpText: 'Format: 22AAAAA0000A1Z5' } },
    { component: 'InputField', props: { type: 'text', name: 'pan', label: 'PAN Number', placeholder: 'Enter your PAN number', required: true, helpText: 'Format: ABCDE1234F' } },
    { heading: 'Address Details' },
    { component: 'InputField', props: { type: 'text', name: 'street_address', label: 'Street Address', placeholder: 'Enter street address', required: true } },
    { component: 'InputField', props: { type: 'text', name: 'city', label: 'City', placeholder: 'Enter city', required: true } },
    { component: 'InputField', props: { type: 'text', name: 'state', label: 'State', placeholder: 'Enter state', required: true } },
    { component: 'InputField', props: { type: 'text', name: 'pin', label: 'PIN Code', placeholder: 'Enter PIN code', required: true } },
  ],
];

const getError = (errors, name) => errors?.[name] || '';

const FieldRenderer = ({ def, formData, errors, onChange }) => {
  if (def.heading) {
    return <h3 className="form-section-title">{def.heading}</h3>;
  }

  const { component, props } = def;
  const name = props.name;
  const error = getError(errors, name);

  if (component === 'InputField') {
    return (
      <InputField
        {...props}
        name={name}
        value={formData[name] ?? ''}
        onChange={onChange}
        error={error}
      />
    );
  }

  return null;
};

const TransporterSignupForm = ({ state }) => {
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
    handleChange,
    handleVehicleChange,
    navigate,
  } = state;

  const passwordField = { name: 'password' };
  const confirmPasswordField = { name: 'confirmPassword' };

  return (
    <>
      <ProgressSteps current={currentStep} total={totalSteps} />

  <form onSubmit={handleSubmit}>
        {[1, 2].includes(currentStep) && (
          <div className="form-step">
            {stepConfigs[currentStep - 1].map((def, idx) => (
              <FieldRenderer key={`${currentStep}-${idx}`} def={def} formData={formData} errors={errors} onChange={handleChange} />
            ))}

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
              onFieldChange={handleVehicleChange}
              onRemove={removeVehicle}
              onAdd={addVehicle}
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
              <label className="input-label" htmlFor="password">Password</label>
              <div className="password-container">
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Create a password"
                  name={passwordField.name}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span className="toggle-password" onClick={toggleShowPassword} role="button" tabIndex="0" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-container">
                <input
                  className="input-field"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  name={confirmPasswordField.name}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <span className="toggle-password" onClick={toggleShowConfirmPassword} role="button" tabIndex="0" aria-label="Toggle confirm password visibility">
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <Checkbox
              name="terms"
              checked={!!formData.terms}
              onChange={handleChange}
              required
              error={errors.terms}
              label={
                <>
                  I agree to the{' '}
                  <Link to="/static/terms" className="link">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/static/privacy" className="link">Privacy Policy</Link>
                </>
              }
            />

            <div className="buttons">
              <Button type="button" variant="outline" onClick={prevStep}>Previous</Button>
              <Button type="submit" variant="primary" disabled={loading} loading={loading}>Create Account</Button>
            </div>
          </div>
        )}
      </form>
    </>
  );
};

export default TransporterSignupForm;
