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
  fetchTransporterVehicles,
  assignVehicle,
  unassignVehicle,
  startOrderTransit,
  completeOrderTrip,
  setSearchTerm,
  setStatusFilter,
  clearCurrentOrder,
  clearError,
  selectFilteredTransporterOrders,
  selectAvailableOrders,
  selectCurrentTransporterOrder,
  selectTransporterBids,
  selectTransporterVehicles,
  selectTransporterOrdersLoading,
  selectTransporterOrdersError,
} from '../store/slices/transporterOrdersSlice';

export const useTransporterOrders = () => {
  const dispatch = useDispatch();

  const orders = useSelector(selectFilteredTransporterOrders);
  const availableOrders = useSelector(selectAvailableOrders);
  const currentOrder = useSelector(selectCurrentTransporterOrder);
  const bids = useSelector(selectTransporterBids);
  const vehicles = useSelector(selectTransporterVehicles);
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

  // Fetch transporter's vehicles
  const loadVehicles = useCallback(() => {
    return dispatch(fetchTransporterVehicles());
  }, [dispatch]);

  // Assign vehicle to order
  const assignVehicleToOrder = useCallback((orderId, vehicleId) => {
    return dispatch(assignVehicle({ orderId, vehicleId }));
  }, [dispatch]);

  // Unassign vehicle from order
  const unassignVehicleFromOrder = useCallback((tripId, orderId) => {
    return dispatch(unassignVehicle({ tripId, orderId }));
  }, [dispatch]);

  // Start transit for an order
  const startTransit = useCallback((orderId) => {
    return dispatch(startOrderTransit(orderId));
  }, [dispatch]);

  // Complete trip
  const completeTrip = useCallback((tripId) => {
    return dispatch(completeOrderTrip(tripId));
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
    vehicles,
    loading,
    error,

    // Actions
    loadOrders,
    loadAvailableOrders,
    loadOrderDetails,
    placeBid,
    removeBid,
    loadBids,
    loadVehicles,
    assignVehicleToOrder,
    unassignVehicleFromOrder,
    startTransit,
    completeTrip,
    filterOrders,
    clearOrder,
    clearErrorState,
    refresh,
  };
};

export default useTransporterOrders;
