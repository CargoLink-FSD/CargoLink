import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';
import { useNotification } from '../../context/NotificationContext';
import { validateEmail } from '../../utils/validation';
import { redirectAfterLogin } from '../../utils/redirectUser';

export const useAuthLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading: authLoading } = useSelector((state) => state.auth);
  const { showError: notifyError, showSuccess: notifySuccess } = useNotification();
  const [searchParams] = useSearchParams();

  const userType = searchParams.get('type') || 'customer';
  const redirectTo = searchParams.get('redirect');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const setFieldError = (field, message) => {
    setErrors((prev) => {
      if (message) {
        return { ...prev, [field]: message };
      }
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'email':
        return validateEmail(value);
      case 'password':
        if (!value || !value.trim()) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name !== 'rememberMe') {
      const nextValue = type === 'checkbox' ? checked : value;
      const errorMessage = validateField(name, nextValue);
      setFieldError(name, errorMessage);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === 'rememberMe') return;
    const errorMessage = validateField(name, formData[name]);
    setFieldError(name, errorMessage);
  };

  const validateForm = () => {
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    setTouched({ email: true, password: true });
    setFieldError('email', emailError);
    setFieldError('password', passwordError);

    return !emailError && !passwordError;
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!validateForm()) {
      notifyError('Please fix the highlighted fields before continuing.');
      return;
    }

    try {
      const result = await dispatch(loginUser({
        email: formData.email,
        password: formData.password,
        role: userType,
      })).unwrap();

      setSuccessMessage('Successfully logged in!');
      notifySuccess('Logged in successfully.');

      const role = user?.role || user?.type || userType;
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        redirectAfterLogin(role, navigate);
      }

    } catch (err) {
      if (err) {
        notifyError(typeof err === 'string' ? err : err.message);
      }
    }
  };

  return {
    formData,
    userType,
    showPassword,
    successMessage,
    authLoading,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    toggleShowPassword,
    navigate,
  };
};
