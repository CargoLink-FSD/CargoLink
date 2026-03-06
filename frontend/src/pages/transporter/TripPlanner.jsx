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

// Backend stores coords as GeoJSON [lng, lat]; Leaflet needs [lat, lng]
const normalizeCoords = (coords) => {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return null;
  const a = Number(coords[0]);
  const b = Number(coords[1]);
  if (isNaN(a) || isNaN(b)) return null;
  // GeoJSON is [lng, lat]. For India lng~68-97, lat~8-37.
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  // If a > 50 and b < 40, likely [lng, lat] for Indian coords
  if (a > 50 && b < 40) return [b, a];
  return [a, b];
};

// Check if entity (driver/vehicle) has a scheduleBlock overlapping a time window
const hasScheduleConflict = (entity, dateStr, timeStr, durationHrs = 12) => {
  const blocks = entity?.scheduleBlocks;
  if (!blocks || !blocks.length) return false;
  const tripStart = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
  if (isNaN(tripStart.getTime())) return false;
  const tripEnd = new Date(tripStart.getTime() + durationHrs * 3600000);
  return blocks.some(block => {
    const bs = new Date(block.startTime);
    const be = new Date(block.endTime);
    return bs < tripEnd && be > tripStart;
  });
};

// Extract the scheduled date from an order
const getOrderDate = (order) => {
  const d = order?.scheduled_at || order?.order_date;
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date;
};

