// Custom hook for user login functionality
import { useState, useEffect } from 'react';
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
  const { showError, showSuccess } = useNotification();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Handle login form submission
  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser({ ...data, role: userType })).unwrap();
      showSuccess('Logged in successfully.');
      redirectTo ? navigate(redirectTo, { replace: true }) : redirectAfterLogin(user?.role || userType, navigate);
    } catch (err) {
      // Map backend error to user-friendly message
      const rawError = typeof err === 'string' ? err : err?.message || 'Login failed';
      let errorMessage = rawError;

      if (rawError.includes('Google Sign-In') || rawError.includes('ERR_GOOGLE_AUTH_REQUIRED')) {
        errorMessage = 'This account uses Google Sign-In. Please click "Continue with Google" to login.';
      } else if (rawError.includes('Invalid credentials') || rawError.includes('ERR_INVALID_CREDENTIALS')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (rawError.includes('No refresh token')) {
        // This shouldn't happen anymore, but just in case
        errorMessage = 'Login failed. Please try again.';
      }

      showError(errorMessage);
    }
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const response = await authApi.googleLogin({
        credential: credentialResponse.credential,
        role: userType,
      });

      // Store tokens
      tokenStorage.setTokens(response.accessToken, response.refreshToken);

      // Update Redux state
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
    authLoading: authLoading || googleLoading,
    errors,
    register,
    handleSubmit: handleSubmit(onSubmit),
    toggleShowPassword: () => setShowPassword(!showPassword),
    navigate,
    handleGoogleLogin,
    handleGoogleError,
  };
};
