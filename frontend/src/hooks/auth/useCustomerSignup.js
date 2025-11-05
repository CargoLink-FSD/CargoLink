/**
 * Customer Signup Hook
 * Manages 4-step customer registration with inline validation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { redirectAfterSignup } from '../../utils/redirectUser';
import { useStepForm } from './useStepForm';
import {
  validateEmail,
  validatePhone,
  validatePIN,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validateDOB,
} from '../../utils/validation';

// Default form values for customer signup
const CUSTOMER_DEFAULT_VALUES = {
  firstName: '',
  lastName: '',
  gender: '',
  dob: '',
  phone: '',
  email: '',
  street_address: '',
  city: '',
  state: '',
  pin: '',
  password: '',
  confirmPassword: '',
  terms: false,
};

// Step field mappings
const STEP_FIELDS = {
  1: ['firstName', 'lastName', 'gender'],
  2: ['phone', 'email', 'dob'],
  3: ['street_address', 'city', 'state', 'pin'],
  4: ['password', 'confirmPassword', 'terms'],
};

// Field validators
const FIELD_VALIDATORS = {
  firstName: (value) => validateRequired(value, 'First name'),
  lastName: (value) => validateRequired(value, 'Last name'),
  gender: (value) => validateRequired(value, 'Gender'),
  dob: validateDOB,
  phone: validatePhone,
  email: validateEmail,
  street_address: (value) => validateRequired(value, 'Street address'),
  city: (value) => validateRequired(value, 'City'),
  state: (value) => validateRequired(value, 'State'),
  pin: validatePIN,
  password: validatePassword,
  confirmPassword: (value, data) => validatePasswordMatch(data?.password, value),
  terms: (value) => (value ? '' : 'You must accept the terms'),
};

export const useCustomerSignup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showError: notifyError, showSuccess: notifySuccess } = useNotification();

  const [formData, setFormData] = useState({ ...CUSTOMER_DEFAULT_VALUES });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    currentStep,
    totalSteps,
    nextStep: goNextStep,
    prevStep: goPrevStep,
    resetSteps,
  } = useStepForm(4);

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const setFieldError = (field, message) => {
    setErrors(prev => {
      if (!message) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: message };
    });
  };

  const validateStep = (step, data = formData) => {
    const fields = STEP_FIELDS[step];
    if (!fields) return true;

    let valid = true;
    fields.forEach((field) => {
      const validator = FIELD_VALIDATORS[field];
      const message = validator ? validator(data[field], data) : '';
      setFieldError(field, message);
      if (message) valid = false;
    });

    if (!valid) {
      notifyError('Please fix the highlighted fields before continuing.');
    }
    return valid;
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const nextData = { ...prev, [name]: nextValue };
      const validator = FIELD_VALIDATORS[name];
      const message = validator ? validator(nextData[name], nextData) : '';
      setFieldError(name, message);

      // Re-validate confirmPassword when password changes
      if (name === 'password' && nextData.confirmPassword) {
        const confirmValidator = FIELD_VALIDATORS.confirmPassword;
        const confirmMessage = confirmValidator(nextData.confirmPassword, nextData);
        setFieldError('confirmPassword', confirmMessage);
      }

      return nextData;
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const validator = FIELD_VALIDATORS[name];
    const message = validator ? validator(formData[name], formData) : '';
    setFieldError(name, message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(4)) return;

    setSubmitting(true);
    try {
      const payload = {
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
      await signup({ signupData: payload, userType: 'customer' });
      notifySuccess('Registration successful!');
      redirectAfterSignup('customer', navigate);
    } catch (error) {
      notifyError(error?.message || error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...CUSTOMER_DEFAULT_VALUES });
    setErrors({});
    setSubmitting(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    resetSteps();
  };

  // --------------------------------------------------------------------------
  // Return Hook API
  // --------------------------------------------------------------------------

  return {
    formData,
    errors,
    loading: submitting,
    handleChange,
    handleBlur,
    handleSubmit,
    currentStep,
    totalSteps,
    nextStep: () => validateStep(currentStep) && goNextStep(),
    prevStep: goPrevStep,
    showPassword,
    showConfirmPassword,
    toggleShowPassword: () => setShowPassword(p => !p),
    toggleShowConfirmPassword: () => setShowConfirmPassword(p => !p),
    resetForm,
    navigate,
  };
};
