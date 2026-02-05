import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransporterOrders } from '../../hooks/useTransporterOrders';

import OrderCard from '../../components/common/OrderCard';
import AssignVehicleModal from '../../components/common/AssignVehicleModal';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';

import './TransporterOrders.css';

const TransporterOrders = () => {
  const navigate = useNavigate();

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

  // Orders for trips
  const assignedOrders =
    orders?.filter((o) => o.status === 'Assigned' && !o.trip_id) || [];

  const tripManagedOrders = orders?.filter((o) => o.trip_id) || [];

  // Load data
  useEffect(() => {
    loadOrders().catch((err) => {
      console.error('Error loading orders:', err);
    });

    loadVehicles().catch((err) => {
      console.error('Error loading vehicles:', err);
    });
  }, [loadOrders, loadVehicles]);

  // Search
  const handleSearch = (e) => {
    const value = e.target.value;

    setSearchTerm(value);
    filterOrders(value, statusFilter);
  };

  // Filter
  const handleStatusFilter = (e) => {
    const value = e.target.value;

    setStatusFilter(value);
    filterOrders(searchTerm, value);
  };

  // Assign
  const handleAssign = useCallback((order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  }, []);

  // Unassign
  const handleUnassign = useCallback(
    async (order) => {
      if (!window.confirm('Unassign this vehicle?')) return;

      try {
        await unassignVehicleFromOrder(
          order.tripId || order._id,
          order._id
        );

        await loadOrders();
      } catch (err) {
        console.error('Unassign failed:', err);
      }
    },
    [unassignVehicleFromOrder, loadOrders]
  );

  // Start Transit
  const handleStartTransit = useCallback(
    async (order) => {
      if (!window.confirm('Start transit for this order?')) return;

      try {
        await startTransit(order._id);
        await loadOrders();
      } catch (err) {
        console.error('Start transit failed:', err);
        alert('Failed to start transit');
      }
    },
    [startTransit, loadOrders]
  );

  // Track
  const handleTrackOrder = useCallback((orderId) => {
    window.location.href = `/transporter/orders/${orderId}/track`;
  }, []);

  // Details
  const handleViewDetails = (orderId) => {
    window.location.href = `/transporter/orders/${orderId}`;
  };

  // Confirm assign
  const handleConfirmAssignment = useCallback(
    async (vehicleId) => {
      if (!vehicleId || !selectedOrder) {
        alert('Select a vehicle first');
        return;
      }

      try {
        await assignVehicleToOrder(selectedOrder._id, vehicleId);

        alert('Vehicle assigned');

        setShowAssignModal(false);
        setSelectedOrder(null);

        await loadOrders();
      } catch (err) {
        console.error('Assign failed:', err);

        alert(err.message || 'Assignment failed');
      }
    },
    [selectedOrder, assignVehicleToOrder, loadOrders]
  );

  // Close modal
  const handleCloseModal = useCallback(() => {
    setShowAssignModal(false);
    setSelectedOrder(null);
  }, []);

  return (
    <>
      {/* Header */}
      <Header />

      {/* Top Bar */}
      <div className="transporter-top-bar">
        <button
          className="btn-view-trips"
          onClick={() => navigate('/transporter/trips')}
        >
          View My Trips
        </button>
      </div>

      {/* Trip Banner */}
      {assignedOrders.length > 0 && (
        <div className="trip-banner">
          <div className="trip-banner-content">
            <div className="trip-banner-icon">🚚</div>

            <div className="trip-banner-text">
              <h3>Create Multi-Order Trips</h3>

              <p>
                You have{' '}
                <strong>{assignedOrders.length} assigned order(s)</strong>{' '}
                ready for trip planning.
              </p>
            </div>

            <button
              className="btn-create-trip"
              onClick={() =>
                navigate('/transporter/trips/create')
              }
            >
              Create Trip
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="orders-filters">
        <input
          type="text"
          placeholder="Search by order ID or location..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />

        <select
          value={statusFilter}
          onChange={handleStatusFilter}
          className="status-filter"
        >
          <option value="all">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="scheduled">Scheduled</option>
          <option value="intransit">In Transit</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Trip Info */}
      {tripManagedOrders.length > 0 && (
        <div className="trip-info-banner">
          <p>
            ℹ️{' '}
            <strong>{tripManagedOrders.length} order(s)</strong>{' '}
            are managed by trips. View in{' '}
            <a href="/transporter/trips">My Trips</a>.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <h3>No orders found</h3>
          <p>No assigned orders yet.</p>
        </div>
      )}

      {/* Orders Grid */}
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
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <AssignVehicleModal
        isOpen={showAssignModal}
        onClose={handleCloseModal}
        order={selectedOrder}
        vehicles={vehicles}
        onConfirm={handleConfirmAssignment}
      />

      {/* Footer */}
      <Footer />
    </>
  );
};

export default TransporterOrders;
