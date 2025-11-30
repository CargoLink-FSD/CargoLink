import React, { useEffect, useState, useCallback } from 'react';
import { useTransporterOrders } from '../../hooks/useTransporterOrders';
import TransporterOrderCard from '../../components/transporter/TransporterOrderCard';
import './TransporterOrders.css';
import Header from '../../components/common/Header';

const TransporterOrders = () => {
  const {
    orders,
    loading,
    error,
    loadOrders,
    assignVehicleToOrder,
    unassignVehicleFromOrder,
    startTransit,
    filterOrders,
  } = useTransporterOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    loadOrders().catch(err => {
      console.error('Error loading orders:', err);
    });
    // Load transporter's vehicles (you'll need to implement this API call)
    // For now, using mock data
    setVehicles([
      { _id: '1', vehicle_number: 'KA01AB1234', truck_type: 'Open Body' },
      { _id: '2', vehicle_number: 'KA01CD5678', truck_type: 'Container' },
      { _id: '3', vehicle_number: 'KA02EF9012', truck_type: 'Trailer' },
    ]);
  }, []);

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

  const handleAssign = (order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleUnassign = async (order) => {
    if (window.confirm('Are you sure you want to unassign this vehicle?')) {
      try {
        // Assuming order has tripId - you may need to adjust based on your data structure
        await unassignVehicleFromOrder(order.tripId || order._id, order._id);
        loadOrders();
      } catch (err) {
        console.error('Failed to unassign vehicle:', err);
      }
    }
  };

  const handleStartTransit = async (order) => {
    if (window.confirm('Are you sure you want to start transit for this order?')) {
      try {
        // Assuming order has tripId - you may need to adjust based on your data structure
        await startTransit(order.tripId || order._id);
        loadOrders();
      } catch (err) {
        console.error('Failed to start transit:', err);
      }
    }
  };

  const handleTrackOrder = (orderId) => {
    // Navigate to track order page
    window.location.href = `/transporter/orders/${orderId}/track`;
  };

  const handleViewDetails = (orderId) => {
    // Navigate to order details page
    window.location.href = `/transporter/orders/${orderId}`;
  };

  const handleConfirmAssignment = async () => {
    if (!selectedVehicle) {
      alert('Please select a vehicle');
      return;
    }

    try {
      // Assuming selectedOrder has tripId - you may need to adjust based on your data structure
      await assignVehicleToOrder(
        selectedOrder.tripId || selectedOrder._id,
        selectedOrder._id,
        selectedVehicle
      );
      setShowAssignModal(false);
      setSelectedOrder(null);
      setSelectedVehicle('');
      loadOrders();
    } catch (err) {
      console.error('Failed to assign vehicle:', err);
    }
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedOrder(null);
    setSelectedVehicle('');
  };

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
            <TransporterOrderCard
              key={order._id}
              order={order}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              onStartTransit={handleStartTransit}
              onTrackOrder={handleTrackOrder}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Vehicle</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="order-info">
                <p><strong>Order ID:</strong> #{selectedOrder?._id?.slice(-8).toUpperCase()}</p>
                <p><strong>Route:</strong> {selectedOrder?.pickup?.city} → {selectedOrder?.delivery?.city}</p>
                <p><strong>Truck Type:</strong> {selectedOrder?.truck_type}</p>
              </div>

              <div className="form-group">
                <label htmlFor="vehicle-select">Select Vehicle</label>
                <select
                  id="vehicle-select"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="vehicle-select"
                >
                  <option value="">-- Select a vehicle --</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {vehicle.vehicle_number} - {vehicle.truck_type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirmAssignment}>
                Assign Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default TransporterOrders;
