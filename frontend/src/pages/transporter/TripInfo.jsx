// src/pages/transporter/TripInfo.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { getTripDetails } from '../../api/trips';
import '../../styles/TripInfo.css';

const STATUS_COLORS = {
  Scheduled:    { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' },
  Active:       { bg: '#d1fae5', color: '#065f46', border: '#10b981' },
  Completed:    { bg: '#e0e7ff', color: '#3730a3', border: '#6366f1' },
  Cancelled:    { bg: '#f1f5f9', color: '#475569', border: '#94a3b8' },
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

const TripInfo = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const [mapReady, setMapReady] = useState(false);

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

  // ─── Load Leaflet ───
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) { setMapReady(true); return; }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.L) { setMapReady(true); clearInterval(check); }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  // ─── Render map ───
  useEffect(() => {
    if (!mapReady || !mapRef.current || !trip?.stops?.length) return;
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenStreetMap',
    }).addTo(map);

    const validStops = trip.stops.filter(s => s.address?.coordinates?.length === 2);
    if (validStops.length === 0) {
      map.setView([20.5, 78.9], 5);
      leafletMap.current = map;
      return;
    }

    // Add markers
    const markers = [];
    validStops.forEach((stop, idx) => {
      const [lng, lat] = stop.address.coordinates;
      const isPickup = stop.type === 'Pickup';
      const isCompleted = stop.status === 'Completed';
      const isCurrent = idx === trip.current_stop_index;

      const icon = L.divIcon({
        className: '',
        html: `<div class="ti-map-marker ${isPickup ? 'pickup' : 'drop'} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}"><span>${stop.sequence || idx + 1}</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(
        `<b>${stop.sequence || idx + 1}. ${stop.address?.city || ''}</b><br/>` +
        `${stop.type} · ${stop.status}<br/>` +
        `ETA: ${formatDateTime(stop.eta_at)}`
      );
      markers.push(marker);
    });

    // Draw OSRM route
    const coords = validStops.map(s => `${s.address.coordinates[0]},${s.address.coordinates[1]}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes?.length) {
          const routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          L.polyline(routeCoords, { color: '#6366f1', weight: 4, opacity: 0.85 }).addTo(map);
        }
      })
      .catch(() => {});

    // Current location marker
    if (trip.current_location?.coordinates?.length === 2) {
      const [cLng, cLat] = trip.current_location.coordinates;
      const currentIcon = L.divIcon({
        className: '',
        html: '<div class="ti-current-loc">T</div>',
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      L.marker([cLat, cLng], { icon: currentIcon }).addTo(map)
        .bindPopup('Current Location');
    }

    // Fit bounds
    const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, [mapReady, trip]);

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
              <div ref={mapRef} className="ti-map" />
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
