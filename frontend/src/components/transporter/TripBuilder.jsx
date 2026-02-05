/**
 * Trip Builder Component
 * Allows transporters to create trips, assign vehicles, add orders, and schedule
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  createTrip,
  assignVehicleToTrip,
  addOrdersToTrip,
  scheduleTrip,
  clearBuilderTrip,
  clearErrors,
} from '../../store/slices/tripSlice';
import { fetchTransporterProfile } from '../../store/slices/transporterSlice';
import { fetchTransporterOrders } from '../../store/slices/transporterOrdersSlice';
import Header from '../common/Header';
import Footer from '../common/Footer';
import './TripBuilder.css';

const TripBuilder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { builderTrip, builderLoading, builderError } = useSelector(state => state.trips);
  const { profile } = useSelector(state => state.transporter);
  const { orders: assignedOrders } = useSelector(state => state.transporterOrders);
  
  // Form state
  const [tripName, setTripName] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [step, setStep] = useState(1); // 1: Create, 2: Vehicle, 3: Orders, 4: Review
  
  useEffect(() => {
    // Load transporter profile to get fleet
    dispatch(fetchTransporterProfile());
    // Load assigned orders (status = 'Assigned')
    dispatch(fetchTransporterOrders({ status: 'Assigned' }));
    
    return () => {
      dispatch(clearBuilderTrip());
      dispatch(clearErrors());
    };
  }, [dispatch]);
  
  // Step 1: Create Trip
  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!tripName.trim()) {
      alert('Please enter a trip name');
      return;
    }
    
    try {
      await dispatch(createTrip({
        name: tripName,
        notes: tripNotes,
      })).unwrap();
      setStep(2); // Move to vehicle selection
    } catch (err) {
      console.error('Failed to create trip:', err);
    }
  };
  
  // Step 2: Assign Vehicle
  const handleAssignVehicle = async () => {
    if (!selectedVehicle) {
      alert('Please select a vehicle');
      return;
    }
    
    try {
      await dispatch(assignVehicleToTrip({
        tripId: builderTrip._id,
        vehicleId: selectedVehicle,
      })).unwrap();
      setStep(3); // Move to order selection
    } catch (err) {
      console.error('Failed to assign vehicle:', err);
    }
  };
  
  // Step 3: Add Orders
  const handleAddOrders = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }
    
    try {
      await dispatch(addOrdersToTrip({
        tripId: builderTrip._id,
        orderIds: selectedOrders,
      })).unwrap();
      setStep(4); // Move to review
    } catch (err) {
      console.error('Failed to add orders:', err);
    }
  };
  
  // Step 4: Schedule Trip
  const handleScheduleTrip = async () => {
    if (!window.confirm('Schedule this trip? This will generate stops and OTPs.')) {
      return;
    }
    
    try {
      await dispatch(scheduleTrip(builderTrip._id)).unwrap();
      alert('Trip scheduled successfully!');
      navigate(`/transporter/trips/${builderTrip._id}`);
    } catch (err) {
      console.error('Failed to schedule trip:', err);
    }
  };
  
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };
  
  // Get available fleet vehicles
  const availableVehicles = profile?.fleet?.filter(v => v.status === 'Available') || [];
  
  // Get assigned orders not in current trip
  const availableOrders = assignedOrders?.filter(order =>
    order.status === 'Assigned' && !order.trip_id
  ) || [];
  
  return (
    <div className="trip-builder-page">
      <Header />
      <div className="trip-builder-container">
        <div className="trip-builder-header">
          <h1>Trip Builder</h1>
          <button
            className="btn-cancel"
            onClick={() => navigate('/transporter/trips')}
          >
            Cancel
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="trip-steps">
          <div className={`trip-builder-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="trip-builder-step-number">1</span>
            <span className="trip-builder-step-label">Create Trip</span>
          </div>
          <div className={`trip-builder-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="trip-builder-step-number">2</span>
            <span className="trip-builder-step-label">Assign Vehicle</span>
          </div>
          <div className={`trip-builder-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="trip-builder-step-number">3</span>
            <span className="trip-builder-step-label">Add Orders</span>
          </div>
          <div className={`trip-builder-step ${step >= 4 ? 'active' : ''}`}>
            <span className="trip-builder-step-number">4</span>
            <span className="trip-builder-step-label">Review & Schedule</span>
          </div>
        </div>
        
        {builderError && (
          <div className="trip-error-message">{builderError}</div>
        )}
        
        {/* Step 1: Create Trip */}
        {step === 1 && (
          <div className="trip-builder-step-content">
            <h2>Create New Trip</h2>
            <form onSubmit={handleCreateTrip}>
              <div className="trip-form-group">
                <label htmlFor="tripName">Trip Name *</label>
                <input
                  type="text"
                  id="tripName"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., North Zone Delivery"
                  required
                />
              </div>
              <div className="trip-form-group">
                <label htmlFor="tripNotes">Notes (Optional)</label>
                <textarea
                  id="tripNotes"
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Additional notes about this trip..."
                  rows={4}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={builderLoading}
              >
                {builderLoading ? 'Creating...' : 'Create Trip'}
              </button>
            </form>
          </div>
        )}
        
        {/* Step 2: Assign Vehicle */}
        {step === 2 && builderTrip && (
          <div className="trip-builder-step-content">
            <h2>Assign Vehicle to Trip</h2>
            <p className="trip-builder-step-description">
              Select an available vehicle for this trip. The vehicle will be locked for this trip duration.
            </p>
            
            {availableVehicles.length === 0 ? (
              <div className="trip-no-data">
                <p>No available vehicles. All vehicles are either on trip or in maintenance.</p>
              </div>
            ) : (
              <div className="trip-vehicle-list">
                {availableVehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className={`trip-vehicle-card ${selectedVehicle === vehicle._id ? 'selected' : ''}`}
                    onClick={() => setSelectedVehicle(vehicle._id)}
                  >
                    <div className="trip-vehicle-info">
                      <h3>{vehicle.vehicle_number}</h3>
                      <p><strong>Type:</strong> {vehicle.truck_type}</p>
                      <p><strong>Capacity:</strong> {vehicle.capacity_tons} tons</p>
                      <p><strong>Status:</strong> <span className="status-available">{vehicle.status}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="trip-builder-step-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep(1)}
                disabled={builderLoading}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleAssignVehicle}
                disabled={builderLoading || !selectedVehicle}
              >
                {builderLoading ? 'Assigning...' : 'Assign Vehicle'}
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Add Orders */}
        {step === 3 && builderTrip && (
          <div className="trip-builder-step-content">
            <h2>Add Orders to Trip</h2>
            <p className="trip-builder-step-description">
              Select orders to include in this trip. Only assigned orders are available.
            </p>
            
            {availableOrders.length === 0 ? (
              <div className="trip-no-data">
                <p>No available orders. All assigned orders are already in trips.</p>
              </div>
            ) : (
              <div className="trip-order-list">
                {availableOrders.map((order) => (
                  <div
                    key={order._id}
                    className={`trip-order-card ${selectedOrders.includes(order._id) ? 'selected' : ''}`}
                    onClick={() => toggleOrderSelection(order._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order._id)}
                      onChange={() => toggleOrderSelection(order._id)}
                    />
                    <div className="trip-order-info">
                      <h3>Order #{order._id.slice(-6)}</h3>
                      <p><strong>Pickup:</strong> {order.pickup_location?.address}</p>
                      <p><strong>Dropoff:</strong> {order.dropoff_location?.address}</p>
                      <p><strong>Weight:</strong> {order.cargo_weight} kg</p>
                      <p><strong>Customer:</strong> {order.customer_id?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="trip-selected-summary">
              <p>{selectedOrders.length} order(s) selected</p>
            </div>
            
            <div className="trip-builder-step-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep(2)}
                disabled={builderLoading}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleAddOrders}
                disabled={builderLoading || selectedOrders.length === 0}
              >
                {builderLoading ? 'Adding...' : 'Add Orders'}
              </button>
            </div>
          </div>
        )}
        
        {/* Step 4: Review & Schedule */}
        {step === 4 && builderTrip && (
          <div className="trip-builder-step-content">
            <h2>Review & Schedule Trip</h2>
            <p className="trip-builder-step-description">
              Review trip details and confirm to schedule. This will generate stops and OTPs.
            </p>
            
            <div className="trip-builder-review">
              <div className="trip-review-section">
                <h3>Trip Details</h3>
                <p><strong>Name:</strong> {builderTrip.name}</p>
                {builderTrip.notes && <p><strong>Notes:</strong> {builderTrip.notes}</p>}
                <p><strong>Status:</strong> <span className="status-planned">{builderTrip.status}</span></p>
              </div>
              
              <div className="trip-review-section">
                <h3>Vehicle</h3>
                <p><strong>Number:</strong> {builderTrip.vehicle_id?.vehicle_number}</p>
                <p><strong>Type:</strong> {builderTrip.vehicle_id?.truck_type}</p>
                <p><strong>Capacity:</strong> {builderTrip.vehicle_id?.capacity_tons} tons</p>
              </div>
              
              <div className="trip-review-section">
                <h3>Orders ({builderTrip.order_ids?.length})</h3>
                <ul className="trip-orders-summary">
                  {builderTrip.order_ids?.map((order, idx) => (
                    <li key={order._id || idx}>
                      Order #{(order._id || '').slice(-6)} - {order.pickup_location?.address} → {order.dropoff_location?.address}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="trip-builder-step-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep(3)}
                disabled={builderLoading}
              >
                Back
              </button>
              <button
                className="btn-primary btn-schedule"
                onClick={handleScheduleTrip}
                disabled={builderLoading}
              >
                {builderLoading ? 'Scheduling...' : 'Schedule Trip'}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TripBuilder;
