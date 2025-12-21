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
import { sendSignupOTP, verifySignupOTP, resendOTP } from '../../api/otp';

// Define validation schema for each step (now 5 steps with OTP)
const steps = [
  { fields: ['firstName', 'lastName', 'gender'], schema: customerStep1Schema },
  { fields: ['phone', 'email', 'dob'], schema: customerStep2Schema },
  { fields: ['street_address', 'city', 'state', 'pin'], schema: customerStep3Schema },
  { fields: ['password', 'confirmPassword', 'terms'], schema: customerStep4Schema },
  { fields: [], schema: null }, // OTP step - no form validation needed
];

export const useCustomerSignup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const { currentStep, totalSteps, nextStep: goNext, prevStep } = useStepForm(5);

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, watch, formState: { errors }, trigger, setError, clearErrors, getValues } = useForm({
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
    // Step 4 is password step, need to send OTP before moving to step 5
    if (currentStep === 4) {
      const step = steps[currentStep - 1];
      const fields = step.fields;
      const rhfValid = await trigger(fields);
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

      // Send OTP
      setLoading(true);
      try {
        await sendSignupOTP(values.email, 'customer');
        setOtpSent(true);
        showSuccess('OTP sent to your email!');
        goNext();
      } catch (error) {
        showError(error?.response?.data?.message || 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // For other steps, validate normally
    if (currentStep < 4) {
      const step = steps[currentStep - 1];
      const fields = step.fields;
      const rhfValid = await trigger(fields);
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
    }

    goNext();
  };

  // Handle OTP verification
  const handleVerifyOTP = async (otp) => {
    setLoading(true);
    setOtpError(null);
    try {
      const values = getValues();
      await verifySignupOTP(values.email, otp, 'customer');
      setOtpVerified(true);
      showSuccess('Email verified successfully!');
      
      // Now submit the form
      await onSubmit(values);
    } catch (error) {
      const errorMsg = error?.response?.data?.message || 'Invalid OTP. Please try again.';
      setOtpError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOTP = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const values = getValues();
      await resendOTP(values.email, 'signup', 'customer');
      showSuccess('OTP resent to your email!');
    } catch (error) {
      const errorMsg = error?.response?.data?.message || 'Failed to resend OTP. Please try again.';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData: watch(),
    errors,
    loading,
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
    otpSent,
    otpVerified,
    otpError,
    handleVerifyOTP,
    handleResendOTP,
  };
};