// Custom hook for transporter orders using Redux

import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTransporterOrders,
  fetchAvailableOrders,
  fetchTransporterOrderDetails,
  submitOrderBid,
  withdrawOrderBid,
  fetchTransporterBids,
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
  const loadOrders = () => {
    return dispatch(fetchTransporterOrders());
  };

  // Fetch available orders for bidding
  const loadAvailableOrders = () => {
    return dispatch(fetchAvailableOrders());
  };

  // Fetch single order details
  const loadOrderDetails = (orderId) => {
    return dispatch(fetchTransporterOrderDetails(orderId));
  };

  // Submit a bid on an order
  const placeBid = (orderId, bidData) => {
    return dispatch(submitOrderBid({ orderId, bidData }));
  };

  // Withdraw a bid
  const removeBid = (orderId, bidId) => {
    return dispatch(withdrawOrderBid({ orderId, bidId }));
  };

  // Fetch transporter's bids
  const loadBids = () => {
    return dispatch(fetchTransporterBids());
  };

  // Assign vehicle to order
  const assignVehicleToOrder = (tripId, orderId, truckId) => {
    return dispatch(assignVehicle({ tripId, orderId, truckId }));
  };

  // Unassign vehicle from order
  const unassignVehicleFromOrder = (tripId, orderId) => {
    return dispatch(unassignVehicle({ tripId, orderId }));
  };

  // Start transit for an order
  const startTransit = (tripId) => {
    return dispatch(startOrderTransit(tripId));
  };

  // Complete trip
  const completeTrip = (tripId) => {
    return dispatch(completeOrderTrip(tripId));
  };

  // Filter orders
  const filterOrders = (searchTerm, statusFilter) => {
    if (searchTerm !== undefined) {
      dispatch(setSearchTerm(searchTerm));
    }
    if (statusFilter !== undefined) {
      dispatch(setStatusFilter(statusFilter));
    }
  };

  // Clear current order
  const clearOrder = () => {
    dispatch(clearCurrentOrder());
  };

  // Clear error
  const clearErrorState = () => {
    dispatch(clearError());
  };

  // Refresh orders (re-fetch)
  const refresh = () => {
    return dispatch(fetchTransporterOrders());
  };

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
