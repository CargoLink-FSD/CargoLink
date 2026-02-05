/**
 * Active Trip Dashboard
 * Allows transporters to execute trips - arrive at stops, confirm pickups/dropoffs, complete trip
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchTripDetails,
  startTrip,
  arriveAtStop,
  confirmPickup,
  confirmDropoff,
  completeTrip,
  clearErrors,
} from '../../store/slices/tripSlice';
import Header from '../common/Header';
import Footer from '../common/Footer';
import './ActiveTripDashboard.css';

const ActiveTripDashboard = () => {
  const { tripId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { activeTrip, loading, error } = useSelector(state => state.trips);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  
  useEffect(() => {
    if (tripId) {
      dispatch(fetchTripDetails(tripId));
    }
    
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch, tripId]);
  
  // Auto-refresh every 30 seconds for updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (tripId && activeTrip?.status === 'InTransit') {
        dispatch(fetchTripDetails(tripId));
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch, tripId, activeTrip]);
  
  const handleStartTrip = async () => {
    if (!window.confirm('Start this trip? The vehicle will begin executing stops.')) {
      return;
    }
    
    try {
      await dispatch(startTrip(tripId)).unwrap();
      alert('Trip started successfully!');
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };
  
  const handleArriveAtStop = async (stop) => {
    try {
      await dispatch(arriveAtStop({
        tripId,
        seq: stop.seq,
      })).unwrap();
    } catch (err) {
      console.error('Failed to mark arrival:', err);
    }
  };
  
  const handleConfirmPickup = async (stop) => {
    setSelectedStop(stop);
    setOtpInput('');
    setShowOtpModal(true);
  };
  
  const handleOtpSubmit = async () => {
    if (!otpInput || otpInput.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }
    
    try {
      await dispatch(confirmPickup({
        tripId,
        seq: selectedStop.seq,
        otp: otpInput,
      })).unwrap();
      setShowOtpModal(false);
      setSelectedStop(null);
      setOtpInput('');
      alert('Pickup confirmed successfully!');
    } catch (err) {
      console.error('Failed to confirm pickup:', err);
      alert(err || 'Invalid OTP. Please try again.');
    }
  };
  
  const handleConfirmDropoff = async (stop) => {
    if (!window.confirm('Confirm dropoff completion?')) {
      return;
    }
    
    try {
      await dispatch(confirmDropoff({
        tripId,
        seq: stop.seq,
      })).unwrap();
      alert('Dropoff confirmed!');
    } catch (err) {
      console.error('Failed to confirm dropoff:', err);
    }
  };
  
  const handleCompleteTrip = async () => {
    if (!window.confirm('Complete this trip? The vehicle will be freed.')) {
      return;
    }
    
    try {
      await dispatch(completeTrip(tripId)).unwrap();
      alert('Trip completed successfully! Vehicle is now available.');
      navigate('/transporter/trips');
    } catch (err) {
      console.error('Failed to complete trip:', err);
    }
  };
  
  if (loading && !activeTrip) {
    return (
      <div className="active-trip-page">
        <Header />
        <div className="trip-exec-loading-container">
          <p>Loading trip details...</p>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!activeTrip) {
    return (
      <div className="active-trip-page">
        <Header />
        <div className="trip-exec-error-container">
          <p>Trip not found</p>
          <button onClick={() => navigate('/transporter/trips')}>
            Back to Trips
          </button>
        </div>
        <Footer />
      </div>
    );
  }
  
  const currentStop = activeTrip.stops?.find(s => s.status !== 'Done');
  const completedStops = activeTrip.stops?.filter(s => s.status === 'Done').length || 0;
  const totalStops = activeTrip.stops?.length || 0;
  const progressPercent = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
  
  return (
    <div className="active-trip-page">
      <Header />
      <div className="active-trip-container">
        <div className="trip-header-section">
          <div>
            <h1>{activeTrip.name}</h1>
            <p className="trip-id">Trip ID: {activeTrip._id}</p>
          </div>
          <div className="trip-status-badge">
            <span className={`status-${activeTrip.status.toLowerCase()}`}>
              {activeTrip.status}
            </span>
          </div>
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {/* Trip Info */}
        <div className="trip-info-grid">
          <div className="trip-exec-info-card">
            <h3>Vehicle</h3>
            <p><strong>{activeTrip.vehicle_id?.vehicle_number}</strong></p>
            <p>{activeTrip.vehicle_id?.truck_type}</p>
          </div>
          <div className="trip-exec-info-card">
            <h3>Progress</h3>
            <p><strong>{completedStops} / {totalStops}</strong> stops completed</p>
            <div className="trip-exec-progress-bar">
              <div className="trip-exec-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="trip-exec-info-card">
            <h3>Orders</h3>
            <p><strong>{activeTrip.order_ids?.length || 0}</strong> orders</p>
            {activeTrip.started_at && (
              <p className="trip-exec-text-muted">
                Started: {new Date(activeTrip.started_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        {activeTrip.status === 'Scheduled' && (
          <div className="trip-exec-action-section">
            <button
              className="btn-start-trip"
              onClick={handleStartTrip}
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Start Trip'}
            </button>
          </div>
        )}
        
        {activeTrip.status === 'InTransit' && completedStops === totalStops && (
          <div className="trip-exec-action-section">
            <button
              className="btn-complete-trip"
              onClick={handleCompleteTrip}
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Complete Trip'}
            </button>
          </div>
        )}
        
        {/* Current Stop Highlight */}
        {activeTrip.status === 'InTransit' && currentStop && (
          <div className="current-stop-section">
            <h2>Current Stop</h2>
            <div className="current-stop-card">
              <div className="trip-exec-stop-header">
                <span className="stop-seq">Stop {currentStop.seq}</span>
                <span className={`stop-type stop-type-${currentStop.type.toLowerCase()}`}>
                  {currentStop.type}
                </span>
                <span className={`stop-status status-${currentStop.status.toLowerCase()}`}>
                  {currentStop.status}
                </span>
              </div>
              <div className="trip-exec-stop-details">
                <p><strong>Order:</strong> #{currentStop.order_id?._id?.slice(-6)}</p>
                <p><strong>Location:</strong> {
                  currentStop.type === 'PICKUP'
                    ? currentStop.order_id?.pickup_location?.address
                    : currentStop.order_id?.dropoff_location?.address
                }</p>
                {currentStop.type === 'PICKUP' && currentStop.otp && (
                  <p className="otp-info"><strong>OTP Required:</strong> Customer will provide 6-digit code</p>
                )}
              </div>
              <div className="trip-exec-stop-actions">
                {currentStop.status === 'Pending' && (
                  <button
                    className="btn-arrive"
                    onClick={() => handleArriveAtStop(currentStop)}
                    disabled={loading}
                  >
                    Mark Arrived
                  </button>
                )}
                {currentStop.status === 'Arrived' && currentStop.type === 'PICKUP' && (
                  <button
                    className="btn-confirm-pickup"
                    onClick={() => handleConfirmPickup(currentStop)}
                    disabled={loading}
                  >
                    Confirm Pickup (Enter OTP)
                  </button>
                )}
                {currentStop.status === 'Arrived' && currentStop.type === 'DROPOFF' && (
                  <button
                    className="btn-confirm-dropoff"
                    onClick={() => handleConfirmDropoff(currentStop)}
                    disabled={loading}
                  >
                    Confirm Dropoff
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* All Stops Timeline */}
        <div className="stops-timeline-section">
          <h2>Trip Timeline</h2>
          <div className="trip-stops-timeline">
            {activeTrip.stops?.map((stop, index) => (
              <div
                key={stop._id || index}
                className={`timeline-item ${stop.status.toLowerCase()} ${currentStop?.seq === stop.seq ? 'current' : ''}`}
              >
                <div className="trip-timeline-marker">
                  <span className="trip-marker-number">{stop.seq}</span>
                </div>
                <div className="trip-timeline-content">
                  <div className="trip-timeline-header">
                    <span className={`stop-type-badge ${stop.type.toLowerCase()}`}>
                      {stop.type}
                    </span>
                    <span className={`status-badge ${stop.status.toLowerCase()}`}>
                      {stop.status}
                    </span>
                  </div>
                  <p className="order-ref">Order #{stop.order_id?._id?.slice(-6)}</p>
                  <p className="location">
                    {stop.type === 'PICKUP'
                      ? stop.order_id?.pickup_location?.address
                      : stop.order_id?.dropoff_location?.address}
                  </p>
                  {stop.arrived_at && (
                    <p className="timestamp">
                      Arrived: {new Date(stop.arrived_at).toLocaleTimeString()}
                    </p>
                  )}
                  {stop.done_at && (
                    <p className="timestamp">
                      Completed: {new Date(stop.done_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* OTP Modal */}
      {showOtpModal && (
        <div className="trip-otp-modal-overlay" onClick={() => setShowOtpModal(false)}>
          <div className="trip-otp-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Enter Pickup OTP</h3>
            <p>Ask the customer for the 6-digit OTP to confirm pickup.</p>
            <input
              type="text"
              maxLength="6"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="trip-otp-input"
              autoFocus
            />
            <div className="trip-otp-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowOtpModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleOtpSubmit}
                disabled={loading || otpInput.length !== 6}
              >
                {loading ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default ActiveTripDashboard;
