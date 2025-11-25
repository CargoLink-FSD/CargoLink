/**
 * Auth Signup Hook
 * Switches between customer and transporter signup based on URL parameter
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCustomerSignup } from './useCustomerSignup';
import { useTransporterSignup } from './useTransporterSignup';

export const useAuthSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const customerSignup = useCustomerSignup();
  const transporterSignup = useTransporterSignup();

  // Determine user type from URL params
  const userType = searchParams.get('type') === 'transporter' ? 'transporter' : 'customer';
  const activeSignup = userType === 'transporter' ? transporterSignup : customerSignup;
  const { resetForm: resetCustomerForm } = customerSignup;
  const { resetForm: resetTransporterForm } = transporterSignup;

  // Redirect authenticated users to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Reset form when switching between signup types
  useEffect(() => {
    if (userType === 'transporter') {
      resetTransporterForm();
    } else {
      resetCustomerForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);

  return {
    ...activeSignup,
    userType,
  };
};
