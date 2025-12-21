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
import { sendSignupOTP, verifySignupOTP, resendOTP } from '../../api/otp';

// Define validation schema for each step (now 5 steps with OTP)
const steps = [
  { fields: ['name', 'primary_contact', 'secondary_contact', 'email'], schema: transporterStep1Schema },
  { fields: ['gst_in', 'pan', 'street_address', 'city', 'state', 'pin'], schema: transporterStep2Schema },
  { fields: ['vehicles'], schema: transporterStep3Schema },
  { fields: ['password', 'confirmPassword', 'terms'], schema: transporterStep4Schema },
  { fields: [], schema: null }, // OTP step - no form validation needed
];

export const useTransporterSignup = () => {
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
  const { register, handleSubmit, watch, formState: { errors }, trigger, control, setError, clearErrors, getValues } = useForm({
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
        await sendSignupOTP(values.email, 'transporter');
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
      await verifySignupOTP(values.email, otp, 'transporter');
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
      await resendOTP(values.email, 'signup', 'transporter');
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
    otpSent,
    otpVerified,
    otpError,
    handleVerifyOTP,
    handleResendOTP,
  };
};
