// Custom hook for user login functionality (with 2FA support)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import { loginSchema } from '../../utils/schemas';
import { redirectAfterLogin } from '../../utils/redirectUser';
import * as authApi from '../../api/auth';
import tokenStorage from '../../utils/token';

export const useAuthLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading: authLoading } = useSelector((state) => state.auth);
  const { showError, showSuccess, showInfo } = useNotification();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 2FA state
  const [twoFAState, setTwoFAState] = useState({
    active: false,
    tempToken: null,
    maskedEmail: null,
    otp: ['', '', '', '', '', ''],
    verifying: false,
    resending: false,
  });

  // Store login creds for resend
  const loginCredsRef = useRef(null);

  // OTP input refs
  const otpRefs = useRef([]);

  // Get user type and redirect URL from query params
  const userType = searchParams.get('type') || 'customer';
  const redirectTo = searchParams.get('redirect');

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Auto-focus first OTP input when 2FA activates
  useEffect(() => {
    if (twoFAState.active && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [twoFAState.active]);

  // Handle login form submission
  const onSubmit = async (data) => {
    try {
      setLoginLoading(true);
      loginCredsRef.current = { ...data, role: userType };

      const response = await authApi.login({ ...data, role: userType });

      // Check if 2FA is required
      if (response.requires2FA) {
        setTwoFAState((prev) => ({
          ...prev,
          active: true,
          tempToken: response.tempToken,
          maskedEmail: response.maskedEmail,
          otp: ['', '', '', '', '', ''],
        }));
        showInfo(`Verification code sent to ${response.maskedEmail}`);
        return;
      }

      // Direct login (admin/manager — no 2FA)
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      const userInfo = tokenStorage.getUserFromToken();
      dispatch(loginUser.fulfilled(response));
      showSuccess('Logged in successfully.');
      redirectTo ? navigate(redirectTo, { replace: true }) : redirectAfterLogin(userInfo?.role || userType, navigate);
    } catch (err) {
      const rawError = typeof err === 'string' ? err : err?.message || 'Login failed';
      let errorMessage = rawError;

      if (rawError.includes('Google Sign-In') || rawError.includes('ERR_GOOGLE_AUTH_REQUIRED')) {
        errorMessage = 'This account uses Google Sign-In. Please click "Continue with Google" to login.';
      } else if (rawError.includes('Invalid credentials') || rawError.includes('ERR_INVALID_CREDENTIALS')) {
        errorMessage = 'Invalid email or password. Please try again.';
      }

      showError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = useCallback((index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    setTwoFAState((prev) => {
      const newOtp = [...prev.otp];
      newOtp[index] = digit;
      return { ...prev, otp: newOtp };
    });

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  // Handle OTP keydown (backspace navigation)
  const handleOtpKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !twoFAState.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [twoFAState.otp]);

  // Handle paste into OTP fields
  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    setTwoFAState((prev) => {
      const newOtp = [...prev.otp];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
      }
      return { ...prev, otp: newOtp };
    });

    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  }, []);

  // Submit OTP
  const submitOtp = async () => {
    const otpString = twoFAState.otp.join('');
    if (otpString.length !== 6) {
      showError('Please enter all 6 digits');
      return;
    }

    try {
      setTwoFAState((prev) => ({ ...prev, verifying: true }));
      const response = await authApi.verify2FA({
        tempToken: twoFAState.tempToken,
        otp: otpString,
      });

      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      const userInfo = tokenStorage.getUserFromToken();
      dispatch(loginUser.fulfilled(response));
      showSuccess('Logged in successfully.');
      redirectTo ? navigate(redirectTo, { replace: true }) : redirectAfterLogin(userInfo?.role || userType, navigate);
    } catch (err) {
      const rawError = typeof err === 'string' ? err : err?.message || 'Verification failed';
      showError(rawError);
      setTwoFAState((prev) => ({ ...prev, otp: ['', '', '', '', '', ''], verifying: false }));
      otpRefs.current[0]?.focus();
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    if (!loginCredsRef.current) return;
    try {
      setTwoFAState((prev) => ({ ...prev, resending: true }));
      const response = await authApi.login(loginCredsRef.current);
      if (response.requires2FA) {
        setTwoFAState((prev) => ({
          ...prev,
          tempToken: response.tempToken,
          maskedEmail: response.maskedEmail,
          otp: ['', '', '', '', '', ''],
          resending: false,
        }));
        showSuccess('New verification code sent!');
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      showError('Failed to resend code. Please try again.');
      setTwoFAState((prev) => ({ ...prev, resending: false }));
    }
  };

  // Go back from 2FA to login form
  const cancelTwoFA = () => {
    setTwoFAState({
      active: false,
      tempToken: null,
      maskedEmail: null,
      otp: ['', '', '', '', '', ''],
      verifying: false,
      resending: false,
    });
    loginCredsRef.current = null;
  };

  // Handle Google OAuth login (bypasses 2FA — Google already verified identity)
  const handleGoogleLogin = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const response = await authApi.googleLogin({
        credential: credentialResponse.credential,
        role: userType,
      });

      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      const userInfo = tokenStorage.getUserFromToken();
      dispatch(loginUser.fulfilled({ accessToken: response.accessToken, refreshToken: response.refreshToken }));

      showSuccess('Logged in successfully with Google.');
      redirectTo ? navigate(redirectTo, { replace: true }) : redirectAfterLogin(userInfo?.role || userType, navigate);
    } catch (err) {
      const errorMessage = err?.payload?.message || err?.message || 'Google login failed';

      if (errorMessage.includes('No account found') || errorMessage.includes('ERR_USER_NOT_FOUND')) {
        showError('No account found with this email. Please sign up first.');
      } else {
        showError(errorMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    showError('Google login failed. Please try again.');
    setGoogleLoading(false);
  };

  return {
    formData: watch(),
    userType,
    showPassword,
    authLoading: authLoading || googleLoading || loginLoading,
    errors,
    register,
    handleSubmit: handleSubmit(onSubmit),
    toggleShowPassword: () => setShowPassword(!showPassword),
    navigate,
    handleGoogleLogin,
    handleGoogleError,
    // 2FA
    twoFAState,
    otpRefs,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitOtp,
    resendOtp,
    cancelTwoFA,
  };
};
