import React, { useEffect, useState, useCallback } from 'react';
import { useTransporterOrders } from '../../hooks/useTransporterOrders';
import OrderCard from '../../components/common/OrderCard';
import AssignVehicleModal from '../../components/common/AssignVehicleModal';
import './TransporterOrders.css';
import Header from '../../components/common/Header';

const TransporterOrders = () => {
  const {
    orders,
    vehicles,
    loading,
    error,
    loadOrders,
    loadVehicles,
    assignVehicleToOrder,
    unassignVehicleFromOrder,
    startTransit,
    filterOrders,
  } = useTransporterOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadOrders().catch(err => {
      console.error('Error loading orders:', err);
    });
    loadVehicles().catch(err => {
      console.error('Error loading vehicles:', err);
    });
  }, [loadOrders, loadVehicles]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterOrders(value, statusFilter);
  };

  const handleStatusFilter = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    filterOrders(searchTerm, value);
  };

  const handleAssign = useCallback((order) => {
    console.log('Opening assign modal for order:', order._id);
    setSelectedOrder(order);
    setShowAssignModal(true);
  }, []);

  const handleUnassign = useCallback(async (order) => {
    if (window.confirm('Are you sure you want to unassign this vehicle?')) {
      try {
        await unassignVehicleFromOrder(order.tripId || order._id, order._id);
        loadOrders();
      } catch (err) {
        console.error('Failed to unassign vehicle:', err);
      }
    }
  }, [unassignVehicleFromOrder, loadOrders]);

  const handleStartTransit = useCallback(async (order) => {
    if (window.confirm('Are you sure you want to start transit for this order?')) {
      try {
        await startTransit(order._id);
        await loadOrders();
      } catch (err) {
        console.error('Failed to start transit:', err);
        alert('Failed to start transit. Please try again.');
      }
    }
  }, [startTransit, loadOrders]);

  const handleTrackOrder = useCallback((orderId) => {
    // Navigate to track order page
    window.location.href = `/transporter/orders/${orderId}/track`;
  }, []);

  const handleViewDetails = (orderId) => {
    // Navigate to order details page
    window.location.href = `/transporter/orders/${orderId}`;
  };

  const handleConfirmAssignment = useCallback(async (vehicleId) => {
    if (!vehicleId || !selectedOrder) {
      alert('Please select a vehicle');
      console.error('Missing vehicleId or selectedOrder:', { vehicleId, selectedOrder });
      return;
    }

    try {
      console.log('TransporterOrders: Assigning vehicle:', vehicleId, 'to order:', selectedOrder._id);
      const result = await assignVehicleToOrder(selectedOrder._id, vehicleId);
      console.log('TransporterOrders: Assignment result:', result);
      alert('Vehicle assigned successfully!');
      setShowAssignModal(false);
      setSelectedOrder(null);
      // Reload orders to get updated assignment data
      await loadOrders();
      console.log('TransporterOrders: Orders reloaded after assignment');
    } catch (err) {
      console.error('TransporterOrders: Failed to assign vehicle - Full error:', err);
      console.error('TransporterOrders: Error details:', {
        message: err.message,
        status: err.status,
        payload: err.payload
      });
      alert(`Failed to assign vehicle: ${err.message || 'Unknown error'}`);
    }
  }, [selectedOrder, assignVehicleToOrder, loadOrders]);

  const handleCloseModal = useCallback(() => {
    console.log('Closing assign modal');
    setShowAssignModal(false);
    setSelectedOrder(null);
  }, []);

  return (
    <>
    <Header />
    <br></br><br></br>
    <div className="orders-container">
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

      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
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
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              onStartTransit={handleStartTransit}
              onTrackOrder={handleTrackOrder}
            />
          ))}
        </div>
      )}

      <AssignVehicleModal
        isOpen={showAssignModal}
        onClose={handleCloseModal}
        order={selectedOrder}
        vehicles={vehicles}
        onConfirm={handleConfirmAssignment}
      />
    </div>
    </>
  );
};

export default TransporterOrders;
