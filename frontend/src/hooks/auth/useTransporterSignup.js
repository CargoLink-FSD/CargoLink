// Custom hook for transporter signup with multi-step form validation
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import { redirectAfterSignup } from '../../utils/redirectUser';
import { useStepForm } from './useStepForm';
import { transporterStep1Schema, transporterStep2Schema, transporterStep3Schema, transporterStep4Schema, transporterSignupSchema } from '../../utils/schemas';
import * as authApi from '../../api/auth';

// Define validation schema for each step
const steps = [
  { fields: ['name', 'primary_contact', 'secondary_contact', 'email'], schema: transporterStep1Schema },
  { fields: ['gst_in', 'pan', 'street_address', 'city', 'state', 'pin'], schema: transporterStep2Schema },
  { fields: ['vehicles'], schema: transporterStep3Schema },
  { fields: ['password', 'confirmPassword', 'terms'], schema: transporterStep4Schema },
];

export const useTransporterSignup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { currentStep, totalSteps, nextStep: goNext, prevStep } = useStepForm(4);

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, watch, formState: { errors }, trigger, control, setError, clearErrors, getValues, setValue } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', primary_contact: '', secondary_contact: '', pan: '', gst_in: '', street_address: '', city: '', state: '', pin: '', terms: false, vehicles: [{ name: '', type: '', registrationNumber: '', capacity: '', manufacture_year: '' }] },
    resolver: zodResolver(transporterSignupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Manage dynamic vehicle array fields
  const { fields, append, remove } = useFieldArray({ control, name: 'vehicles' });

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Dispatch signup action with formatted data
      await dispatch(signupUser({ 
        signupData: { 
          ...data,
          // Map frontend field to backend expected key
          street: data.street_address,
          vehicles: data.vehicles.map(v => ({ 
            name: v.name,
            truck_type: v.type,
            registration: v.registrationNumber,
            capacity: parseFloat(v.capacity),
            manufacture_year: v.manufacture_year,
          })) 
        },
        userType: 'transporter' 
      })).unwrap();
      showSuccess('Registration successful!');
      redirectAfterSignup('transporter', navigate);
    } catch (error) {
      // Handle validation errors from server
      const errs = error?.errors || error?.payload?.errors;
      if (Array.isArray(errs) && errs.length) {
        errs.forEach(e => {
          const fieldName = e.field || e.path;
          if (fieldName) {
            setError(fieldName, { type: 'server', message: e.message || e.msg || 'Invalid' });
          }
        });
        const msg = errs.map(e => `${e.field || e.path || 'field'}: ${e.message || e.msg || 'Invalid'}`).join(', ');
        showError(msg);
      } else {
        showError(error?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Validate current step before proceeding to next
  const nextStep = async () => {
    const step = steps[currentStep - 1];
    const fields = step.fields;

    // RHF validation for current fields
    const rhfValid = await trigger(fields);

    // Zod step schema validation to surface field-level messages
    const values = getValues();
    const subset = Object.fromEntries(fields.map((f) => [f, values[f]]));
    const zodResult = step.schema.safeParse(subset);

    if (!rhfValid || !zodResult.success) {
      clearErrors(fields);
      if (!zodResult.success) {
        zodResult.error.issues.forEach((issue) => {
          const pathKey = Array.isArray(issue.path) && issue.path.length ? issue.path[0] : undefined;
          if (pathKey && fields.includes(pathKey)) {
            setError(pathKey, { type: 'zod', message: issue.message });
          }
        });
      }
      showError('Please fix the errors before continuing.');
      return;
    }

    goNext();
  };

  // Handle Google OAuth for email fetching only
  const handleGoogleSignup = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const response = await authApi.googleVerify({
        credential: credentialResponse.credential,
      });
      
      // Populate only the email field
      setValue('email', response.email, { shouldValidate: true });
      showSuccess('Email fetched from Google. Please complete the rest of the form.');
    } catch (err) {
      const errorMessage = err?.payload?.message || err?.message || 'Failed to fetch email from Google';
      showError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    showError('Failed to fetch email from Google. Please try again.');
    setGoogleLoading(false);
  };

  return {
    formData: watch(),
    errors,
    loading: loading || googleLoading,
    register,
    handleSubmit: handleSubmit(onSubmit),
    vehicles: fields,
    addVehicle: () => append({ name: '', type: '', registrationNumber: '', capacity: '', manufacture_year: '' }),
    removeVehicle: remove,
    showPassword,
    showConfirmPassword,
    toggleShowPassword: () => setShowPassword(!showPassword),
    toggleShowConfirmPassword: () => setShowConfirmPassword(!showConfirmPassword),
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    navigate,
    setError,
    handleGoogleSignup,
    handleGoogleError,
  };
};
