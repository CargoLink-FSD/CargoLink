// src/pages/transporter/TripInfo.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import MapDisplay from '../../components/common/MapDisplay';
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
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatDuration = (minutes) => {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const isStopCompleted = (stop) => ['Completed', 'Skipped'].includes(stop?.status);

const TripInfo = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);

  // Fetch trip
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getTripDetails(tripId);
        setTrip(data);
        setLiveLocation(data?.current_location?.coordinates || null);
      } catch (err) {
        setError(err.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  // Websocket location updates
  useEffect(() => {
    const handleLocationUpdate = (e) => {
      const payload = e.detail;
      if (payload?.type !== 'trip.location.updated') return;
      if (payload?.data?.tripId !== tripId) return;
      setLiveLocation(payload?.data?.coordinates || null);
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_location: {
            ...(prev.current_location || {}),
            coordinates: payload?.data?.coordinates,
            updated_at: payload?.data?.updatedAt,
          },
        };
      });
    };

    window.addEventListener('cargolink:trip.location.updated', handleLocationUpdate);
    return () => window.removeEventListener('cargolink:trip.location.updated', handleLocationUpdate);
  }, [tripId]);

  if (loading) return <><Header /><div className="ti-page"><div className="loading-state"><div className="spinner" /><p>Loading trip…</p></div></div><Footer /></>;
  if (error || !trip) return <><Header /><div className="ti-page"><div className="empty-state"><h3>Error</h3><p>{error || 'Trip not found'}</p><button className="btn btn-primary" onClick={() => navigate('/transporter/trips')}>Back to Trips</button></div></div><Footer /></>;

  const sc = STATUS_COLORS[trip.status] || STATUS_COLORS.Scheduled;
  const currentCoords = liveLocation || trip.current_location?.coordinates;


  return (
    <>
      <Header />
      <div className="ti-page">
        <div className="ti-header">
          <button className="btn btn-outline" onClick={() => navigate('/transporter/trips')}>← Trips</button>
          <div className="ti-header-info">
            <h1 className="ti-title">Trip #{trip._id?.slice(-6)}</h1>
            <span className="ti-status-badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
              {trip.status}
            </span>
          </div>
        </div>

        <div className="ti-layout">
          <div className="ti-map-panel">
            <div className="ti-card">
              <div className="ti-card-header">
                <h2>Route Map</h2>
                <span className="ti-card-badge">
                  {trip.stops?.length || 0} stops {trip.total_distance_km ? `· ${trip.total_distance_km} km` : ''}
                </span>
              </div>
              <div style={{ height: '600px' }}>
                <MapDisplay 
                  stops={trip.stops} 
                  currentLocation={currentCoords}
                  tripStatus={trip.status}
                  showLive={trip.status === 'Active'}
                  routeMode="active"
                  stats={{
                    distance: trip.total_distance_km ? `${trip.total_distance_km} km` : '—',
                    totalTime: trip.total_duration_minutes ? formatDuration(trip.total_duration_minutes) : '—',
                    stops: trip.order_ids?.length || 0,
                    startedAt: formatDateTime(trip.actual_start_at || trip.planned_start_at),
                  }}
                />
              </div>
            </div>
          </div>

          <div className="ti-info-panel">
            <div className="ti-card">
              <div className="ti-card-header"><h2>Assignment</h2></div>
              <div className="ti-assignment-grid">
                <div className="ti-assign-item">
                  <span className="ti-assign-icon">V</span>
                  <div>
                    <div className="ti-assign-main">{trip.assigned_vehicle_id?.registration || 'No vehicle assigned'}</div>
                    {trip.assigned_vehicle_id && (
                      <div className="ti-assign-sub">{trip.assigned_vehicle_id.truck_type} · {trip.assigned_vehicle_id.capacity} kg</div>
                    )}
                  </div>
                </div>
                <div className="ti-assign-item">
                  <span className="ti-assign-icon">D</span>
                  <div>
                    <div className="ti-assign-main">
                      {trip.assigned_driver_id ? `${trip.assigned_driver_id.firstName || ''} ${trip.assigned_driver_id.lastName || ''}`.trim() : 'No driver assigned'}
                    </div>
                    {trip.assigned_driver_id && (
                      <div className="ti-assign-sub">{trip.assigned_driver_id.phone || ''}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="ti-card">
              <div className="ti-card-header">
                <h2>Stops & ETA</h2>
                {trip.planned_end_at && (
                  <span className="ti-card-badge">Arrival: {formatDateTime(trip.planned_end_at)}</span>
                )}
              </div>
              <div className="ti-timeline">
                {(trip.stops || []).map((stop, idx) => {
                  const isCompleted = isStopCompleted(stop);
                  const completedTime = stop.actual_departure_at || stop.actual_arrival_at;
                  return (
                    <div key={stop._id || idx} className={`ti-stop ${isCompleted ? 'completed' : ''}`}>
                      {idx > 0 && <div className={`ti-connector ${isCompleted ? 'completed' : ''}`} />}
                      <div className="ti-stop-row">
                        <div className={`ti-stop-dot ${stop.type === 'Pickup' ? 'pickup' : 'drop'} ${isCompleted ? 'completed' : ''}`}>
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
                              {isCompleted ? `Actual: ${formatDateTime(completedTime)}` : `ETA: ${formatDateTime(stop.eta_at || stop.scheduled_arrival_at)}`}
                            </span>
                            <span className={`ti-stop-status ${stop.status?.toLowerCase().replace(' ', '-')}`}>
                              {stop.status}
                            </span>
                          </div>
                          {stop.delay_minutes > 0 && (
                            <div className="ti-stop-delay">⚠ Delayed {stop.delay_minutes} min — {stop.delay_reason || ''}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                            <span className="ti-order-route">{o.pickup.city} → {o.delivery.city}</span>
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
