import React from 'react';
import { Link } from 'react-router-dom';
import { InputField, Select, Button, Checkbox } from '../../components/forms';
import ProgressSteps from '../../components/forms/ProgressSteps';
import { EyeIcon, EyeOffIcon } from '../../components/auth/AuthUI';

const stepConfigs = [
  [
    { component: 'InputField', props: { label: 'First Name', type: 'text', name: 'firstName', placeholder: 'Enter your first name', required: true } },
    { component: 'InputField', props: { label: 'Last Name', type: 'text', name: 'lastName', placeholder: 'Enter your last name', required: true } },
    { component: 'Select', props: { label: 'Gender', name: 'gender', placeholder: 'Select your gender', required: true, options: [ { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' } ] } },
  ],
  [
    { component: 'InputField', props: { label: 'Phone Number', type: 'tel', name: 'phone', placeholder: 'Enter your phone number', required: true } },
    { component: 'InputField', props: { label: 'Email', type: 'email', name: 'email', placeholder: 'Enter your email', required: true } },
    { component: 'InputField', props: { label: 'Date of Birth', type: 'date', name: 'dob', required: true } },
  ],
  [
    { component: 'InputField', props: { label: 'Street Address', type: 'text', name: 'street_address', placeholder: 'Enter your street address', required: true } },
    { component: 'InputField', props: { label: 'City', type: 'text', name: 'city', placeholder: 'Enter your city', required: true } },
    { component: 'InputField', props: { label: 'State', type: 'text', name: 'state', placeholder: 'Enter your state', required: true } },
    { component: 'InputField', props: { label: 'PIN Code', type: 'text', name: 'pin', placeholder: 'Enter your PIN code', required: true } },
  ],
];

const FieldRenderer = ({ def, formData, errors, onChange }) => {
  const { component, props } = def;
  const name = props.name;
  const error = errors?.[name] || '';

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

  if (component === 'Select') {
    return (
      <Select
        {...props}
        name={name}
        value={formData[name] ?? ''}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (component === 'Checkbox') {
    return (
      <Checkbox
        {...props}
        name={name}
        checked={!!formData[name]}
        onChange={(e) => onChange({ target: { name, type: 'checkbox', checked: e.target.checked } })}
        error={error}
      />
    );
  }

  return null;
};

const CustomerSignupForm = ({ state }) => {
  const {
    handleSubmit,
    formState,
    onSubmit,
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
    handleChange,
    navigate,
  } = state;
  
  const passwordField = { name: 'password' };
  const confirmPasswordField = { name: 'confirmPassword' };

  return (
    <>
      <ProgressSteps current={currentStep} total={totalSteps} />

      <form onSubmit={handleSubmit}>
        {[1, 2, 3].includes(currentStep) && (
          <div className="form-step">
            {stepConfigs[currentStep - 1].map((def, idx) => (
              <FieldRenderer
                key={`${currentStep}-${idx}`}
                def={def}
                formData={formData}
                errors={errors}
                onChange={handleChange}
              />
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

export default CustomerSignupForm;
