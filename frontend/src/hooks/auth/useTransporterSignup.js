// Custom hook for transporter signup with multi-step form validation
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { uploadDocuments } from '../../api/transporter';

// Define validation schema for each step
const steps = [
  { fields: ['name', 'primary_contact', 'secondary_contact', 'email'], schema: transporterStep1Schema },
  { fields: ['gst_in', 'pan', 'street_address', 'city', 'state', 'pin'], schema: transporterStep2Schema },
  { fields: ['vehicles'], schema: transporterStep3Schema },
  { fields: [], schema: null }, // Step 4: Document upload (validated separately)
  { fields: ['password', 'confirmPassword', 'terms'], schema: transporterStep4Schema }, // Step 5: Password
];

export const useTransporterSignup = () => {
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
  const { currentStep, totalSteps, nextStep: goNext, prevStep } = useStepForm(5);

  // Document upload state (PAN + DL only)
  const [documentFiles, setDocumentFiles] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});

  // Vehicle RC files state (stored separately, keyed as vehicle_rc_0, vehicle_rc_1, etc.)
  const [rcFiles, setRcFiles] = useState({});
  const [rcErrors, setRcErrors] = useState({});

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, watch, formState: { errors }, trigger, control, setError, clearErrors, getValues, setValue } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', primary_contact: '', secondary_contact: '', pan: '', gst_in: '', street_address: '', city: '', state: '', pin: '', terms: false, vehicles: [{ name: '', type: '', registrationNumber: '', capacity: '', manufacture_year: '' }] },
    resolver: zodResolver(transporterSignupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (signupOtpState.active && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [signupOtpState.active]);

  // Manage dynamic vehicle array fields
  const { fields, append, remove } = useFieldArray({ control, name: 'vehicles' });

  // Validate document files for step 5 (PAN + DL only)
  const validateDocuments = () => {
    const errs = {};
    if (!documentFiles.pan_card) errs.pan_card = 'PAN Card is required';
    if (!documentFiles.driving_license) errs.driving_license = 'Driving License is required';
    setDocumentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate vehicle RCs at step 3
  const validateRcFiles = () => {
    const vehicleCount = getValues('vehicles').length;
    const errs = {};
    for (let i = 0; i < vehicleCount; i++) {
      if (!rcFiles[`vehicle_rc_${i}`]) {
        errs[`vehicle_rc_${i}`] = 'Vehicle RC is required';
      }
    }
    setRcErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle RC file change from VehiclesEditor
  const handleRcFileChange = (index, file, error) => {
    const key = `vehicle_rc_${index}`;
    if (error) {
      setRcErrors(prev => ({ ...prev, [key]: error }));
      setRcFiles(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    } else {
      setRcErrors(prev => ({ ...prev, [key]: null }));
      setRcFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const requestSignupOtp = async (email, resend = false) => {
    const stateKey = resend ? 'resending' : 'sending';
    setSignupOtpState((prev) => ({ ...prev, [stateKey]: true }));

    try {
      const otpResponse = await authApi.requestSignupOtp({ email, role: 'transporter' });
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
        street: data.street_address,
        vehicles: data.vehicles.map(v => ({
          name: v.name,
          truck_type: v.type,
          registration: v.registrationNumber,
          capacity: parseFloat(v.capacity),
          manufacture_year: v.manufacture_year,
        })),
      },
      userType: 'transporter',
      signupVerificationToken,
    })).unwrap();

    try {
      const formData = new FormData();
      if (documentFiles.pan_card) formData.append('pan_card', documentFiles.pan_card);
      if (documentFiles.driving_license) formData.append('driving_license', documentFiles.driving_license);

      const vehicleCount = data.vehicles.length;
      for (let i = 0; i < vehicleCount; i += 1) {
        if (rcFiles[`vehicle_rc_${i}`]) {
          formData.append(`vehicle_rc_${i}`, rcFiles[`vehicle_rc_${i}`]);
        }
      }

      await uploadDocuments(formData);
      showSuccess('Registration successful! Documents uploaded for verification.');
    } catch (_docError) {
      showSuccess('Registration successful! You can upload documents later from your dashboard.');
    }

    redirectAfterSignup('transporter', navigate);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    // Validate documents at step 5
    if (!validateDocuments()) {
      showError('Please upload all required documents.');
      return;
    }

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
    if (!validateDocuments()) {
      showError('Please upload all required documents.');
      return;
    }

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
        role: 'transporter',
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

    // Step 4 is document upload — validate pan+dl before advancing
    if (currentStep === 4) {
      const docsValid = validateDocuments();
      if (!docsValid) {
        showError('Please upload all required documents (PAN Card & Driving License).');
        return;
      }
      goNext();
      return;
    }

    const fields = step.fields;

    // RHF validation for current fields
    const rhfValid = await trigger(fields);

    // For step 3 (vehicles), also validate RC files
    if (currentStep === 3) {
      const rcValid = validateRcFiles();
      if (!rcValid && !rhfValid) {
        showError('Please fix the errors before continuing.');
        return;
      }
      if (!rcValid) {
        showError('Please upload the Vehicle RC for each vehicle.');
        return;
      }
    }

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
    loading: loading || googleLoading || signupOtpState.sending || signupOtpState.verifying || signupOtpState.resending,
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
    documentFiles,
    setDocumentFiles,
    documentErrors,
    setDocumentErrors,
    rcFiles,
    rcErrors,
    handleRcFileChange,
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
