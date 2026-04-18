// src/pages/TrackOrderPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails, clearCurrentOrder } from '../store/slices/ordersSlice';
import UserActions from '../components/trackOrders/UserActions';
import ChatWindow from '../components/trackOrders/ChatWindow';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { getOrderTracking } from '../api/trips';
import { toApiUrl } from '../utils/apiBase';

import '../styles/TrackOrder.css';

// Normalize coords to Leaflet [lat, lng]
const toLatLng = (c) => {
  if (!c || c.length < 2) return null;
  const a = Number(c[0]), b = Number(c[1]);
  if (isNaN(a) || isNaN(b)) return null;
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  if (a > 50 && b < 40) return [b, a];
  return [a, b];
};

// Convert coords to OSRM "lng,lat" string
const toOsrmCoord = (coords) => {
  const ll = toLatLng(coords);
  if (!ll) return null;
  return `${ll[1]},${ll[0]}`;
};

// ─── OTP display block (copy on click) ─────────────────────────────────────────
const OtpBlock = ({ label, otp, hint, color }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(otp).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <div className="to-otp-block" style={{ '--otp-color': color }}>
      <div className="to-otp-label">{label}</div>
      <div className="to-otp-value" onClick={handleCopy} title="Click to copy">
        {otp}
        <span className="to-otp-copy">{copied ? 'Copied' : 'Copy'}</span>
      </div>
      <div className="to-otp-sub">{hint}</div>
    </div>
  );
};

