// src/pages/TrackOrderPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { fetchOrderDetails, clearCurrentOrder } from '../store/slices/ordersSlice';
import UserActions from '../components/trackOrders/UserActions';
import ChatWindow from '../components/trackOrders/ChatWindow';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { getOrderTracking } from '../api/trips';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { normalizeCoordinates, getDirections, INDIA_CENTER, DEFAULT_MAP_OPTIONS } from '../utils/googleMapsConfig';

import '../styles/TrackOrder.css';

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
  const { isLoaded, loadError } = useGoogleMaps();

  const { currentOrder, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const userType = user?.role; // 'Customer' or 'Transporter'

  // ─── Tracking state ───
  const [tracking, setTracking] = useState(null);
  const [map, setMap] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [deliveryMarker, setDeliveryMarker] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  console.log({ currentOrder, orderId });

  useEffect(() => {
    if (orderId && userType) {
      dispatch(fetchOrderDetails(orderId));
    }
    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [orderId, userType, dispatch]);

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

  // ─── Update map markers and route from order data ───
  useEffect(() => {
    if (!isLoaded || !currentOrder) return;

    const pickup = currentOrder.pickup;
    const delivery = currentOrder.delivery;

    // Set pickup marker
    if (pickup?.coordinates?.length === 2) {
      const pickupLatLng = normalizeCoordinates(pickup.coordinates);
      if (pickupLatLng) {
        setPickupMarker({
          position: pickupLatLng,
          label: 'Pickup',
          city: pickup.city,
          state: pickup.state,
        });
      }
    }

    // Set delivery marker
    if (delivery?.coordinates?.length === 2) {
      const deliveryLatLng = normalizeCoordinates(delivery.coordinates);
      if (deliveryLatLng) {
        setDeliveryMarker({
          position: deliveryLatLng,
          label: 'Delivery',
          city: delivery.city,
          state: delivery.state,
        });
      }
    }

    // Get directions for route
    if (pickup?.coordinates?.length === 2 && delivery?.coordinates?.length === 2) {
      const pickupLatLng = normalizeCoordinates(pickup.coordinates);
      const deliveryLatLng = normalizeCoordinates(delivery.coordinates);
      
      if (pickupLatLng && deliveryLatLng) {
        getDirections([pickupLatLng, deliveryLatLng])
          .then((result) => {
            const path = result.routes[0].overview_path;
            setRoutePath(path);
            
            // Fit bounds to show entire route
            if (map && path.length > 0) {
              const bounds = new google.maps.LatLngBounds();
              path.forEach(point => bounds.extend(point));
              map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
            }
          })
          .catch((err) => {
            console.error('Failed to get directions:', err);
            // Fallback: just fit to markers
            if (map) {
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(pickupLatLng);
              bounds.extend(deliveryLatLng);
              map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
            }
          });
      }
    }
  }, [currentOrder, isLoaded, map]);

  // ─── Live driver location marker ───
  useEffect(() => {
    if (!isLoaded) return;

    const driverCoords = tracking?.trip?.current_location?.coordinates;
    if (driverCoords?.length === 2) {
      const driverLatLng = normalizeCoordinates(driverCoords);
      if (driverLatLng) {
        setDriverMarker({
          position: driverLatLng,
          label: 'Driver',
        });
      }
    } else {
      setDriverMarker(null);
    }
  }, [tracking?.trip?.current_location, isLoaded]);

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

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

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
    return <p>No Current Order</p>;
  }

  if (loadError) {
    return <div>Error loading maps</div>;
  }

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
                    <p className="detail-value">{currentOrder.truck_type || "Not assigned yet"}</p>
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
                          src={`http://localhost:3000${currentOrder.cargo_photo}`}
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
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrder.shipments.map((item, index) => (
                        <tr key={index}>
                          <td>{item.item_name}</td>
                          <td>{item.quantity}</td>
                          <td>${item.price}</td>
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
            <div className={`combined-section ${expandedSection ? 'expanded' : ''}`}>
              <div className={`tracking-card ${expandedSection === 'tracking' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'tracking' ? 'hidden-card' : ''}`}>
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Live Tracking</h2>
                  </div>
                  <div className="map-container" style={{ height: '350px' }}>
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={(pickupMarker && deliveryMarker) ? undefined : INDIA_CENTER}
                        zoom={5}
                        onLoad={onMapLoad}
                        onUnmount={onMapUnmount}
                        options={DEFAULT_MAP_OPTIONS}
                      >
                        {/* Pickup Marker */}
                        {pickupMarker && (
                          <Marker
                            position={pickupMarker.position}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              fillColor: '#22c55e',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 3,
                              scale: 7,
                            }}
                            onClick={() => setSelectedMarker('pickup')}
                          />
                        )}

                        {/* Delivery Marker */}
                        {deliveryMarker && (
                          <Marker
                            position={deliveryMarker.position}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              fillColor: '#ef4444',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 3,
                              scale: 7,
                            }}
                            onClick={() => setSelectedMarker('delivery')}
                          />
                        )}

                        {/* Driver Live Location Marker */}
                        {driverMarker && (
                          <Marker
                            position={driverMarker.position}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              fillColor: '#3b82f6',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 3,
                              scale: 8,
                            }}
                            animation={google.maps.Animation.BOUNCE}
                            onClick={() => setSelectedMarker('driver')}
                          />
                        )}

                        {/* Route Polyline */}
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

                        {/* Info Windows */}
                        {selectedMarker === 'pickup' && pickupMarker && (
                          <InfoWindow
                            position={pickupMarker.position}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div>
                              <strong>Pickup</strong><br />
                              {pickupMarker.city}, {pickupMarker.state}
                            </div>
                          </InfoWindow>
                        )}

                        {selectedMarker === 'delivery' && deliveryMarker && (
                          <InfoWindow
                            position={deliveryMarker.position}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div>
                              <strong>Delivery</strong><br />
                              {deliveryMarker.city}, {deliveryMarker.state}
                            </div>
                          </InfoWindow>
                        )}

                        {selectedMarker === 'driver' && driverMarker && (
                          <InfoWindow
                            position={driverMarker.position}
                            onCloseClick={() => setSelectedMarker(null)}
                          >
                            <div>
                              <strong>Driver Location</strong><br />
                              Live tracking
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <p>Loading map...</p>
                      </div>
                    )}
                  </div>
                  {tracking?.trip && (
                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#4b5563', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span><strong>Status:</strong> {tracking.trip.status || '—'}</span>
                      {tracking.trip.assigned_vehicle?.registration && <span><strong>Vehicle:</strong> {tracking.trip.assigned_vehicle.registration}</span>}
                      {tracking.trip.assigned_driver && <span><strong>Driver:</strong> {tracking.trip.assigned_driver.firstName} {tracking.trip.assigned_driver.lastName}</span>}
                      {tracking.stops?.length > 0 && <span><strong>Progress:</strong> {tracking.stops.filter(s => s.status === 'Completed').length} / {tracking.stops.length} stops</span>}
                      {tracking.trip.current_location?.updated_at && <span><strong>Updated:</strong> {new Date(tracking.trip.current_location.updated_at).toLocaleTimeString('en-IN')}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className={`chat-card ${expandedSection === 'chat' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'chat' ? 'hidden-card' : ''}`}>
                <ChatWindow orderId={orderId} userType={userType} />
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default TrackOrderPage;