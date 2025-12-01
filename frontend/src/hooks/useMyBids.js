/**
 * Custom hook for managing transporter's own bids
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBids } from '../store/slices/bidsSlice';
import { useNotification } from '../context/NotificationContext';

export function useMyBids() {
  const dispatch = useDispatch();
  const { myBids, loading, error } = useSelector((state) => state.bids);
  const { showError } = useNotification();

  useEffect(() => {
    dispatch(fetchMyBids());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  return {
    myBids,
    loading,
    error,
  };
}
