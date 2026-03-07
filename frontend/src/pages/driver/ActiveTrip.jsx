// src/pages/driver/ActiveTrip.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { normalizeCoordinates, getDirections, INDIA_CENTER, DEFAULT_MAP_OPTIONS } from '../../utils/googleMapsConfig';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import {
  getDriverTripDetails, startTrip, arriveAtStop, confirmPickup,
  confirmDelivery, departFromStop, declareDelay, clearDelay, updateTripLocation,
} from '../../api/trips';
import '../../styles/ActiveTrip.css';

// Normalize coords to {lat, lng}
// Normalize coords using utility function
const toLatLng = normalizeCoordinates;

const STATUS_COLORS = {
  Scheduled: '#1976d2', Active: '#388e3c',
  Completed: '#00796b', Cancelled: '#757575',
};

const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
const formatDate = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const ActiveTrip = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isLoaded, loadError } = useGoogleMaps();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // OTP
  const [otpValue, setOtpValue] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpAction, setOtpAction] = useState(null); // { type, stopId }

  // Delay
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [delayReason, setDelayReason] = useState('');

  // Map
  const [driverLocationReady, setDriverLocationReady] = useState(false);
  const [map, setMap] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const driverLocationRef = useRef(null);
  const locationWatchRef = useRef(null);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Load Trip ───
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

  // ─── Get Driver Location ───
  useEffect(() => {
    if (!navigator.geolocation) { setDriverLocationReady(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        driverLocationRef.current = [pos.coords.latitude, pos.coords.longitude];
        setDriverLocationReady(true);
      },
      () => setDriverLocationReady(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);


  // ─── Update Map Route and Markers ───
  useEffect(() => {
    if (!isLoaded || !trip?.stops) return;

    const currentIdx = trip.current_stop_index || 0;

    const remainingStops = trip.stops.filter(
      (s, i) => i >= currentIdx && s.address?.coordinates?.length === 2 && s.status !== 'Completed',
    );
    const validStops = trip.stops.filter(s => s.address?.coordinates?.length === 2);
    const stopsForRoute = remainingStops.length >= 1 ? remainingStops : validStops;

    // Build waypoints for Google Directions
    const waypoints = [];
    if (driverLocationRef.current) {
      const [dLat, dLng] = driverLocationRef.current;
      waypoints.push({ lat: dLat, lng: dLng });
    }
    stopsForRoute.forEach(s => {
      const coord = toLatLng(s.address.coordinates);
      if (coord) waypoints.push(coord);
    });

    if (waypoints.length >= 2) {
      getDirections(waypoints)
        .then(result => {
          const path = result.routes[0].overview_path;
          setRoutePath(path);
          
          // Fit bounds to route
          if (map && path.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            path.forEach(point => bounds.extend(point));
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
          }
        })
        .catch(() => setRoutePath([]));
    } else {
      setRoutePath([]);
    }
  }, [trip, isLoaded, map, driverLocationReady]);

  // ─── Live Location ───
  useEffect(() => {
    if (!trip || trip.status !== 'Active') return;
    const tripId = trip._id;

    const sendLocation = (pos) => {
      const { latitude, longitude } = pos.coords;
      driverLocationRef.current = [latitude, longitude];
      // Send as Google-style coordinate object
      updateTripLocation(tripId, { lat: latitude, lng: longitude }).catch(() => { });
    };

    if (navigator.geolocation) {
      locationWatchRef.current = navigator.geolocation.watchPosition(sendLocation, () => { }, {
        enableHighAccuracy: true, maximumAge: 10000, timeout: 15000,
      });
    }

    const interval = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(sendLocation, () => { });
    }, 30000);

    return () => {
      if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?._id, trip?.status]);

  // ─── Trip Actions ───
  const handleStartTrip = async () => {
    setActionLoading(true);
    try {
      await startTrip(tripId);
      showToast('Trip started!', 'success');
      loadTrip();
    } catch (err) { showToast(err.message); }
    finally { setActionLoading(false); }
  };

  const handleArriveAtStop = async (stopId) => {
    setActionLoading(true);
    try {
      await arriveAtStop(tripId, stopId);
      showToast('Arrived at stop!', 'success');
      loadTrip();
    } catch (err) { showToast(err.message); }
    finally { setActionLoading(false); }
  };

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

  const handleDeclareDelay = async () => {
    if (!delayReason.trim()) { showToast('Provide a reason'); return; }
    setActionLoading(true);
    try {
      await declareDelay(tripId, { delay_minutes: delayMinutes, delay_reason: delayReason });
      showToast('Delay declared', 'success');
      setShowDelayModal(false); setDelayReason('');
      loadTrip();
    } catch (err) { showToast(err.message); }
    finally { setActionLoading(false); }
  };

  const handleClearDelay = async () => {
    setActionLoading(true);
    try {
      await clearDelay(tripId);
      showToast('Delay cleared', 'success');
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

  const openDelayModal = () => {
    setShowDelayModal(true);
  };

  const currentStopIndex = trip?.current_stop_index ?? 0;

  console.log("rendering");

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
  const isScheduled = trip.status === 'Scheduled';
  const isDone = ['Completed', 'Cancelled'].includes(trip.status);
  const statusColor = STATUS_COLORS[trip.status] || '#6366f1';

  return (
    <>
      <Header />
      {toast && <div className={`at-toast at-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="at-shell">
        {/* Header Bar */}
        <div className="at-header-bar">
          <div className="at-header-left">
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/driver/trips')}>← Trips</button>
            <div>
              <h1 className="at-title">Trip #{trip._id?.slice(-6)}</h1>
              <span className="at-status-badge" style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor }}>
                {trip.status}
              </span>
            </div>
          </div>
          <div className="at-header-right">
            {isScheduled && (
              <button className="btn btn-primary" onClick={handleStartTrip} disabled={actionLoading}>
                {actionLoading ? 'Starting...' : 'Start Trip'}
              </button>
            )}
            {trip.is_delayed && isActive && (
              <button className="btn btn-outline btn-sm" onClick={handleClearDelay} disabled={actionLoading}>Clear Delay</button>
            )}
            {isActive && (
              <button
                className="btn btn-outline btn-sm btn-danger-outline"
                onClick={openDelayModal}
              >
                Report Delay
              </button>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="at-layout">
          {/* Map */}
          <div className="at-map-section">
            {loadError ? (
              <div className="at-map-error" style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
                Error loading Google Maps: {loadError.message}
              </div>
            ) : !isLoaded ? (
              <div className="at-map-loading" style={{ padding: '20px', textAlign: 'center' }}>
                Loading Google Maps...
              </div>
            ) : (
              <GoogleMap
                mapContainerClassName="at-google-map"
                center={INDIA_CENTER}
                zoom={5}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                options={{
                  ...DEFAULT_MAP_OPTIONS,
                  mapTypeControl: true,
                }}
              >
                {/* Stop markers */}
                {trip.stops?.filter(s => s.address?.coordinates?.length === 2).map((stop, idx) => {
                  const coords = toLatLng(stop.address.coordinates);
                  if (!coords || !coords.lat || !coords.lng) return null;
                  
                  const isPickup = stop.type === 'Pickup';
                  const isDone = stop.status === 'Completed';
                  const isCurrent = idx === currentStopIndex;
                  
                  let fillColor = '#6366f1';
                  if (isDone) fillColor = '#94a3b8';
                  else if (isPickup) fillColor = '#10b981';
                  else fillColor = '#f97316';
                  
                  return (
                    <Marker
                      key={`stop-${stop._id}`}
                      position={coords}
                      label={{
                        text: String(idx + 1),
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: isCurrent ? 20 : 16,
                        fillColor,
                        fillOpacity: 1,
                        strokeColor: isCurrent ? '#fbbf24' : 'white',
                        strokeWeight: isCurrent ? 3 : 2,
                      }}
                      onClick={() => setSelectedMarker(stop)}
                    />
                  );
                })}
                
                {/* Driver location marker */}
                {driverLocationReady && driverLocationRef.current && (
                  <Marker
                    position={{
                      lat: driverLocationRef.current[0],
                      lng: driverLocationRef.current[1],
                    }}
                    icon={{
                      url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%236366f1' stroke='white' stroke-width='3'/%3E%3Ctext x='20' y='28' font-size='20' font-weight='bold' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",
                      scaledSize: new google.maps.Size(40, 40),
                      anchor: new google.maps.Point(20, 20),
                    }}
                    animation={google.maps.Animation.BOUNCE}
                    title="Your location"
                    zIndex={1000}
                  />
                )}
                
                {/* Route polyline */}
                {routePath.length > 0 && (
                  <Polyline
                    path={routePath}
                    options={{
                      strokeColor: '#6366f1',
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                    }}
                  />
                )}
                
                {/* Info window for selected marker */}
                {selectedMarker && (
                  <InfoWindow
                    position={toLatLng(selectedMarker.address.coordinates)}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div style={{ padding: '5px' }}>
                      <strong>{selectedMarker.address.city || 'Stop'}</strong>
                      <br />
                      {selectedMarker.type}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
            <div className="at-map-info">
              <div className="at-info-item"><span className="at-info-label">Vehicle</span><span>{trip.assigned_vehicle_id?.registration || '—'}</span></div>
              <div className="at-info-item"><span className="at-info-label">Distance</span><span>{trip.total_distance_km || 0} km</span></div>
              <div className="at-info-item"><span className="at-info-label">Stops</span><span>{trip.stops?.length || 0}</span></div>
              <div className="at-info-item"><span className="at-info-label">Depart</span><span>{formatTime(trip.planned_start_at)}</span></div>
            </div>
          </div>

          {/* Stops Panel */}
          <div className="at-stops-panel">
            <div className="at-panel-header">
              <h2>Stops</h2>
              <span className="at-panel-badge">{currentStopIndex + 1} / {trip.stops?.length}</span>
            </div>

            <div className="at-stops-list">
              {trip.stops?.map((stop, idx) => {
                const isCurrent = idx === currentStopIndex && isActive;
                const isDoneStop = stop.status === 'Completed';
                const isArrived = stop.status === 'Arrived';

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
                        <span className="at-stop-eta">{formatTime(stop.eta_at)}</span>
                      </div>
                      <div className="at-stop-address">
                        {stop.address?.street && <span>{stop.address.street}, </span>}
                        <strong>{stop.address?.city || 'Unknown'}</strong>
                        {stop.address?.state && <span>, {stop.address.state}</span>}
                      </div>
                      {stop.order_id && <div className="at-stop-ref">Order #{typeof stop.order_id === 'string' ? stop.order_id.slice(-6) : stop.order_id._id?.slice(-6)}</div>}

                      {/* FIX: removed e.stopPropagation() and setTimeout from button click */}
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
                      {isDoneStop && stop.completed_at && (
                        <span className="at-stop-status-badge completed">Done {formatTime(stop.completed_at)}</span>
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