// Validate stop ordering: every Dropoff must come after its Pickup
const isValidStopOrder = (stopsList) => {
  const pickedUp = new Set();
  for (const stop of stopsList) {
    if (stop.type === 'Pickup') pickedUp.add(stop.orderId);
    else if (stop.type === 'Dropoff' && !pickedUp.has(stop.orderId)) return false;
  }
  return true;
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
  const [osrmRaw, setOsrmRaw] = useState(null);
  const [osrmRequestCoords, setOsrmRequestCoords] = useState('');
  const [normalizedStopsDbg, setNormalizedStopsDbg] = useState([]);

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
        // Debug: log available resources and their schedules
        console.group('TripPlanner: Loaded Resources');
        console.log('Orders:', ordersData);
        console.log('Vehicles:', vehiclesData);
        console.log('Drivers:', driversData);
        console.log('Vehicle schedules:', (vehiclesData || []).map(v => ({
          id: v._id, reg: v.registration, status: v.status,
          scheduleBlocks: v.scheduleBlocks || [],
        })));
        console.log('Driver schedules:', (driversData || []).map(d => ({
          id: d._id, name: `${d.firstName} ${d.lastName || ''}`, status: d.status,
          scheduleBlocks: d.scheduleBlocks || [],
        })));
        console.groupEnd();

        const allOrders = ordersData || [];
        setOrders(allOrders);
        setVehicles(vehiclesData || []);
        setDrivers(driversData || []);

        // Auto-set planned date & time to the earliest order's scheduled_at
        if (allOrders.length > 0) {
          const dates = allOrders.map(o => getOrderDate(o)).filter(Boolean);
          if (dates.length > 0) {
            const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
            setPlannedDate(earliest.toISOString().split('T')[0]);
            const hh = String(earliest.getHours()).padStart(2, '0');
            const mm = String(earliest.getMinutes()).padStart(2, '0');
            if (hh !== '00' || mm !== '00') setStartTime(`${hh}:${mm}`);
          }
        }
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
            coords: normalizeCoords(o.pickup.coordinates),
          },
          {
            id: `${o._id}-d`, orderId: o._id, type: 'Dropoff',
            location: `${o.delivery.city}, ${o.delivery.state}`,
            address: o.delivery,
            weight: o.weight,
            coords: normalizeCoords(o.delivery.coordinates),
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
    } else {
      const check = setInterval(() => {
        if (window.L) { setMapReady(true); clearInterval(check); }
      }, 100);
      return () => clearInterval(check);
    }
  }, []);

  // ─── Init map (retry until container is available) ───
  useEffect(() => {
    if (!mapReady) return;
    let intervalId = null;

    const tryInit = () => {
      if (leafletMap.current || !mapRef.current) return !!leafletMap.current;
      const L = window.L;
      if (!L) return false;
      const map = L.map(mapRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap',
      }).addTo(map);
      map.setView([20.5, 78.9], 5);
      leafletMap.current = map;
      // Leaflet needs a kick after the container is in the DOM
      setTimeout(() => { map.invalidateSize(); setStops(s => [...s]); }, 200);
      setTimeout(() => map.invalidateSize(), 600);
      return true;
    };

    if (!tryInit()) {
      intervalId = setInterval(() => {
        if (tryInit() && intervalId) { clearInterval(intervalId); intervalId = null; }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, [mapReady]);

  // ─── OSRM Route ───
  const fetchRoute = async (coordinates) => {
    if (!coordinates || coordinates.length < 2) return null;
    setRouteLoading(true);
    try {
      // coordinates are [lat, lng] -> OSRM expects lon,lat
      const coords = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
      setOsrmRequestCoords(coords);
      console.debug('TripPlanner: OSRM request coords=', coords);
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`);
      const data = await res.json();
      setOsrmRaw(data);
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');
      const route = data.routes[0];
      console.debug('TripPlanner: OSRM response distance=', route.distance, 'duration=', route.duration);
      setRouteDistance(Number((route.distance / 1000).toFixed(1)));
      setRouteDuration(Number((route.duration / 3600).toFixed(2)));
      routeLegsRef.current = (route.legs || []).map(l => ({ distance: l.distance, duration: l.duration }));
      return route.geometry.coordinates.map(c => [c[1], c[0]]);
    } catch (err) {
      routeLegsRef.current = [];
      console.warn('TripPlanner: fetchRoute error', err);
      return null;
    } finally {
      setRouteLoading(false);
    }
  };

  // ─── Markers ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) {
      console.log('TripPlanner: Skipping markers - map not ready');
      return;
    }
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

    // Ensure map container is properly sized after DOM updates
    map.invalidateSize();

    if (markersRef.current.length > 0) {
      const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      console.log(`TripPlanner: Added ${markersRef.current.length} markers to map`);
    }
  }, [stops, hoveredStop]);

  // ─── Route polyline ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    // Always compute route coords (fetchRoute) even if map isn't initialized yet.
    // But only draw polyline when map is available.
    let cancelled = false;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    setRouteDistance(0); setRouteDuration(0);

    const validStops = stops.filter(s => Array.isArray(s.coords) && s.coords.length === 2);
    console.log(`TripPlanner: Route effect - ${validStops.length} valid stops`, validStops.map(s => s.coords));
    setNormalizedStopsDbg(validStops.map(s => ({ id: s.id, coords: s.coords })));

    if (validStops.length < 2) {
      console.log('TripPlanner: < 2 stops, skipping route fetch');
      if (L && map && markersRef.current.length > 0) {
        map.fitBounds(L.latLngBounds(markersRef.current.map(m => m.getLatLng())), { padding: [40, 40], maxZoom: 10 });
      } else if (L && map) {
        map.setView([20.5, 78.9], 5);
      }
      return;
    }

    (async () => {
      const coords = validStops.map(s => s.coords);
      console.log('TripPlanner: Fetching OSRM route for coords:', coords);
      const routeCoords = await fetchRoute(coords);
      if (cancelled) return;

      if (routeCoords?.length) {
        console.log(`TripPlanner: OSRM returned ${routeCoords.length} route points`);
        if (L && map) {
          polylineRef.current = L.polyline(routeCoords, { color: '#6366f1', weight: 4, opacity: 0.9 }).addTo(map);
          console.log('TripPlanner: Polyline added to map');
          // ensure map renders correctly
          map.invalidateSize();
          if (polylineRef.current.bringToFront) polylineRef.current.bringToFront();
          map.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40], maxZoom: 10 });
        } else {
          console.warn('TripPlanner: Map not ready when trying to add polyline');
        }
      } else {
        console.warn('TripPlanner: No route coords returned from fetchRoute');
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
  const toggleOrder = (id) => {
    const order = orders.find(o => o._id === id);
    const orderDate = getOrderDate(order);
    const orderDateStr = orderDate ? orderDate.toISOString().split('T')[0] : null;
    const isDateMismatch = orderDateStr && plannedDate && orderDateStr !== plannedDate;

    setSelectedOrders(prev => {
      // Deselecting is always allowed
      if (prev.includes(id)) return prev.filter(x => x !== id);
      // Block selecting orders whose date doesn't match planned date
      if (isDateMismatch) return prev;
      const next = [...prev, id];
      // If this is the first order, set planned date from order's scheduled_at
      if (prev.length === 0 && orderDate) {
        setPlannedDate(orderDateStr);
        const h = String(orderDate.getHours()).padStart(2, '0');
        const m = String(orderDate.getMinutes()).padStart(2, '0');
        if (h !== '00' || m !== '00') setStartTime(`${h}:${m}`);
      }
      return next;
    });
  };

  const handleDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const next = [...stops];
    const [removed] = next.splice(draggedIdx, 1);
    next.splice(idx, 0, removed);
    // Validate: every Dropoff must come after its Pickup
    if (!isValidStopOrder(next)) {
      showToast('Cannot place a dropoff before its pickup', 'error');
      setDraggedIdx(null); setDragOverIdx(null);
      return;
    }
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
          // s.coords is [lat, lng] (Leaflet order); backend expects [lng, lat] (GeoJSON)
          coordinates: s.coords ? [s.coords[1], s.coords[0]] : undefined,
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
                const orderDate = getOrderDate(o);
                const orderDateStr = orderDate ? orderDate.toISOString().split('T')[0] : null;
                const isDateMismatch = orderDateStr && plannedDate && orderDateStr !== plannedDate;
                const isDisabled = isDateMismatch && !sel;
                return (
                  <div key={o._id}
                    className={`tp-order-card ${sel ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && toggleOrder(o._id)}
                    title={isDisabled ? `Scheduled for ${orderDateStr} — change planned date to match` : ''}
                  >
                    <div className={`tp-order-check ${sel ? 'checked' : ''}`}>{sel ? '✓' : ''}</div>
                    <div className="tp-order-body">
                      <div className="tp-order-id">
                        #{o._id?.slice(-6)}
                        {orderDateStr && <span className="tp-order-date"> · {orderDateStr}</span>}
                      </div>
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
                      {vehicles.map(v => {
                        const conflict = hasScheduleConflict(v, plannedDate, startTime, totalDurationHrs || 12);
                        const unavail = conflict || v.status === 'In Maintenance' || v.status === 'Unavailable';
                        return (
                          <div key={v._id}
                            className={`tp-dd-item ${selectedVehicle === v._id ? 'active' : ''} ${unavail ? 'disabled' : ''}`}
                            onClick={() => { if (unavail) return; setSelectedVehicle(v._id); setShowVehicleMenu(false); }}
                            title={conflict ? 'Has a schedule conflict at this date/time' : ''}
                          >
                            <div>
                              <div className="tp-dd-main">{v.registration}</div>
                              <div className="tp-dd-sub">{v.truck_type} · {v.capacity} tons · {v.name}</div>
                            </div>
                            <span className={`tp-badge ${unavail ? 'tp-badge--warn' : 'tp-badge--ok'}`}>
                              {conflict ? 'Busy' : (v.status || 'Available')}
                            </span>
                          </div>
                        );
                      })}
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
                      {drivers.map(d => {
                        const conflict = hasScheduleConflict(d, plannedDate, startTime, totalDurationHrs || 12);
                        const unavail = conflict || d.status === 'Unavailable';
                        return (
                          <div key={d._id}
                            className={`tp-dd-item ${selectedDriver === d._id ? 'active' : ''} ${unavail ? 'disabled' : ''}`}
                            onClick={() => { if (unavail) return; setSelectedDriver(d._id); setShowDriverMenu(false); }}
                            title={conflict ? 'Has a schedule conflict at this date/time' : ''}
                          >
                            <div className="tp-avatar" style={{ flexShrink: 0 }}>{(d.firstName || '?')[0]}</div>
                            <div>
                              <div className="tp-dd-main">{d.firstName} {d.lastName || ''}</div>
                              <div className="tp-dd-sub">{d.licenseNumber || ''}</div>
                            </div>
                            <span className={`tp-badge ${unavail ? 'tp-badge--warn' : 'tp-badge--ok'}`}>
                              {conflict ? 'Busy' : (d.status || 'Active')}
                            </span>
                          </div>
                        );
                      })}
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
