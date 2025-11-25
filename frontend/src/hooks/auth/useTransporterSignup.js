/**
 * Transporter Signup Hook
 * Manages 4-step transporter registration with fleet management
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signupUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import { redirectAfterSignup } from '../../utils/redirectUser';
import { useStepForm } from './useStepForm';
import {
  validateEmail,
  validatePhone,
  validateGST,
  validatePAN,
  validatePIN,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validateVehicleReg,
} from '../../utils/validation';

// Default form values for transporter signup
const TRANSPORTER_DEFAULT_VALUES = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  primary_contact: '',
  secondary_contact: '',
  pan: '',
  gst_in: '',
  street_address: '',
  city: '',
  state: '',
  pin: '',
  terms: false,
  vehicles: [
    {
      name: '',
      type: '',
      registrationNumber: '',
      capacity: '',
      manufacture_year: '',
    },
  ],
};

// Step field mappings
const STEP_FIELDS = {
  1: ['name', 'primary_contact', 'secondary_contact', 'email'],
  2: ['gst_in', 'pan', 'street_address', 'city', 'state', 'pin'],
  3: ['vehicles'],
  4: ['password', 'confirmPassword', 'terms'],
};

// Empty vehicle template
const EMPTY_VEHICLE = {
  name: '',
  type: '',
  registrationNumber: '',
  capacity: '',
  manufacture_year: '',
};

// Field validators
const FIELD_VALIDATORS = {
  name: (value) => validateRequired(value, 'Full name'),
  primary_contact: validatePhone,
  secondary_contact: (value) => (value ? validatePhone(value) : ''),
  email: validateEmail,
  gst_in: validateGST,
  pan: validatePAN,
  street_address: (value) => validateRequired(value, 'Street address'),
  city: (value) => validateRequired(value, 'City'),
  state: (value) => validateRequired(value, 'State'),
  pin: validatePIN,
  password: validatePassword,
  confirmPassword: (value, data) => validatePasswordMatch(data?.password, value),
  terms: (value) => (value ? '' : 'You must accept the terms'),
};

// Vehicle-specific validators
const validateVehicleCapacity = (value) => {
  if (!value || !value.toString().trim()) return 'Vehicle capacity is required';
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) return 'Vehicle capacity must be greater than 0';
  return '';
};

const validateManufactureYear = (value) => {
  if (!value || !value.toString().trim()) return 'Manufacture year is required';
  const year = Number(value);
  if (!Number.isInteger(year) || value.toString().length !== 4) return 'Enter a valid 4 digit year';
  const currentYear = new Date().getFullYear();
  if (year < 1980 || year > currentYear) return `Enter a year between 1980 and ${currentYear}`;
  return '';
};

export const useTransporterSignup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError: notifyError, showSuccess: notifySuccess } = useNotification();

  const [formData, setFormData] = useState(TRANSPORTER_DEFAULT_VALUES);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    currentStep,
    totalSteps,
    nextStep: goNextStep,
    prevStep: goPrevStep,
    resetSteps,
  } = useStepForm(4);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --------------------------------------------------------------------------
  // Vehicle Management
  // --------------------------------------------------------------------------

  const addVehicle = () => {
    setFormData((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, { ...EMPTY_VEHICLE }],
    }));
  };

  const removeVehicle = (index) => {
    setFormData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }));

    // Clear all vehicle errors
    setErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith('vehicles[')) {
          next[key] = value;
        }
      });
      return next;
    });
  };

  const setVehicleField = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle, i) =>
        i === index ? { ...vehicle, [key]: value } : vehicle
      ),
    }));
  };

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const setFieldError = (field, error) => {
    setErrors((prev) => {
      if (!error) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  };

  const validateVehicle = (index, key, value) => {
    const fieldKey = `vehicles[${index}][${key}]`;

    let error = '';
    if (key === 'name') error = validateRequired(value, 'Vehicle name');
    else if (key === 'type') error = validateRequired(value, 'Vehicle type');
    else if (key === 'registrationNumber') error = validateVehicleReg(value);
    else if (key === 'capacity') error = validateVehicleCapacity(value);
    else if (key === 'manufacture_year') error = validateManufactureYear(value);

    setFieldError(fieldKey, error);
    return error;
  };

  const validateStep = (step) => {
    const fieldsToValidate = STEP_FIELDS[step];
    if (!fieldsToValidate) return false;

    let hasError = false;

    fieldsToValidate.forEach((field) => {
      if (field === 'vehicles') {
        if (!formData.vehicles || formData.vehicles.length === 0) {
          setErrors((prev) => ({ ...prev, vehicles: 'At least one vehicle is required' }));
          hasError = true;
          return;
        }

        formData.vehicles.forEach((vehicle, index) => {
          ['name', 'type', 'registrationNumber', 'capacity', 'manufacture_year'].forEach((key) => {
            if (validateVehicle(index, key, vehicle[key])) hasError = true;
          });
        });
        return;
      }

      const validator = FIELD_VALIDATORS[field];
      if (!validator) return;

      const error = validator(formData[field], formData);
      setFieldError(field, error);
      if (error) hasError = true;
    });

    return !hasError;
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
      if (validator) {
        const error = validator(nextData[name], nextData);
        setFieldError(name, error);

        // Re-validate confirmPassword when password changes
        if (name === 'password' && nextData.confirmPassword) {
          const confirmError = FIELD_VALIDATORS.confirmPassword(nextData.confirmPassword, nextData);
          setFieldError('confirmPassword', confirmError);
        }
      }
      return nextData;
    });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const validator = FIELD_VALIDATORS[name];
    if (validator) {
      const error = validator(formData[name], formData);
      setFieldError(name, error);
    }
  };

  const handleVehicleChange = (index, key, value) => {
    setVehicleField(index, key, value);
    validateVehicle(index, key, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        primary_contact: formData.primary_contact,
        secondary_contact: formData.secondary_contact,
        gst_in: formData.gst_in,
        pan: formData.pan,
        street_address: formData.street_address,
        city: formData.city,
        state: formData.state,
        pin: formData.pin,
        vehicles: formData.vehicles.map((vehicle) => ({
          name: vehicle.name,
          truck_type: vehicle.type,
          registration: vehicle.registrationNumber,
          capacity: parseFloat(vehicle.capacity),
          manufacture_year: vehicle.manufacture_year,
        })),
      };

      await dispatch(signupUser({ signupData: payload, userType: 'transporter' })).unwrap();
      notifySuccess('Registration successful!');
      redirectAfterSignup('transporter', navigate);
    } catch (error) {
      notifyError(error?.message || error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(TRANSPORTER_DEFAULT_VALUES);
    setErrors({});
    setIsSubmitting(false);
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
    loading: isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    vehicles: formData.vehicles,
    addVehicle,
    removeVehicle,
    handleVehicleChange,
    showPassword,
    showConfirmPassword,
    toggleShowPassword: () => setShowPassword(!showPassword),
    toggleShowConfirmPassword: () => setShowConfirmPassword(!showConfirmPassword),
    currentStep,
    totalSteps,
    nextStep: () => validateStep(currentStep) && goNextStep(),
    prevStep: goPrevStep,
    resetForm,
    navigate,
  };
};
