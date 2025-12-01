import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCustomerProfile,
  updateCustomerField,
  updateCustomerPassword,
  addCustomerAddress,
  deleteCustomerAddress,
  clearError,
  clearUpdateSuccess,
} from '../store/slices/customerSlice';
import { useNotification } from '../context/NotificationContext';

export const useCustomerProfile = () => {
  const dispatch = useDispatch();
  const { profile, addresses, loading, error, updateSuccess } = useSelector(
    (state) => state.customer
  );
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('personal');
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomerProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      showSuccess('Update successful!');
      dispatch(clearUpdateSuccess());
      if (activeTab === 'shipping') {
        dispatch(fetchCustomerProfile());
      }
    }
  }, [updateSuccess, dispatch, showSuccess, activeTab]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearError());
    }
  }, [error, dispatch, showError]);

  return {
    profile,
    addresses,
    loading,
    error,
    activeTab,
    setActiveTab,
    showAddressForm,
    setShowAddressForm,
    dispatch,
    updateCustomerField,
    updateCustomerPassword,
    addCustomerAddress,
    deleteCustomerAddress,
  };
};
