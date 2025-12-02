import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCustomerOrders, 
  deleteCustomerOrder,
  setSearchTerm,
  setStatusFilter,
  selectFilteredOrders,
  selectOrdersLoading,
  selectOrdersError
} from '../../store/slices/ordersSlice';
import { useNotification } from '../../context/NotificationContext';
import OrderCard from '../../components/common/OrderCard';
import './CustomerOrders.css';
import Header from '../../components/common/Header';

export default function CustomerOrders() {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  const orders = useSelector(selectFilteredOrders);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);
  const filters = useSelector(state => state.orders.filters);

  useEffect(() => {
    dispatch(fetchCustomerOrders());
  }, [dispatch]);

  const handleSearchChange = (e) => {
    dispatch(setSearchTerm(e.target.value));
  };

  const handleStatusChange = (e) => {
    dispatch(setStatusFilter(e.target.value));
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await dispatch(deleteCustomerOrder(orderId)).unwrap();
        showNotification({ message: 'Order deleted successfully', type: 'success' });
      } catch (err) {
        showNotification({ message: 'Failed to delete order', type: 'error' });
      }
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      try {
        await dispatch(deleteCustomerOrder(orderId)).unwrap();
        showNotification({ message: 'Order cancelled successfully', type: 'success' });
        dispatch(fetchCustomerOrders());
      } catch (err) {
        showNotification({ message: 'Failed to cancel order', type: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <Header />
    <br></br><br></br>
    <div className="orders-container">
      <div className="orders-header">
        <h1>My Orders</h1>
        
        <div className="orders-filters">
          <input
            type="text"
            placeholder="Search by order ID or location..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          
          <select
            value={filters.statusFilter}
            onChange={handleStatusChange}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="Placed">Placed</option>
            <option value="Bidding">Bidding</option>
            <option value="Assigned">Assigned</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          
          <h3>No Orders Found</h3>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              variant="customer"
              onDelete={handleDeleteOrder}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
