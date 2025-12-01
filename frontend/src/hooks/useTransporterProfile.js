import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTransporterProfile,
  updateTransporterField,
  updateTransporterPassword,
  clearError,
  clearUpdateSuccess,
} from '../store/slices/transporterSlice';
import { useNotification } from '../context/NotificationContext';

export const useTransporterProfile = () => {
  const dispatch = useDispatch();
  const { profile, loading, error, updateSuccess } = useSelector((state) => state.transporter);
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('personal');

  const switchTab = (tabId) => {
    setActiveTab(tabId);
  };

  useEffect(() => {
    dispatch(fetchTransporterProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      showSuccess('Update successful');
      dispatch(clearUpdateSuccess());
    }
  }, [updateSuccess, dispatch, showSuccess]);

  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearError());
    }
  }, [error, dispatch, showError]);

  return {
    profile,
    loading,
    error,
    activeTab,
    switchTab,
    dispatch,
    updateTransporterField,
    updateTransporterPassword,
  };
};
