import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDriverProfile,
  updateDriverField,
  updateDriverPassword,
  uploadDriverProfilePicture,
  clearError,
  clearUpdateSuccess,
} from '../store/slices/driverSlice';
import { useNotification } from '../context/NotificationContext';

export const useDriverProfile = () => {
  const dispatch = useDispatch();
  const { profile, addresses, loading, error, updateSuccess } = useSelector(
    (state) => state.driver
  );
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('personal');
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    dispatch(fetchDriverProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      showSuccess('Update successful!');
      dispatch(clearUpdateSuccess());
      if (activeTab === 'shipping') {
        dispatch(fetchDriverProfile());
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
    updateDriverField,
    updateDriverPassword,
    uploadDriverProfilePicture,
  };
};