const TrackOrderPage = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();

  const { currentOrder, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const userType = user?.role; // 'Customer' or 'Transporter'

  // ─── Tracking state ───
  const [tracking, setTracking] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapContainerRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const driverMarkerRef = useRef(null);


  useEffect(() => {
    if (orderId && userType) {
      dispatch(fetchOrderDetails(orderId));
    }
    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [orderId, userType, dispatch]);

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
      const check = setInterval(() => { if (window.L) { setMapReady(true); clearInterval(check); } }, 100);
      return () => clearInterval(check);
    }
  }, []);

  // ─── Init map (retry until container is available) ───
  useEffect(() => {
    if (!mapReady) return;
    let intervalId = null;

    const tryInit = () => {
      if (leafletMap.current || !mapContainerRef.current) return !!leafletMap.current;
      const L = window.L;
      if (!L) return false;
      const map = L.map(mapContainerRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap',
      }).addTo(map);
      map.setView([20.5, 78.9], 5);
      leafletMap.current = map;
      setTimeout(() => map.invalidateSize(), 300);
      setMapInitialized(true);
      return true;
    };

    if (!tryInit()) {
      intervalId = setInterval(() => {
        if (tryInit() && intervalId) { clearInterval(intervalId); intervalId = null; }
      }, 200);
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [mapReady]);

  // ─── Fetch tracking data ───
  const fetchTracking = useCallback(async () => {
    if (!orderId || userType !== 'customer') return;
    try {
      const data = await getOrderTracking(orderId);
      setTracking(data);
    } catch (err) {
      console.log('Tracking not available:', err.message);
    }
  }, [orderId, userType]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  // Poll tracking every 15 seconds
  useEffect(() => {
    if (!orderId || userType !== 'customer') return;
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
  }, [orderId, userType, fetchTracking]);

  // ─── Update map from tracking data ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map || !currentOrder) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }

    const pickup = currentOrder.pickup;
    const delivery = currentOrder.delivery;
    const osrmParts = [];

    // Pickup marker
    if (pickup?.coordinates?.length === 2) {
      const ll = toLatLng(pickup.coordinates);
      if (ll) {
        const pickupIcon = L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        });
        const m = L.marker(ll, { icon: pickupIcon }).addTo(map);
        m.bindPopup(`<b>Pickup</b><br/>${pickup.city || ''}, ${pickup.state || ''}`);
        markersRef.current.push(m);
        osrmParts.push(toOsrmCoord(pickup.coordinates));
      }
    }

    // Delivery marker
    if (delivery?.coordinates?.length === 2) {
      const ll = toLatLng(delivery.coordinates);
      if (ll) {
        const deliveryIcon = L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        });
        const m = L.marker(ll, { icon: deliveryIcon }).addTo(map);
        m.bindPopup(`<b>Delivery</b><br/>${delivery.city || ''}, ${delivery.state || ''}`);
        markersRef.current.push(m);
        osrmParts.push(toOsrmCoord(delivery.coordinates));
      }
    }

    // OSRM route
    const validOsrm = osrmParts.filter(Boolean);
    if (validOsrm.length === 2) {
      const coords = validOsrm.join(';');
      fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes?.[0]) {
            const routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            polylineRef.current = L.polyline(routeCoords, { color: '#6366f1', weight: 4, opacity: 0.8 }).addTo(map);
            map.fitBounds(L.latLngBounds(routeCoords), { padding: [40, 40], maxZoom: 13 });
          }
        })
        .catch(() => { });
    } else if (markersRef.current.length > 0) {
      const bounds = L.latLngBounds(markersRef.current.map(m => m.getLatLng()));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [currentOrder, mapInitialized]);

  // ─── Live driver location marker ───
  useEffect(() => {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) return;

    const driverCoords = tracking?.trip?.current_location?.coordinates;
    if (driverCoords?.length === 2) {
      const ll = toLatLng(driverCoords);
      if (!ll) return;
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(ll);
      } else {
        const icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(59,130,246,0.4);position:relative"><div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(59,130,246,0.15);animation:livePulse 2s ease-in-out infinite"></div></div>',
          iconSize: [16, 16], iconAnchor: [8, 8],
        });
        driverMarkerRef.current = L.marker(ll, { icon, zIndexOffset: 1000 }).addTo(map);
        driverMarkerRef.current.bindPopup('<b>Driver Location</b>');
      }
    }
  }, [tracking?.trip?.current_location, mapInitialized]);

  const [expandedSection, setExpandedSection] = useState(null);

  const toggleExpand = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const [total, setTotal] = useState(0);

  const calculateTotal = useCallback(() => {
    if (!currentOrder?.shipments) return;
    let totalAmount = 0;
    currentOrder.shipments.forEach((item) => {
      const price = parseFloat(item.price);
      const adjustedPrice = item.delivery_status === 'Damaged' ? price * 0.9 : price;
      totalAmount += adjustedPrice;
    });
    setTotal(totalAmount);
  }, [currentOrder?.shipments]);

  useEffect(() => {
    if (userType === 'customer' && currentOrder?.shipments) {
      calculateTotal();
    }
  }, [currentOrder?.shipments, userType, calculateTotal]);


  //   // Poll for chat updates every 10 seconds
  //   useEffect(() => {
  //     if (!orderId) return;
  //     const chatInterval = setInterval(() => {
  //       dispatch(fetchChatMessages(orderId));
  //     }, 10000);
  //     return () => clearInterval(chatInterval);
  //   }, [orderId, dispatch]);

  //   // Poll for tracking updates every 15 seconds
  //   useEffect(() => {
  //     if (!orderId || !userType) return;
  //     const trackingInterval = setInterval(() => {
  //       dispatch(fetchTrackingData({ orderId, userType }));
  //     }, 15000);
  //     return () => clearInterval(trackingInterval);
  //   }, [orderId, userType, dispatch]);


  if (loading) {
    return (
      <div className="track-order-page">
        <div id="tracking-loading" className="loading-container">
          <div className="loader"></div>
          <p>Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (!currentOrder) {
    return <p>No Current Order</p>
  }

  const normalizedOrderStatus = String(currentOrder.status || '').toLowerCase();
  const isInTransit = ['in transit', 'in-transit'].includes(normalizedOrderStatus);
  const showCustomerChat = userType !== 'customer' || isInTransit;
  const combinedSectionClass = `combined-section ${expandedSection ? 'expanded' : ''} ${showCustomerChat ? '' : 'single-panel'}`.trim();
  const scheduledAssignment = currentOrder.scheduled_assignment || null;
  const assignedVehicleLabel =
    scheduledAssignment?.vehicle?.registration ||
    currentOrder.assignment?.vehicle_number ||
    'Not assigned yet';
  const assignedVehicleType =
    scheduledAssignment?.vehicle?.truck_type ||
    currentOrder.assignment?.vehicle_type ||
    'N/A';
  const assignedDriverName = scheduledAssignment?.driver
    ? `${scheduledAssignment.driver.firstName || ''} ${scheduledAssignment.driver.lastName || ''}`.trim()
    : 'Not assigned yet';
  const assignedTransporterName =
    scheduledAssignment?.transporter?.name ||
    currentOrder.assigned_transporter_id?.name ||
    'Not assigned yet';

  return (
    <>
      <Header />
      <div className="track-order-page">
        <div id="main-content">

          <div id="page-header" className="page-header">
            <h1>
              Order Details <span className="order-id">#{currentOrder._id}</span>
            </h1>
            <div className="status-update">
              <span className="status-label">Status:</span>
              <span
                className={`status-badge ${String(currentOrder.status || '')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace('in-transit', 'active')}`}
              >
                {currentOrder.status}
              </span>
            </div>
          </div>

          <div id="order-details-container" className="order-grid">
            <div className="left-column">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Shipment Information</h2>
                </div>
                <div className="shipment-details">
                  <div className="detail-group">
                    <p className="detail-label">Pickup Date & Time</p>
                    <p className="detail-value">{new Date(currentOrder.scheduled_at).toLocaleString("en-IN", { dateStyle: 'medium', timeStyle: 'short' }) || "Not specified"}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Delivery ETA</p>
                    <p className="detail-value">{currentOrder.deliveryDate || "Not specified"}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Pickup Location</p>
                    <p className="detail-value">{`${currentOrder.pickup.street}, ${currentOrder.pickup.city}, ${currentOrder.pickup.state} ${currentOrder.pickup.pin}`}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Delivery Location</p>
                    <p className="detail-value">{`${currentOrder.delivery.street}, ${currentOrder.delivery.city}, ${currentOrder.delivery.state} ${currentOrder.delivery.pin}`}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Cargo Description</p>
                    <p className="detail-value">{`${currentOrder.goods_type} - ${currentOrder.shipments.length} items`}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Weight</p>
                    <p className="detail-value">{currentOrder.weight || "Not specified"}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Vehicle Assigned</p>
                    <p className="detail-value">{assignedVehicleLabel} ({assignedVehicleType})</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Assigned Driver</p>
                    <p className="detail-value">{assignedDriverName}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Transporter</p>
                    <p className="detail-value">{assignedTransporterName}</p>
                  </div>
                  <div className="detail-group">
                    <p className="detail-label">Payment Amount</p>
                    <p className="detail-value">
                      {currentOrder.final_price ? `₹${currentOrder.final_price}` : "Not finalized"}
                    </p>
                  </div>
                  {currentOrder.cargo_photo && (
                    <div className="detail-group">
                      <p className="detail-label">Cargo Photo</p>
                      <div className="cargo-photo-wrapper">
                        <img
                          src={toApiUrl(currentOrder.cargo_photo)}
                          alt="Cargo"
                          className="cargo-photo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="right-column">

              {/* ─── OTP Confirmation Codes ─── */}
              {userType === 'customer' && ['Assigned', 'Scheduled', 'Started', 'In Transit'].includes(currentOrder.status) &&
                (currentOrder.pickup_otp || currentOrder.delivery_otp) && (
                  <div className="card to-otp-card">
                    <div className="card-header">
                      <h2 className="card-title">Confirmation Codes</h2>
                    </div>
                    <p className="to-otp-hint">Show these codes to the driver when they arrive. Keep them safe.</p>
                    <div className="to-otp-grid">
                      {currentOrder.pickup_otp && (
                        <OtpBlock label="Pickup OTP" otp={currentOrder.pickup_otp}
                          hint="Give to driver at pickup location" color="#22c55e" />
                      )}
                      {currentOrder.delivery_otp && (
                        <OtpBlock label="Delivery OTP" otp={currentOrder.delivery_otp}
                          hint="Receiver gives to driver at delivery" color="#6366f1" />
                      )}
                    </div>
                  </div>
                )}

              {/* ─── Stop Progress (from tracking) ─── */}
              {tracking?.stops?.length > 0 && (
                <div className="card to-stops-card">
                  <div className="card-header">
                    <h2 className="card-title">Trip Progress</h2>
                  </div>
                  <div className="to-stops-list">
                    {tracking.stops.map((stop, idx) => {
                      const isDone = stop.status === 'Completed';
                      const isActive = stop.status === 'En Route' || stop.status === 'Arrived';
                      const isDelay = stop.type === 'Delay';
                      return (
                        <div key={stop._id || idx} className={`to-stop-row ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                          <div className="to-stop-dot-wrap">
                            <div className={`to-stop-dot ${isDone ? 'done' : isActive ? 'active' : ''} ${isDelay ? 'delay' : ''}`}>
                              {isDone ? '✓' : isDelay ? '⚠' : idx + 1}
                            </div>
                            {idx < tracking.stops.length - 1 && <div className="to-stop-line" />}
                          </div>
                          <div className="to-stop-body">
                            <div className="to-stop-meta">
                              <span className={`to-stop-type ${stop.type?.toLowerCase()}`}>
                                {stop.type === 'Pickup' ? '↑ Pickup' : stop.type === 'Dropoff' ? '↓ Dropoff' : stop.type === 'Delay' ? '⚠ Delay' : '● Waypoint'}
                              </span>
                              {stop.eta_at && <span className="to-stop-eta">{new Date(stop.eta_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="to-stop-addr">
                              {stop.address?.city && <strong>{stop.address.city}</strong>}
                              {stop.address?.state && <span>, {stop.address.state}</span>}
                            </div>
                            {isDone && stop.actual_arrival_at && (
                              <div className="to-stop-done-time">Arrived {new Date(stop.actual_arrival_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                            {isDelay && stop.delay_reason && (
                              <div className="to-stop-delay-reason">⚠ {stop.delay_reason}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <UserActions order={currentOrder} userRole={userType} />
            </div>
          </div>

          <div id="shipment-details-container" className="shipment-items-card">
            <div className="card">
              <div className="shipment-card">
                <h3>Shipment Items</h3>
                <div className="shipment-items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        {/* {userType === 'customer' && <th>Delivery Status</th>} */}
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrder.shipments.map((item, index) => (
                        <tr key={index}>
                          <td>{item.item_name}</td>
                          <td>{item.quantity}</td>
                          <td>${item.price}</td>
                          {/* {userType === 'customer' && (
                          <td>
                            <select
                              className="delivery-status"
                              value={item.delivery_status || 'Delivered'}
                              onChange={() => calculateTotal()}
                            >
                              <option value="Delivered">Delivered</option>
                              <option value="Damaged">Damaged</option>
                            </select>
                          </td>
                        )} */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {userType === 'customer' && (
                  <div className="payment-section">
                    <span className="total-amount">
                      Total: $<span id="total-amount">{total.toFixed(2)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div id="tracking-container" className="tracking-section">
            <div className={combinedSectionClass}>
              <div className={`tracking-card ${expandedSection === 'tracking' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'tracking' ? 'hidden-card' : ''}`}>
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Live Tracking</h2>
                  </div>
                  <div className="map-container" style={{ height: '350px' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                  </div>
                  {tracking?.trip && (
                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#4b5563', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span><strong>Status:</strong> {tracking.trip.status || '—'}</span>
                      {tracking.trip.transporter?.name && <span><strong>Transporter:</strong> {tracking.trip.transporter.name}</span>}
                      <span><strong>Vehicle:</strong> {tracking.trip.assigned_vehicle?.registration || assignedVehicleLabel || '—'}</span>
                      {(tracking.trip.assigned_driver || assignedDriverName !== 'Not assigned yet') && (
                        <span>
                          <strong>Driver:</strong>{' '}
                          {tracking.trip.assigned_driver
                            ? `${tracking.trip.assigned_driver.firstName || ''} ${tracking.trip.assigned_driver.lastName || ''}`.trim() || '—'
                            : assignedDriverName}
                          {tracking.trip.assigned_driver?.phone ? ` (${tracking.trip.assigned_driver.phone})` : ''}
                        </span>
                      )}
                      {tracking.stops?.length > 0 && <span><strong>Progress:</strong> {tracking.stops.filter(s => s.status === 'Completed').length} / {tracking.stops.length} stops</span>}
                      {tracking.trip.current_location?.updated_at && <span><strong>Updated:</strong> {new Date(tracking.trip.current_location.updated_at).toLocaleTimeString('en-IN')}</span>}
                    </div>
                  )}
                </div>
              </div>
              {/* <LiveTracking isExpanded={expandedSection === 'tracking'} onToggleExpand={() => toggleExpand('tracking')}/> */}



              {showCustomerChat ? (
                <div className={`chat-card ${expandedSection === 'chat' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'chat' ? 'hidden-card' : ''}`}>
                  <ChatWindow orderId={orderId} userType={userType} />
                </div>
              ) : (
                <div className="card chat-availability-card">
                  <div className="card-header">
                    <h2 className="card-title">Chat</h2>
                  </div>
                  <div className="chat-availability-body">
                    Chat becomes available when your order is in transit.
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default TrackOrderPage;