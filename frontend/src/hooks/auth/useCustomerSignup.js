// Custom hook for customer signup with multi-step form validation
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const { showError, showSuccess, showInfo } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupOtpState, setSignupOtpState] = useState({
    active: false,
    maskedEmail: null,
    otp: ['', '', '', '', '', ''],
    verifiedToken: null,
    sending: false,
    verifying: false,
    resending: false,
  });
  const otpRefs = useRef([]);
  const { currentStep, totalSteps, nextStep: goNext, prevStep } = useStepForm(4);

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, watch, formState: { errors }, trigger, setError, clearErrors, getValues, setValue } = useForm({
    defaultValues: { firstName: '', lastName: '', gender: '', dob: '', phone: '', email: '', street_address: '', city: '', state: '', pin: '', password: '', confirmPassword: '', terms: false },
    resolver: zodResolver(customerSignupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (signupOtpState.active && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [signupOtpState.active]);

  const requestSignupOtp = async (email, resend = false) => {
    const stateKey = resend ? 'resending' : 'sending';

    setSignupOtpState((prev) => ({ ...prev, [stateKey]: true }));
    try {
      const otpResponse = await authApi.requestSignupOtp({ email, role: 'customer' });
      setSignupOtpState((prev) => ({
        ...prev,
        active: true,
        maskedEmail: otpResponse.maskedEmail,
        otp: ['', '', '', '', '', ''],
        [stateKey]: false,
      }));

      if (resend) {
        showSuccess('A new verification code has been sent to your email.');
      } else {
        showInfo(`Verification code sent to ${otpResponse.maskedEmail}`);
      }
    } catch (error) {
      setSignupOtpState((prev) => ({ ...prev, [stateKey]: false }));
      showError(error?.message || 'Failed to send verification code.');
    }
  };

  const completeSignup = async (data, signupVerificationToken) => {
    await dispatch(signupUser({
      signupData: {
        ...data,
        address: { street: data.street_address, city: data.city, state: data.state, pin: data.pin },
      },
      userType: 'customer',
      signupVerificationToken,
    })).unwrap();

    showSuccess('Registration successful!');
    redirectAfterSignup('customer', navigate);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    if (!signupOtpState.verifiedToken) {
      await requestSignupOtp(data.email, false);
      return;
    }

    setLoading(true);
    try {
      await completeSignup(data, signupOtpState.verifiedToken);
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

  const handleOtpChange = useCallback((index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    setSignupOtpState((prev) => {
      const updatedOtp = [...prev.otp];
      updatedOtp[index] = digit;
      return { ...prev, otp: updatedOtp };
    });

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((index, event) => {
    if (event.key === 'Backspace' && !signupOtpState.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [signupOtpState.otp]);

  const handleOtpPaste = useCallback((event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    setSignupOtpState((prev) => {
      const updatedOtp = [...prev.otp];
      for (let index = 0; index < pasted.length; index += 1) {
        updatedOtp[index] = pasted[index];
      }
      return { ...prev, otp: updatedOtp };
    });

    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }, []);

  const submitSignupOtp = async () => {
    const otp = signupOtpState.otp.join('');
    if (otp.length !== 6) {
      showError('Please enter all 6 OTP digits.');
      return;
    }

    setSignupOtpState((prev) => ({ ...prev, verifying: true }));
    setLoading(true);

    try {
      const values = getValues();
      const verificationResult = await authApi.verifySignupOtp({
        email: values.email,
        role: 'customer',
        otp,
      });

      setSignupOtpState((prev) => ({
        ...prev,
        active: false,
        verifying: false,
        verifiedToken: verificationResult.signupVerificationToken,
      }));

      await completeSignup(values, verificationResult.signupVerificationToken);
    } catch (error) {
      setSignupOtpState((prev) => ({
        ...prev,
        verifying: false,
        otp: ['', '', '', '', '', ''],
      }));
      showError(error?.message || 'OTP verification failed.');
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendSignupOtp = async () => {
    const values = getValues();
    await requestSignupOtp(values.email, true);
  };

  const cancelSignupOtp = () => {
    setSignupOtpState((prev) => ({
      ...prev,
      active: false,
      otp: ['', '', '', '', '', ''],
      verifying: false,
      resending: false,
      sending: false,
    }));
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
    loading: loading || googleLoading || signupOtpState.sending || signupOtpState.verifying || signupOtpState.resending,
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
    signupOtpState,
    otpRefs,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitSignupOtp,
    resendSignupOtp,
    cancelSignupOtp,
  };
};