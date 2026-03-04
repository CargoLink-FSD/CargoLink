// src/pages/transporter/TripPlanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import {
  getAssignableOrders, getAvailableDrivers, getAvailableVehicles, createTrip
} from '../../api/trips';
import '../../styles/TripPlanner.css';

const formatHour = (decimal) => {
  const h = Math.floor(decimal % 24);
  const m = Math.round((decimal % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const TripPlanner = () => {
  const navigate = useNavigate();

  // Data from API
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selections
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [stops, setStops] = useState([]);
  const [startTime, setStartTime] = useState('08:00');
  const [plannedDate, setPlannedDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // UI
  const [toast, setToast] = useState(null);
  const [hoveredStop, setHoveredStop] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);
  const [showDriverMenu, setShowDriverMenu] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const routeLegsRef = useRef([]);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Fetch data ───
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [ordersData, vehiclesData, driversData] = await Promise.all([
          getAssignableOrders(),
          getAvailableVehicles(),
          getAvailableDrivers(),
        ]);
        setOrders(ordersData || []);
        setVehicles(vehiclesData || []);
        setDrivers(driversData || []);
      } catch (err) {
        showToast('Failed to load data: ' + err.message);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  // ─── Build stops from selected orders ───
  useEffect(() => {
    setStops(prev => {
      const incoming = selectedOrders.flatMap(id => {
        const o = orders.find(x => x._id === id);
        if (!o) return [];
        return [
          {
            id: `${o._id}-p`, orderId: o._id, type: 'Pickup',
            location: `${o.pickup.city}, ${o.pickup.state}`,
            address: o.pickup,
            weight: o.weight,
            coords: o.pickup.coordinates || null,
          },
          {
            id: `${o._id}-d`, orderId: o._id, type: 'Dropoff',
            location: `${o.delivery.city}, ${o.delivery.state}`,
            address: o.delivery,
            weight: o.weight,
            coords: o.delivery.coordinates || null,
          },
        ];
      });
      const kept = prev.filter(s => incoming.some(n => n.id === s.id));
      const added = incoming.filter(n => !prev.some(s => s.id === n.id));
      return [...kept, ...added];
    });
  }, [selectedOrders, orders]);

  // ─── Load Leaflet CDN ───
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
    }
  }, []);

  // ─── Init map ───
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '© OpenStreetMap',
    }).addTo(map);
    map.setView([20.5, 78.9], 5);
    leafletMap.current = map;
  }, [mapReady]);

  // ─── OSRM Route ───
  const fetchRoute = async (coordinates) => {
    if (coordinates.length < 2) return null;
    setRouteLoading(true);
    try {
      const coords = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');
      const route = data.routes[0];
      setRouteDistance(Number((route.distance / 1000).toFixed(1)));
      setRouteDuration(Number((route.duration / 3600).toFixed(2)));
      routeLegsRef.current = (route.legs || []).map(l => ({ distance: l.distance, duration: l.duration }));
      return route.geometry.coordinates.map(c => [c[1], c[0]]);
    } catch {
      routeLegsRef.current = [];
      return null;
    } finally {
      setRouteLoading(false);
    }
  };

  // ─── Markers ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const validStops = stops.filter(s => s.coords);
    validStops.forEach((stop, idx) => {
      const isPickup = stop.type === 'Pickup';
      const isHover = hoveredStop === stop.id;
      const icon = L.divIcon({
        className: '',
        html: `<div class="tp-map-marker ${isPickup ? 'pickup' : 'drop'} ${isHover ? 'hovered' : ''}"><span>${idx + 1}</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
      const marker = L.marker(stop.coords, { icon }).addTo(map);
      marker.bindPopup(`<b>${idx + 1}. ${stop.location}</b><br/>${isPickup ? '↑ Pickup' : '↓ Drop'} · ${stop.weight} kg`);
      markersRef.current.push(marker);
    });

    if (!polylineRef.current && markersRef.current.length > 0) {
      const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [stops, hoveredStop]);

  // ─── Route polyline ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) return;
    let cancelled = false;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    setRouteDistance(0); setRouteDuration(0);

    const validStops = stops.filter(s => s.coords);
    if (validStops.length < 2) {
      if (markersRef.current.length > 0) {
        map.fitBounds(L.latLngBounds(markersRef.current.map(m => m.getLatLng())), { padding: [40, 40], maxZoom: 10 });
      } else {
        map.setView([20.5, 78.9], 5);
      }
      return;
    }

    (async () => {
      const coords = validStops.map(s => s.coords);
      const routeCoords = await fetchRoute(coords);
      if (cancelled) return;
      if (routeCoords?.length) {
        polylineRef.current = L.polyline(routeCoords, { color: '#6366f1', weight: 4, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40], maxZoom: 10 });
      }
    })();
    return () => { cancelled = true; };
  }, [stops]);

  // ─── Derived ───
  const vehicle = vehicles.find(v => v._id === selectedVehicle);
  const driver = drivers.find(d => d._id === selectedDriver);
  
  //changed
  const vehicleCapacityTons = vehicle?.capacity != null ? Number(vehicle.capacity) : null;
  const vehicleCapacityKg = vehicleCapacityTons != null && !Number.isNaN(vehicleCapacityTons)
    ? vehicleCapacityTons * 1000
    : null;

  const totalWeight = orders
    .filter(o => selectedOrders.includes(o._id))
    .reduce((s, o) => s + (o.weight || 0), 0);
  
   //changed
  const capacityUsed = vehicleCapacityKg ? (totalWeight / vehicleCapacityKg) * 100 : 0;
  const overCapacity = capacityUsed > 100;

  const stopsWithMeta = (() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const startDecimal = sh + sm / 60;
    let cumulativeSeconds = 0;
    let runningLoad = 0;
    const legs = routeLegsRef.current || [];

    return stops.map((stop, idx) => {
      if (idx > 0 && stop.coords && stops[idx - 1].coords) {
        const leg = legs[idx - 1];
        if (leg) cumulativeSeconds += leg.duration;
        else cumulativeSeconds += 2 * 3600; // fallback 2h
      }
      const etaDecimal = startDecimal + cumulativeSeconds / 3600;
      runningLoad += stop.type === 'Pickup' ? (stop.weight || 0) : -(stop.weight || 0);
      return { ...stop, eta: formatHour(etaDecimal), etaDecimal, runningLoad };
    });
  })();

  const totalDurationHrs = routeDuration > 0 ? routeDuration :
    (stopsWithMeta.length > 1 ? stopsWithMeta[stopsWithMeta.length - 1].etaDecimal - stopsWithMeta[0].etaDecimal : 0);

  const isValid = selectedOrders.length > 0 && selectedVehicle && selectedDriver && !overCapacity && stops.length >= 2;

  // ─── Handlers ───
  const toggleOrder = (id) =>
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const next = [...stops];
    const [removed] = next.splice(draggedIdx, 1);
    next.splice(idx, 0, removed);
    setStops(next);
    setDraggedIdx(null); setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

  const handleConfirm = async () => {
    if (!isValid) { showToast('Please complete all fields'); return; }
    setSubmitting(true);
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const planned_start = new Date(`${plannedDate}T${startTime}:00`);
      const planned_end = new Date(planned_start.getTime() + totalDurationHrs * 3600 * 1000);

      const tripStops = stopsWithMeta.map((s, i) => ({
        sequence: i + 1,
        type: s.type,
        order_id: s.orderId,
        address: {
          street: s.address?.street || '',
          city: s.address?.city || '',
          state: s.address?.state || '',
          pin: s.address?.pin || '',
          coordinates: s.coords || undefined,
        },
        eta_at: new Date(planned_start.getTime() + (s.etaDecimal - (sh + sm / 60)) * 3600 * 1000).toISOString(),
        status: 'Pending',
      }));

      const tripData = {
        order_ids: selectedOrders,
        assigned_vehicle_id: selectedVehicle,
        assigned_driver_id: selectedDriver,
        stops: tripStops,
        planned_start_at: planned_start.toISOString(),
        planned_end_at: planned_end.toISOString(),
        total_distance_km: routeDistance || 0,
        total_duration_minutes: Math.round(totalDurationHrs * 60),
      };

      await createTrip(tripData);
      showToast('Trip created successfully!', 'success');
      setTimeout(() => navigate('/transporter/trips'), 1200);
    } catch (err) {
      showToast(err.message || 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    o._id?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.pickup?.city?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.delivery?.city?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  if (loadingData) {
    return (
      <>
        <Header />
        <div className="tp-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="loading-state"><div className="spinner"></div><p>Loading trip data...</p></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      {toast && <div className={`tp-toast tp-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="tp-shell">
        {/* TOP BAR */}
        <div className="tp-topbar">
          <div className="tp-topbar-left">
            <button className="btn btn-outline" onClick={() => navigate('/transporter/trips')}>← Trips</button>
            <div className="tp-topbar-title-block">
              <h1 className="tp-page-title">Plan New Trip</h1>
              <p className="tp-page-sub">
                {selectedOrders.length > 0
                  ? `${selectedOrders.length} order${selectedOrders.length > 1 ? 's' : ''} · ${totalWeight} kg`
                  : 'Select orders from the left panel to begin'}
              </p>
            </div>
          </div>
          <div className="tp-topbar-right">
            {overCapacity && <span className="tp-chip tp-chip--warning">Overloaded</span>}
            {vehicle && !overCapacity && selectedOrders.length > 0 && <span className="tp-chip tp-chip--ok">✓ Load OK</span>}
            {driver && <span className="tp-chip tp-chip--ok">✓ {driver.firstName || driver.name}</span>}
            <div className="tp-date-field">
              <label>Date</label>
              <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="tp-time-input" />
            </div>
            <button
              className={`btn ${isValid ? 'btn-primary' : 'btn-outline'}`}
              onClick={handleConfirm}
              disabled={submitting || !isValid}
              style={{ opacity: isValid ? 1 : 0.55, minWidth: 140 }}
            >
              {submitting ? 'Creating...' : isValid ? '✓ Create Trip' : 'Incomplete'}
            </button>
          </div>
        </div>

        {/* CANVAS: 3 columns */}
        <div className="tp-canvas">
          {/* LEFT: Orders */}
          <aside className="tp-pane tp-orders-pane">
            <div className="tp-pane-header">
              <h2 className="card-title" style={{ fontSize: '1rem' }}>Orders</h2>
              <span className="tp-pane-badge">{orders.length} assignable</span>
            </div>
            <div className="tp-search-wrap">
              <input type="text" placeholder="Search by ID or city…" value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)} className="tp-search-input" />
            </div>
            <div className="tp-orders-list">
              {filteredOrders.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  {orders.length === 0 ? 'No assignable orders' : 'No orders match search'}
                </div>
              )}
              {filteredOrders.map(o => {
                const sel = selectedOrders.includes(o._id);
                return (
                  <div key={o._id} className={`tp-order-card ${sel ? 'selected' : ''}`} onClick={() => toggleOrder(o._id)}>
                    <div className={`tp-order-check ${sel ? 'checked' : ''}`}>{sel ? '✓' : ''}</div>
                    <div className="tp-order-body">
                      <div className="tp-order-id">#{o._id?.slice(-6)}</div>
                      <div className="tp-order-route">
                        <span className="tp-dot tp-dot--pickup" />
                        {o.pickup?.city || 'N/A'}
                        <span className="tp-arrow">→</span>
                        <span className="tp-dot tp-dot--drop" />
                        {o.delivery?.city || 'N/A'}
                      </div>
                      <div className="tp-order-meta">
                        {o.goods_type} · {o.weight} kg · {o.truck_type}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedOrders.length > 0 && (
              <div className="tp-weight-summary">
                <div className="tp-weight-row">
                  <span className="detail-label" style={{ marginBottom: 0 }}>Total weight</span>
                  <strong className={overCapacity ? 'tp-text--warning' : ''}>{totalWeight} kg</strong>
                </div>
                {vehicle && (
                  <>
                    <div className="tp-cap-track">
                      <div className={`tp-cap-fill ${overCapacity ? 'over' : ''}`} style={{ width: `${Math.min(capacityUsed, 100)}%` }} />
                    </div>
                    <div className="tp-weight-row" style={{ marginTop: '0.35rem' }}>
                      <span className="detail-label" style={{ marginBottom: 0, fontSize: '0.78rem' }}>Capacity used</span>
                      <span className={overCapacity ? 'tp-text--warning' : 'tp-text--ok'} style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {Math.round(capacityUsed)}% of {vehicleCapacityTons} tons{overCapacity ? ' ⚠' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

          {/* CENTER: Map */}
          <main className="tp-pane tp-map-pane">
            <div className="tp-pane-header">
              <h2 className="card-title" style={{ fontSize: '1rem' }}>Route Map</h2>
              {stops.length > 0 && (
                <span className="tp-pane-badge">
                  {stops.length} stops{routeDistance > 0 && ` · ${routeDistance} km`}
                  {routeLoading && ' · Loading...'}
                </span>
              )}
            </div>
            <div className="tp-map-body">
              {stops.filter(s => s.coords).length === 0 && (
                <div className="tp-map-empty">
                  <p>Select orders to plot route</p>
                </div>
              )}
              <div ref={mapRef} className="tp-leaflet-map" />
            </div>
          </main>

          {/* RIGHT: Timeline + selectors */}
          <aside className="tp-pane tp-timeline-pane">
            <div className="tp-pane-header">
              <h2 className="card-title" style={{ fontSize: '1rem' }}>Route & ETA</h2>
              {totalDurationHrs > 0 && (
                <span className="tp-pane-badge">{totalDurationHrs.toFixed(1)}h{routeDistance > 0 && ` · ${routeDistance} km`}</span>
              )}
            </div>

            {/* Selectors */}
            <div className="tp-selectors">
              {/* Vehicle */}
              <div className="tp-field">
                <label className="detail-label">Vehicle</label>
                <div className="tp-select-wrap">
                  <button className={`tp-select-btn ${selectedVehicle ? 'has-value' : ''}`}
                    onClick={() => { setShowVehicleMenu(v => !v); setShowDriverMenu(false); }}>
                    {vehicle
                      ? <><span className="tp-sel-main">{vehicle.registration}</span><span className="tp-sel-sub">{vehicle.truck_type} · {vehicle.capacity} tons</span></>
                      : <span className="tp-sel-placeholder">Select vehicle…</span>}
                    <span className="tp-chevron">▾</span>
                  </button>
                  {showVehicleMenu && (
                    <div className="tp-dropdown">
                      {vehicles.map(v => (
                        <div key={v._id} className={`tp-dd-item ${selectedVehicle === v._id ? 'active' : ''}`}
                          onClick={() => { setSelectedVehicle(v._id); setShowVehicleMenu(false); }}>
                          <div>
                            <div className="tp-dd-main">{v.registration}</div>
                            <div className="tp-dd-sub">{v.truck_type} · {v.capacity} tons · {v.name}</div>
                          </div>
                          <span className={`tp-badge tp-badge--ok`}>{v.status || 'Available'}</span>
                        </div>
                      ))}
                      {vehicles.length === 0 && <div className="tp-dd-item disabled"><div className="tp-dd-main">No vehicles available</div></div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Driver */}
              <div className="tp-field">
                <label className="detail-label">Driver</label>
                <div className="tp-select-wrap">
                  <button className={`tp-select-btn ${selectedDriver ? 'has-value' : ''}`}
                    onClick={() => { setShowDriverMenu(d => !d); setShowVehicleMenu(false); }}>
                    {driver
                      ? <><div className="tp-avatar">{(driver.firstName || driver.name || '?')[0]}</div><span className="tp-sel-main">{driver.firstName} {driver.lastName || ''}</span><span className="tp-sel-sub">{driver.licenseNumber || ''}</span></>
                      : <span className="tp-sel-placeholder">Select driver…</span>}
                    <span className="tp-chevron">▾</span>
                  </button>
                  {showDriverMenu && (
                    <div className="tp-dropdown">
                      {drivers.map(d => (
                        <div key={d._id} className={`tp-dd-item ${selectedDriver === d._id ? 'active' : ''}`}
                          onClick={() => { setSelectedDriver(d._id); setShowDriverMenu(false); }}>
                          <div className="tp-avatar" style={{ flexShrink: 0 }}>{(d.firstName || '?')[0]}</div>
                          <div>
                            <div className="tp-dd-main">{d.firstName} {d.lastName || ''}</div>
                            <div className="tp-dd-sub">{d.licenseNumber || ''}</div>
                          </div>
                          <span className={`tp-badge tp-badge--ok`}>{d.status || 'Active'}</span>
                        </div>
                      ))}
                      {drivers.length === 0 && <div className="tp-dd-item disabled"><div className="tp-dd-main">No drivers available</div></div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Start time */}
              <div className="tp-field">
                <label className="detail-label">Departure time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="tp-time-input" />
              </div>
            </div>

            <div className="tp-divider" />

            {/* Stats */}
            {stops.length > 0 && (
              <div className="tp-stats-row">
                <div className="tp-stat"><span className="tp-stat-val">{stops.length}</span><span className="tp-stat-lbl">Stops</span></div>
                <div className="tp-stat"><span className="tp-stat-val">{totalDurationHrs.toFixed(1)}h</span><span className="tp-stat-lbl">Duration</span></div>
                <div className="tp-stat">
                  <span className={`tp-stat-val ${overCapacity ? 'tp-text--warning' : ''}`}>{vehicle ? `${Math.round(capacityUsed)}%` : '—'}</span>
                  <span className="tp-stat-lbl">Load</span>
                </div>
                {routeDistance > 0 && <div className="tp-stat"><span className="tp-stat-val">{routeDistance}</span><span className="tp-stat-lbl">km</span></div>}
              </div>
            )}

            {/* Stop list */}
            {stops.length === 0 ? (
              <div className="tp-tl-empty"><p>Stops appear here once orders are selected</p></div>
            ) : (
              <div className="tp-tl-list">
                {stopsWithMeta.map((stop, idx) => {
                  const overLoad = vehicleCapacityKg != null && stop.runningLoad > vehicleCapacityKg;
                  const loadPct = vehicleCapacityKg ? Math.min((stop.runningLoad / vehicleCapacityKg) * 100, 100) : 0;
                  return (
                    <div key={stop.id}>
                      {idx > 0 && (
                        <div className="tp-connector"><div className="tp-connector-line" /><span className="tp-connector-dur">drive</span></div>
                      )}
                      <div
                        className={`tp-stop-card ${hoveredStop === stop.id ? 'hovered' : ''} ${dragOverIdx === idx ? 'drag-over' : ''} ${draggedIdx === idx ? 'dragging' : ''}`}
                        draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)}
                        onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                        onMouseEnter={() => setHoveredStop(stop.id)} onMouseLeave={() => setHoveredStop(null)}
                      >
                        <span className="tp-drag-handle">⠿</span>
                        <div className={`tp-stop-num ${stop.type === 'Pickup' ? 'pickup' : 'drop'}`}>{idx + 1}</div>
                        <div className="tp-stop-info">
                          <div className="tp-stop-top">
                            <span className="tp-stop-location">{stop.location}</span>
                            <span className="tp-stop-eta">{stop.eta}</span>
                          </div>
                          <div className="tp-stop-mid">
                            <span className={`tp-stop-pill ${stop.type === 'Pickup' ? 'pickup' : 'drop'}`}>
                              {stop.type === 'Pickup' ? '↑ Pickup' : '↓ Drop'}
                            </span>
                            <span className="tp-stop-ref">#{stop.orderId?.slice(-6)}</span>
                          </div>
                          {vehicle && (
                            <div className="tp-stop-load-row">
                              <div className="tp-load-track">
                                <div className={`tp-load-fill ${overLoad ? 'over' : ''}`} style={{ width: `${loadPct}%` }} />
                              </div>
                              <span className={`tp-load-val ${overLoad ? 'tp-text--warning' : ''}`}>
                                {stop.runningLoad} kg{overLoad ? ' ⚠' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>

      {(showVehicleMenu || showDriverMenu) && (
        <div className="tp-overlay" onClick={() => { setShowVehicleMenu(false); setShowDriverMenu(false); }} />
      )}
      <Footer />
    </>
  );
};

export default TripPlanner;
