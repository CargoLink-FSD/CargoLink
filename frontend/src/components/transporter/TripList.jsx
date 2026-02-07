/**
 * Trip List Component
 * Shows all trips with filters and navigation to builder/dashboard
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTrips, deleteTrip } from '../../store/slices/tripSlice';
import Header from '../common/Header';
import Footer from '../common/Footer';
import './TripList.css';

const TripList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { trips, loading, error } = useSelector(state => state.trips);
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    const filters = statusFilter !== 'all' ? { status: statusFilter } : {};
    dispatch(fetchTrips(filters));
  }, [dispatch, statusFilter]);
  
  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Delete this trip? This action cannot be undone.')) {
      return;
    }
    
    try {
      await dispatch(deleteTrip(tripId)).unwrap();
      alert('Trip deleted successfully');
    } catch (err) {
      console.error('Failed to delete trip:', err);
      alert(err || 'Failed to delete trip');
    }
  };
  
  const handleViewTrip = (trip) => {
    if (trip.status === 'Scheduled' || trip.status === 'InTransit') {
      navigate(`/transporter/trips/${trip._id}/execute`);
    } else {
      navigate(`/transporter/trips/${trip._id}`);
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'Planned': 'status-planned',
      'Scheduled': 'status-scheduled',
      'InTransit': 'status-intransit',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled',
    };
    return colors[status] || '';
  };
  
  const filteredTrips = trips || [];
  
  return (
    <div className="trip-list-page">
      <Header />
      <div className="trip-list-container">
        <div className="trip-list-header">
          <h1>My Trips</h1>
          <button
            className="btn-create-trip"
            onClick={() => navigate('/transporter/trips/create')}
          >
            + Create New Trip
          </button>
        </div>
        
        {/* Filters */}
        <div className="trip-filters-section">
          <div className="trip-filter-group">
            <label htmlFor="statusFilter">Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="Planned">Planned</option>
              <option value="Scheduled">Scheduled</option>
              <option value="InTransit">In Transit</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        {error && (
          <div className="trip-error-message">{error}</div>
        )}
        
        {loading && (
          <div className="trip-loading-state">
            <p>Loading trips...</p>
          </div>
        )}
        
        {!loading && filteredTrips.length === 0 && (
          <div className="trip-empty-state">
            <h2>No trips found</h2>
            <p>Create a new trip to get started with multi-order deliveries.</p>
            <button
              className="btn-create-trip"
              onClick={() => navigate('/transporter/trips/create')}
            >
              Create Your First Trip
            </button>
          </div>
        )}
        
        {!loading && filteredTrips.length > 0 && (
          <div className="trips-grid">
            {filteredTrips.map((trip) => (
              <div key={trip._id} className="trip-card">
                <div className="trip-card-header">
                  <h3>{trip.name}</h3>
                  <span className={`status-badge ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>
                
                <div className="trip-card-body">
                  <div className="trip-info-row">
                    <span className="trip-info-label">Vehicle:</span>
                    <span className="trip-info-value">
                      {trip.vehicle_id?.vehicle_number || 'Not assigned'}
                    </span>
                  </div>
                  <div className="trip-info-row">
                    <span className="trip-info-label">Orders:</span>
                    <span className="trip-info-value">
                      {trip.order_ids?.length || 0} orders
                    </span>
                  </div>
                  {trip.stops && trip.stops.length > 0 && (
                    <div className="trip-info-row">
                      <span className="trip-info-label">Stops:</span>
                      <span className="trip-info-value">
                        {trip.stops.filter(s => s.status === 'Done').length} / {trip.stops.length} completed
                      </span>
                    </div>
                  )}
                  {trip.started_at && (
                    <div className="trip-info-row">
                      <span className="trip-info-label">Started:</span>
                      <span className="trip-info-value">
                        {new Date(trip.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {trip.completed_at && (
                    <div className="trip-info-row">
                      <span className="trip-info-label">Completed:</span>
                      <span className="trip-info-value">
                        {new Date(trip.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {trip.notes && (
                    <div className="trip-notes">
                      <em>{trip.notes}</em>
                    </div>
                  )}
                </div>
                
                <div className="trip-card-actions">
                  <button
                    className="btn-view"
                    onClick={() => handleViewTrip(trip)}
                  >
                    {trip.status === 'Scheduled' || trip.status === 'InTransit'
                      ? 'Execute Trip'
                      : 'View Details'}
                  </button>
                  {trip.status === 'Planned' && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteTrip(trip._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TripList;
