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

  const userType = searchParams.get('type') || 'customer';
  const redirectTo = searchParams.get('redirect');

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser({ ...data, role: userType })).unwrap();
      showSuccess('Logged in successfully.');
      redirectTo ? navigate(redirectTo, { replace: true }) : redirectAfterLogin(user?.role || userType, navigate);
    } catch (err) {
      showError(typeof err === 'string' ? err : err.message);
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
