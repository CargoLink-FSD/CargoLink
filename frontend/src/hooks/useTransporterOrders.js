// Custom hook for transporter orders using Redux

import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchTransporterOrders,
  fetchAvailableOrders,
  fetchTransporterOrderDetails,
  submitOrderBid,
  withdrawOrderBid,
  fetchTransporterBids,
  setSearchTerm,
  setStatusFilter,
  clearCurrentOrder,
  clearError,
  selectFilteredTransporterOrders,
  selectAvailableOrders,
  selectCurrentTransporterOrder,
  selectTransporterBids,
  selectTransporterOrdersLoading,
  selectTransporterOrdersError,
} from '../store/slices/transporterOrdersSlice';

export const useTransporterOrders = () => {
  const dispatch = useDispatch();

  const orders = useSelector(selectFilteredTransporterOrders);
  const availableOrders = useSelector(selectAvailableOrders);
  const currentOrder = useSelector(selectCurrentTransporterOrder);
  const bids = useSelector(selectTransporterBids);
  const loading = useSelector(selectTransporterOrdersLoading);
  const error = useSelector(selectTransporterOrdersError);

  // Fetch transporter's assigned orders
  const loadOrders = useCallback(() => {
    return dispatch(fetchTransporterOrders());
  }, [dispatch]);

  // Fetch available orders for bidding
  const loadAvailableOrders = useCallback(() => {
    return dispatch(fetchAvailableOrders());
  }, [dispatch]);

  // Fetch single order details
  const loadOrderDetails = useCallback((orderId) => {
    return dispatch(fetchTransporterOrderDetails(orderId));
  }, [dispatch]);

  // Submit a bid on an order
  const placeBid = useCallback((orderId, bidData) => {
    return dispatch(submitOrderBid({ orderId, bidData }));
  }, [dispatch]);

  // Withdraw a bid
  const removeBid = useCallback((orderId, bidId) => {
    return dispatch(withdrawOrderBid({ orderId, bidId }));
  }, [dispatch]);

  // Fetch transporter's bids
  const loadBids = useCallback(() => {
    return dispatch(fetchTransporterBids());
  }, [dispatch]);

  // Filter orders
  const filterOrders = useCallback((searchTerm, statusFilter) => {
    if (searchTerm !== undefined) {
      dispatch(setSearchTerm(searchTerm));
    }
    if (statusFilter !== undefined) {
      dispatch(setStatusFilter(statusFilter));
    }
  }, [dispatch]);

  // Clear current order
  const clearOrder = useCallback(() => {
    dispatch(clearCurrentOrder());
  }, [dispatch]);

  // Clear error
  const clearErrorState = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Refresh orders (re-fetch)
  const refresh = useCallback(() => {
    return dispatch(fetchTransporterOrders());
  }, [dispatch]);

  return {
    // State
    orders,
    availableOrders,
    currentOrder,
    bids,
    loading,
    error,

    // Actions
    loadOrders,
    loadAvailableOrders,
    loadOrderDetails,
    placeBid,
    removeBid,
    loadBids,
    filterOrders,
    clearOrder,
    clearErrorState,
    refresh,
  };
};

export default useTransporterOrders;
