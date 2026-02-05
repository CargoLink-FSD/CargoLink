// Custom hook for customer signup with multi-step form validation
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import { redirectAfterSignup } from '../../utils/redirectUser';
import { useStepForm } from './useStepForm';
import { customerStep1Schema, customerStep2Schema, customerStep3Schema, customerStep4Schema, customerSignupSchema } from '../../utils/schemas';
import * as authApi from '../../api/auth';

// Define validation schema for each step
const steps = [
  { fields: ['firstName', 'lastName', 'gender', 'email'], schema: customerStep1Schema },
  { fields: ['phone', 'dob'], schema: customerStep2Schema },
  { fields: ['street_address', 'city', 'state', 'pin'], schema: customerStep3Schema },
  { fields: ['password', 'confirmPassword', 'terms'], schema: customerStep4Schema },
];

export const useCustomerSignup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { currentStep, totalSteps, nextStep: goNext, prevStep } = useStepForm(4);

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, watch, formState: { errors }, trigger, setError, clearErrors, getValues, setValue } = useForm({
    defaultValues: { firstName: '', lastName: '', gender: '', dob: '', phone: '', email: '', street_address: '', city: '', state: '', pin: '', password: '', confirmPassword: '', terms: false },
    resolver: zodResolver(customerSignupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Dispatch signup action with formatted data
      await dispatch(signupUser({ 
        signupData: { ...data, address: { street: data.street_address, city: data.city, state: data.state, pin: data.pin } },
        userType: 'customer' 
      })).unwrap();
      showSuccess('Registration successful!');
      redirectAfterSignup('customer', navigate);
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

    // First try built-in RHF validation for current fields
    const rhfValid = await trigger(fields);

    // Additionally validate with Zod step schema to ensure errors surface before navigation
    const values = getValues();
    const subset = Object.fromEntries(fields.map((f) => [f, values[f]]));
    const zodResult = step.schema.safeParse(subset);

    if (!rhfValid || !zodResult.success) {
      // Clear previous step field errors and set fresh ones from Zod
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
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    showPassword,
    showConfirmPassword,
    toggleShowPassword: () => setShowPassword(p => !p),
    toggleShowConfirmPassword: () => setShowConfirmPassword(p => !p),
    navigate,
    setError,
    handleGoogleSignup,
    handleGoogleError,
  };
};