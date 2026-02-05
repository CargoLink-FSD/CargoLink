import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNotification } from '../context/NotificationContext';
import {
  fetchTransporterProfile,
  fetchTransporterRatings,
  updateTransporterField,
  updateTransporterPassword,
  clearError,
  clearUpdateSuccess,
} from '../store/slices/transporterSlice';

export const useTransporterProfile = () => {
  const dispatch = useDispatch();
  const { profile, ratings, loading, error, updateSuccess } = useSelector((state) => state.transporter);
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('personal');

  const switchTab = (tabId) => {
    setActiveTab(tabId);
  };

  useEffect(() => {
    dispatch(fetchTransporterProfile());
    dispatch(fetchTransporterRatings());
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
    ratings,
    loading,
    error,
    activeTab,
    switchTab,
    dispatch,
    updateTransporterField,
    updateTransporterPassword,
  };
};