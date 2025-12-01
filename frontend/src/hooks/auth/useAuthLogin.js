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

export const useAuthLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading: authLoading } = useSelector((state) => state.auth);
  const { showError, showSuccess } = useNotification();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  // Get user type and redirect URL from query params
  const userType = searchParams.get('type') || 'customer';
  const redirectTo = searchParams.get('redirect');

  // Initialize form with react-hook-form and Zod validation
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
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
      
      if (rawError.includes('Invalid credentials') || rawError.includes('ERR_INVALID_CREDENTIALS')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (rawError.includes('No refresh token')) {
        // This shouldn't happen anymore, but just in case
        errorMessage = 'Login failed. Please try again.';
      }
      
      showError(errorMessage);
    }
  };

  return {
    formData: watch(),
    userType,
    showPassword,
    authLoading,
    errors,
    register,
    handleSubmit: handleSubmit(onSubmit),
    toggleShowPassword: () => setShowPassword(!showPassword),
    navigate,
  };
};
