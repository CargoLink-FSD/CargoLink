import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import MapDisplay from '../../components/common/MapDisplay';
import {
  getDriverTripDetails, startTrip, arriveAtStop, confirmPickup,
  confirmDelivery, departFromStop, declareDelay, clearDelay, updateTripLocation,
} from '../../api/trips';
import '../../styles/ActiveTrip.css';

const STATUS_COLORS = {
  Scheduled: '#1976d2', Active: '#388e3c',
  Completed: '#00796b', Cancelled: '#757575',
};

const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
const formatDate = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};


const toLatLng = (coords) => {
  if (!coords || coords.length < 2) return null;
  const a = Number(coords[0]), b = Number(coords[1]);
  if (isNaN(a) || isNaN(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  if (a > 50 && b < 40) return [b, a];
  return [a, b];
};

const toOsrmCoord = (coords) => {
  const ll = toLatLng(coords);
  if (!ll) return null;
  return `${ll[1]},${ll[0]}`;
};

const ActiveTrip = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // OTP
  const [otpValue, setOtpValue] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpAction, setOtpAction] = useState(null);

  // Delay
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [delayReason, setDelayReason] = useState('');

  // Driver live location for geolocation + map display
  const [driverLocation, setDriverLocation] = useState(null);
  const [etaToNext, setEtaToNext] = useState(null);
  const driverLocationRef = useRef(null);
  const etaThrottleRef = useRef(0);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Trip
  const loadTrip = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDriverTripDetails(tripId);
      setTrip(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  // Get driver live location via geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;

    const success = (pos) => {
      const loc = [pos.coords.latitude, pos.coords.longitude];
      driverLocationRef.current = loc;
      setDriverLocation(loc);
    };

    const error = (err) => {
      console.error("Geo error:", err);
    };

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update trip location on backend when driver location changes (only if trip is active)
  useEffect(() => {
    if (!trip || trip.status !== 'Active' || !driverLocation) return;
    const tripId = trip._id;

    const sendLocation = () => {
      const [lat, lng] = driverLocation;
      updateTripLocation(tripId, [lng, lat]).catch(() => { });
    };

    sendLocation();
    const interval = setInterval(sendLocation, 3000);
    return () => clearInterval(interval);
  }, [trip, driverLocation]);

  // Calculate ETA to next stop
  useEffect(() => {
    if (!trip?.stops?.length || !driverLocation) return;
    const now = Date.now();
    if (now - etaThrottleRef.current < 15000) return;
    etaThrottleRef.current = now;

    const currentIdx = trip.current_stop_index || 0;
    const nextStop = trip.stops.find((s, i) => i >= currentIdx && s.status !== 'Completed' && s.address?.coordinates?.length === 2);

    if (!nextStop) {
      setEtaToNext(null);
      return;
    }

    const coord = toOsrmCoord(nextStop.address.coordinates);
    if (!coord) return;

    const [lat, lng] = driverLocation;
    const from = `${lng},${lat}`;
    fetch(`https://router.project-osrm.org/route/v1/driving/${from};${coord}?overview=false`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.[0]) {
          const durationMin = Math.max(1, Math.round(data.routes[0].duration / 60));
          setEtaToNext(durationMin);
        }
      })
      .catch(() => { });
  }, [trip, driverLocation]);


  const handleOtpSubmit = async () => {
    if (!otpValue || otpValue.length < 4) { showToast('Enter a valid OTP'); return; }
    setActionLoading(true);
    try {
      if (otpAction.type === 'Pickup') {
        await confirmPickup(tripId, otpAction.stopId, otpValue);
      } else {
        await confirmDelivery(tripId, otpAction.stopId, otpValue);
      }
      showToast(`${otpAction.type} confirmed!`, 'success');
      setShowOtpModal(false); setOtpValue('');
      loadTrip();
    } catch (err) { showToast(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDepart = async (stopId) => {
    setActionLoading(true);
    try {
      await departFromStop(tripId, stopId);
      showToast('Departed from stop!', 'success');
      loadTrip();
    } catch (err) { showToast(err.message); }
    finally { setActionLoading(false); }
  };

  // ─── Open modals safely (no setTimeout, no stopPropagation needed) ───
  const openOtpModal = (type, stopId) => {
    setOtpAction({ type, stopId });
    setOtpValue('');
    setShowOtpModal(true);
  };

  const currentStopIndex = trip?.current_stop_index ?? 0;


  // ─── Render ───
  if (loading) {
    return (
      <>
        <Header />
        <div className="at-shell"><div className="loading-state"><div className="spinner"></div><p>Loading trip...</p></div></div>
        <Footer />
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <Header />
        <div className="at-shell"><div className="empty-state"><h3>{error || 'Trip not found'}</h3><button className="btn btn-primary" onClick={() => navigate('/driver/trips')}>Back to Trips</button></div></div>
        <Footer />
      </>
    );
  }

  const isActive = trip.status === 'Active';
  const isDone = ['Completed', 'Cancelled'].includes(trip.status);
  const statusColor = STATUS_COLORS[trip.status] || '#6366f1';

  return (
    <>
      <Header />
      {toast && <div className={`at-toast at-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="at-page">
        {/* Header Bar */}
        <div className="at-header">
          <div className="at-header-left">
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/driver/trips')}>← Trips</button>
            <div>
              <h1 className="at-title">Trip #{trip._id?.slice(-6)}</h1>
              <span className="at-status-badge" style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor }}>
                {trip.status}
              </span>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="at-layout">
          {/* Map with stats */}
          <div className="at-map-panel">
            <div className="at-card">
              <div className="at-card-header">
                <h2>Route Map</h2>
              </div>
              <div className="at-map-section">
                <div style={{ height: '600px'}}>
                  <MapDisplay 
                    stops={trip.stops} 
                    currentLocation={driverLocation}
                    tripStatus={trip.status}
                    showLive={isActive}
                    routeMode="active"
                    stats={{
                      vehicle: trip.assigned_vehicle_id?.registration,
                      distance: trip.total_distance_km ? `${trip.total_distance_km} km` : '—',
                      stops: trip.stops?.length || 0,
                      nextEta: etaToNext ? `${etaToNext} min` : '—',
                      startedAt: formatDateTime(trip.actual_start_at || trip.planned_start_at),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stops Panel */}
          <div className="at-stops-panel">
            <div className="at-panel-header">
              <h2>Stops</h2>
              <span className="at-panel-badge">{currentStopIndex} / {trip.stops?.length}</span>
            </div>

            <div className="at-stops-list">
              {trip.stops?.map((stop, idx) => {
                const isCurrent = idx === currentStopIndex && isActive;
                const isDoneStop = stop.status === 'Completed';
                const isArrived = stop.status === 'Arrived';
                const completedTime = stop.actual_departure_at || stop.actual_arrival_at || stop.completed_at;
                const etaLabel = isDoneStop
                  ? formatTime(completedTime)
                  : isCurrent
                    ? 'Now'
                    : formatTime(stop.eta_at);

                return (
                  <div key={stop._id || idx} className={`at-stop-card ${isCurrent ? 'current' : ''} ${isDoneStop ? 'done' : ''}`}>
                    <div className="at-stop-indicator">
                      <div className={`at-stop-dot ${isDoneStop ? 'done' : isCurrent ? 'active' : ''}`}>
                        {isDoneStop ? '✓' : idx + 1}
                      </div>
                      {idx < trip.stops.length - 1 && <div className="at-stop-line" />}
                    </div>
                    <div className="at-stop-content">
                      <div className="at-stop-top-row">
                        <span className={`at-stop-type-pill ${stop.type === 'Pickup' ? 'pickup' : stop.type === 'Dropoff' ? 'drop' : 'waypoint'}`}>
                          {stop.type === 'Pickup' ? '↑ Pickup' : stop.type === 'Dropoff' ? '↓ Dropoff' : '● Waypoint'}
                        </span>
                        <span className="at-stop-eta">{etaLabel}</span>
                      </div>
                      <div className="at-stop-address">
                        {stop.address?.street && <span>{stop.address.street}, </span>}
                        <strong>{stop.address?.city || 'Unknown'}</strong>
                        {stop.address?.state && <span>, {stop.address.state}</span>}
                      </div>
                      {stop.order_id && <div className="at-stop-ref">Order #{typeof stop.order_id === 'string' ? stop.order_id.slice(-6) : stop.order_id._id?.slice(-6)}</div>}

                      {isCurrent && (stop.type === 'Pickup' || stop.type === 'Dropoff') && (
                        <button
                          className="btn btn-primary btn-sm at-stop-action"
                          onClick={() => openOtpModal(stop.type, stop._id)}
                          disabled={actionLoading}
                        >
                          Verify OTP ({stop.type})
                        </button>
                      )}
                      {isCurrent && isArrived && stop.type === 'Waypoint' && (
                        <button className="btn btn-primary btn-sm at-stop-action" onClick={() => handleDepart(stop._id)} disabled={actionLoading}>
                          Depart
                        </button>
                      )}
                      {stop.status === 'Arrived' && !isCurrent && (
                        <span className="at-stop-status-badge arrived">Arrived</span>
                      )}
                      {isDoneStop && completedTime && (
                        <span className="at-stop-status-badge completed">Done {formatTime(completedTime)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isDone && (
              <div className="at-trip-done-banner">
                <span>{trip.status === 'Completed' ? 'Trip Completed' : 'Trip Cancelled'}</span>
                {trip.actual_end_at && <span className="at-done-time">{formatDate(trip.actual_end_at)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="modal-overlay" onClick={() => setShowOtpModal(false)}>
          <div className="modal-content at-otp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verify {otpAction?.type} OTP</h2>
              <button className="close-btn" onClick={() => setShowOtpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Enter the OTP provided by the {otpAction?.type === 'Pickup' ? 'shipper' : 'receiver'}.
              </p>
              <input type="text" className="at-otp-input" placeholder="Enter OTP"
                value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} autoFocus />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowOtpModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOtpSubmit} disabled={actionLoading || otpValue.length < 4}>
                {actionLoading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {showDelayModal && (
        <div className="modal-overlay" onClick={() => setShowDelayModal(false)}>
          <div className="modal-content at-delay-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Declare Delay</h2>
              <button className="close-btn" onClick={() => setShowDelayModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Delay Duration (minutes)</label>
                <input type="number" min="5" max="1440" value={delayMinutes}
                  onChange={e => setDelayMinutes(Number(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea rows={3} value={delayReason} onChange={e => setDelayReason(e.target.value)}
                  placeholder="Describe the reason for delay..." className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDelayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDeclareDelay} disabled={actionLoading}>
                {actionLoading ? 'Submitting...' : 'Declare Delay'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default ActiveTrip;