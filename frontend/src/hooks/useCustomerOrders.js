import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCustomerOrders,
  deleteCustomerOrder,
  setSearchTerm,
  setStatusFilter,
  selectFilteredOrders,
  selectOrdersLoading,
  selectOrdersError
} from '../store/slices/ordersSlice';
import { useNotification } from '../context/NotificationContext';

export function useCustomerOrders() {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  const orders = useSelector(selectFilteredOrders);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);
  const filters = useSelector(state => state.orders.filters);

  useEffect(() => {
    dispatch(fetchCustomerOrders());
  }, [dispatch]);

  const deleteOrder = async (orderId) => {
    try {
      await dispatch(deleteCustomerOrder(orderId)).unwrap();
      showNotification({ message: 'Order deleted successfully', type: 'success' });
    } catch (err) {
      showNotification({ message: 'Failed to delete order', type: 'error' });
      throw err;
    }
  };

  const filterOrders = (searchTerm, statusFilter) => {
    if (searchTerm !== filters.searchTerm) {
      dispatch(setSearchTerm(searchTerm));
    }
    if (statusFilter !== filters.statusFilter) {
      dispatch(setStatusFilter(statusFilter));
    }
  };

  const refresh = () => {
    dispatch(fetchCustomerOrders());
  };

  return {
    orders,
    loading,
    error,
    deleteOrder,
    filterOrders,
    refresh
  };
}
