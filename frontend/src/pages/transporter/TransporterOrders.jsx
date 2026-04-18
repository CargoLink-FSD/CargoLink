import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTransporterOrders } from '../../hooks/useTransporterOrders';
import OrderCard from '../../components/common/OrderCard';
import AssignVehicleModal from '../../components/common/AssignVehicleModal';
import { PackageOpen } from 'lucide-react';
import './TransporterOrders.css';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';

const TransporterOrders = () => {
  const {
    orders,
    vehicles,
    loading,
    error,
    loadOrders,
    filterOrders,
  } = useTransporterOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      filterOrders(value, statusFilter);
    }, 400);
  };

  const handleStatusFilter = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    filterOrders(searchTerm, value);
  };


  const handleTrackOrder = useCallback((orderId) => {
    // Navigate to track order page
    window.location.href = `/transporter/orders/${orderId}/track`;
  }, []);

  const handleViewDetails = (orderId) => {
    // Navigate to order details page
    window.location.href = `/transporter/orders/${orderId}`;
  };


  return (
    <>
    <Header />
    <div className="transporter-orders-page orders-container">
      <div className="orders-header">
        <h1>My Orders</h1>
      </div>

      <div className="orders-filters">
        <input
          type="text"
          placeholder="Search by order ID or location..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />

        <select value={statusFilter} onChange={handleStatusFilter} className="status-filter">
          <option value="all">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="started">Started</option>
          <option value="in transit">In Transit</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* {error && (
        <div className="error-state">
          <div className="error-icon"></div>
          <p>{error}</p>
        </div>
      )} */}

      {!loading && !error && orders.length === 0 && (
        <div className="to-empty-state">
          <div className="empty-icon"></div>
          <h3>No orders found</h3>
          <p>You don't have any orders assigned yet.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="orders-grid">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              variant="transporter"
              onTrackOrder={handleTrackOrder}
            />
          ))}
        </div>
      )}
    </div>
    <Footer />
    </>
  );
};

export default TransporterOrders;