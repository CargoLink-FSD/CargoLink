// src/pages/transporter/TripInfo.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { normalizeCoordinates, getDirections, INDIA_CENTER, DEFAULT_MAP_OPTIONS } from '../../utils/googleMapsConfig';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { getTripDetails } from '../../api/trips';
import '../../styles/TripInfo.css';

const STATUS_COLORS = {
  Scheduled: { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
  Active: { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
  Completed: { bg: '#e0e7ff', color: '#3730a3', border: '#6366f1' },
  Cancelled: { bg: '#f1f5f9', color: '#475569', border: '#94a3b8' },
};

const STOP_ICONS = { Pickup: 'P', Dropoff: 'D', Waypoint: 'W', Delay: 'DL' };

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDuration = (minutes) => {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const toLatLng = normalizeCoordinates;

const TripInfo = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isLoaded, loadError } = useGoogleMaps();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);

  // ─── Fetch trip ───
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getTripDetails(tripId);
        setTrip(data);
      } catch (err) {
        setError(err.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  // ─── Build route path with Google Directions ───
  useEffect(() => {
    if (!isLoaded || !trip?.stops?.length) {
      setRoutePath([]);
      return;
    }

    const validStops = trip.stops
      .filter(s => s.address?.coordinates?.length === 2)
      .map(s => toLatLng(s.address.coordinates))
      .filter(Boolean);

    if (validStops.length < 2) {
      setRoutePath([]);
      return;
    }

    let cancelled = false;
    getDirections(validStops)
      .then(result => {
        if (cancelled) return;
        setRoutePath(result.routes[0].overview_path || []);
      })
      .catch(() => {
        if (cancelled) return;
        setRoutePath([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, trip]);

  useEffect(() => {
    if (!map || !isLoaded || !trip?.stops?.length) return;
    const bounds = new google.maps.LatLngBounds();

    const validStops = trip.stops
      .filter(s => s.address?.coordinates?.length === 2)
      .map(s => toLatLng(s.address.coordinates))
      .filter(Boolean);

    validStops.forEach(point => bounds.extend(point));

    const current = toLatLng(trip.current_location?.coordinates);
    if (current) bounds.extend(current);

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [map, isLoaded, trip, routePath]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="ti-page">
          <div className="loading-state"><div className="spinner" /><p>Loading trip…</p></div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <Header />
        <div className="ti-page">
          <div className="empty-state">
            <h3>Error</h3><p>{error || 'Trip not found'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/transporter/trips')}>Back to Trips</button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const sc = STATUS_COLORS[trip.status] || STATUS_COLORS.Scheduled;
  const vehicle = trip.assigned_vehicle_id;
  const driver = trip.assigned_driver_id;

  return (
    <>
      <Header />
      <div className="ti-page">
        {/* Header */}
        <div className="ti-header">
          <button className="btn btn-outline" onClick={() => navigate('/transporter/trips')}>
            ← Trips
          </button>
          <div className="ti-header-info">
            <h1 className="ti-title">
              Trip #{trip._id?.slice(-6)}
            </h1>
            <span className="ti-status-badge" style={{
              background: sc.bg, color: sc.color, borderColor: sc.border
            }}>
              {trip.status}
            </span>
          </div>
        </div>

        <div className="ti-layout">
          {/* Left: Map */}
          <div className="ti-map-panel">
            <div className="ti-card">
              <div className="ti-card-header">
                <h2>Route Map</h2>
                <span className="ti-card-badge">
                  {trip.stops?.length || 0} stops
                  {trip.total_distance_km ? ` · ${trip.total_distance_km} km` : ''}
                </span>
              </div>
              {loadError ? (
                <div className="ti-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  Error loading Google Maps: {loadError.message}
                </div>
              ) : !isLoaded ? (
                <div className="ti-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Loading Google Maps...
                </div>
              ) : (
                <GoogleMap
                  mapContainerClassName="ti-map"
                  center={INDIA_CENTER}
                  zoom={5}
                  onLoad={setMap}
                  onUnmount={() => setMap(null)}
                  options={{
                    ...DEFAULT_MAP_OPTIONS,
                    mapTypeControl: true,
                  }}
                >
                  {(trip.stops || []).map((stop, idx) => {
                    const coords = toLatLng(stop.address?.coordinates);
                    if (!coords) return null;

                    const isPickup = stop.type === 'Pickup';
                    const isCompleted = stop.status === 'Completed';
                    const isCurrent = idx === trip.current_stop_index;

                    let fillColor = '#f97316';
                    if (isPickup) fillColor = '#10b981';
                    if (isCompleted) fillColor = '#94a3b8';

                    return (
                      <Marker
                        key={stop._id || idx}
                        position={coords}
                        label={{
                          text: String(stop.sequence || idx + 1),
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: isCurrent ? 18 : 15,
                          fillColor,
                          fillOpacity: 1,
                          strokeColor: isCurrent ? '#fbbf24' : 'white',
                          strokeWeight: isCurrent ? 3 : 2,
                        }}
                        onClick={() => setSelectedStop(stop)}
                      />
                    );
                  })}

                  {routePath.length > 0 && (
                    <Polyline
                      path={routePath}
                      options={{
                        strokeColor: '#6366f1',
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                      }}
                    />
                  )}

                  {toLatLng(trip.current_location?.coordinates) && (
                    <Marker
                      position={toLatLng(trip.current_location.coordinates)}
                      title="Current Location"
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#4f46e5',
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 3,
                      }}
                      zIndex={1000}
                    />
                  )}

                  {selectedStop && toLatLng(selectedStop.address?.coordinates) && (
                    <InfoWindow
                      position={toLatLng(selectedStop.address.coordinates)}
                      onCloseClick={() => setSelectedStop(null)}
                    >
                      <div>
                        <strong>{selectedStop.sequence || '-'}. {selectedStop.address?.city || 'Stop'}</strong>
                        <br />
                        {selectedStop.type} · {selectedStop.status}
                        <br />
                        ETA: {formatDateTime(selectedStop.eta_at)}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>

            {/* Summary Stats */}
            <div className="ti-stats-grid">
              <div className="ti-stat-card">
                <span className="ti-stat-icon">Dist</span>
                <div>
                  <div className="ti-stat-val">{trip.total_distance_km || '—'} km</div>
                  <div className="ti-stat-lbl">Distance</div>
                </div>
              </div>
              <div className="ti-stat-card">
                <span className="ti-stat-icon">⏱</span>
                <div>
                  <div className="ti-stat-val">{formatDuration(trip.total_duration_minutes)}</div>
                  <div className="ti-stat-lbl">Duration</div>
                </div>
              </div>
              <div className="ti-stat-card">
                <span className="ti-stat-icon">Ord</span>
                <div>
                  <div className="ti-stat-val">{trip.order_ids?.length || 0}</div>
                  <div className="ti-stat-lbl">Orders</div>
                </div>
              </div>
              <div className="ti-stat-card">
                <span className="ti-stat-icon">Dep</span>
                <div>
                  <div className="ti-stat-val">{formatDateTime(trip.planned_start_at)}</div>
                  <div className="ti-stat-lbl">Departure</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Timeline & Info */}
          <div className="ti-info-panel">
            {/* Vehicle & Driver */}
            <div className="ti-card">
              <div className="ti-card-header"><h2>Assignment</h2></div>
              <div className="ti-assignment-grid">
                <div className="ti-assign-item">
                  <span className="ti-assign-icon">V</span>
                  <div>
                    <div className="ti-assign-main">
                      {vehicle?.registration || 'No vehicle assigned'}
                    </div>
                    {vehicle && (
                      <div className="ti-assign-sub">
                        {vehicle.truck_type} · {vehicle.capacity} kg · {vehicle.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ti-assign-item">
                  <span className="ti-assign-icon">D</span>
                  <div>
                    <div className="ti-assign-main">
                      {driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() : 'No driver assigned'}
                    </div>
                    {driver && (
                      <div className="ti-assign-sub">
                        {driver.phone || ''} · {driver.email || ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stops Timeline */}
            <div className="ti-card">
              <div className="ti-card-header">
                <h2>Stops & ETA</h2>
                {trip.planned_end_at && (
                  <span className="ti-card-badge">
                    Arrival: {formatDateTime(trip.planned_end_at)}
                  </span>
                )}
              </div>
              <div className="ti-timeline">
                {(trip.stops || []).map((stop, idx) => {
                  const isCompleted = stop.status === 'Completed';
                  const isCurrent = stop.status === 'En Route' || stop.status === 'Arrived';
                  return (
                    <div key={stop._id || idx} className={`ti-stop ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                      {idx > 0 && <div className={`ti-connector ${isCompleted ? 'completed' : ''}`} />}
                      <div className="ti-stop-row">
                        <div className={`ti-stop-dot ${stop.type === 'Pickup' ? 'pickup' : 'drop'} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                          {isCompleted ? '✓' : (stop.sequence || idx + 1)}
                        </div>
                        <div className="ti-stop-body">
                          <div className="ti-stop-header">
                            <span className="ti-stop-location">
                              {stop.address?.city || stop.address?.street || 'Stop ' + (idx + 1)}
                              {stop.address?.state ? `, ${stop.address.state}` : ''}
                            </span>
                            <span className={`ti-stop-type ${stop.type?.toLowerCase()}`}>
                              {STOP_ICONS[stop.type] || '⬤'} {stop.type}
                            </span>
                          </div>
                          <div className="ti-stop-meta">
                            <span className="ti-stop-eta">
                              ETA: {formatDateTime(stop.eta_at || stop.scheduled_arrival_at)}
                            </span>
                            <span className={`ti-stop-status ${stop.status?.toLowerCase().replace(' ', '-')}`}>
                              {stop.status}
                            </span>
                          </div>
                          {stop.actual_arrival_at && (
                            <div className="ti-stop-actual">
                              Arrived: {formatDateTime(stop.actual_arrival_at)}
                            </div>
                          )}
                          {stop.delay_minutes > 0 && (
                            <div className="ti-stop-delay">
                              ⚠ Delayed {stop.delay_minutes} min — {stop.delay_reason || ''}
                            </div>
                          )}
                          {stop.order_id && (
                            <div className="ti-stop-order">
                              Order: #{(typeof stop.order_id === 'string' ? stop.order_id : stop.order_id?._id || '')?.slice(-6)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Orders List */}
            {trip.order_ids?.length > 0 && (
              <div className="ti-card">
                <div className="ti-card-header"><h2>Orders</h2></div>
                <div className="ti-orders-list">
                  {trip.order_ids.map(order => {
                    const o = typeof order === 'object' ? order : { _id: order };
                    return (
                      <div key={o._id} className="ti-order-item">
                        <span className="ti-order-id">#{o._id?.slice(-6)}</span>
                        <div className="ti-order-detail">
                          {o.pickup?.city && o.delivery?.city && (
                            <span className="ti-order-route">
                              {o.pickup.city} → {o.delivery.city}
                            </span>
                          )}
                          {o.goods_type && <span className="ti-order-type">{o.goods_type}</span>}
                          {o.weight && <span className="ti-order-weight">{o.weight} kg</span>}
                        </div>
                        {o.status && <span className="ti-order-status">{o.status}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TripInfo;
