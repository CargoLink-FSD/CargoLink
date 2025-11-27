import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import { REGEX } from '../../utils/schemas';
import { forgotPassword } from '../../api/auth';

export const useForgotPassword = () => {
  const navigate = useNavigate();
  const { showError: notifyError, showSuccess: notifySuccess } = useNotification();
  const [searchParams] = useSearchParams();

  const userType = searchParams.get('type') || 'customer';
  
  const [formData, setFormData] = useState({
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        return REGEX.EMAIL.test(value) ? '' : 'Please enter a valid email address';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    const errorMessage = validateField(name, value);
    setFieldError(name, errorMessage);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMessage = validateField(name, formData[name]);
    setFieldError(name, errorMessage);
  };

  const validateForm = () => {
    const emailError = validateField('email', formData.email);

    setTouched({ email: true });
    setFieldError('email', emailError);

    return !emailError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    
    if (!validateForm()) {
      notifyError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword({
        email: formData.email,
        userType: userType,
      });

      if (response.success || response.ok) {
        setSuccessMessage('A new password has been sent to your email.');
        notifySuccess('A new password has been sent to your email.');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate(`/login?type=${userType}`);
        }, 2000);
      } else {
        notifyError(response.message || 'There was an issue sending the email.');
      }
    } catch (err) {
      notifyError(err?.message || 'An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    userType,
    successMessage,
    loading,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    navigate,
  };
};
