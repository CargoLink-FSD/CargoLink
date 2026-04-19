// src/pages/TrackOrderPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails, clearCurrentOrder } from '../../store/slices/ordersSlice';
import UserActions from '../../components/trackOrders/UserActions';
import ChatWindow from '../../components/trackOrders/ChatWindow';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import MapDisplay from '../../components/common/MapDisplay';
import { getOrderTracking } from '../../api/trips';
import { toApiUrl } from '../../utils/apiBase';

import '../../styles/TrackOrder.css';
// Map-related helpers are handled inside MapDisplay component.

// Convert coords to OSRM "lng,lat" string (unused in this page — MapDisplay handles routing)

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

  const { currentOrder, loading } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const userType = user?.role; // 'Customer' or 'Transporter'

  // ─── Tracking state ───
  const [tracking, setTracking] = useState(null);


  useEffect(() => {
    if (orderId && userType) {
      dispatch(fetchOrderDetails(orderId));
    }
    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [orderId, userType, dispatch]);

  // Map initialization and leaflet is handled by MapDisplay component now.

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

  // Map rendering and driver location are handled by `MapDisplay` now.

  const [expandedSection] = useState(null);

  

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

  // Build stops for MapDisplay from currentOrder (pickup + delivery)
  const mapStops = [];
  if (currentOrder?.pickup?.coordinates?.length === 2) {
    const pickupTracking = tracking?.stops?.find(s => s.type === 'Pickup') || {};
    mapStops.push({
      _id: pickupTracking._id || `${currentOrder._id}-pickup`,
      type: 'Pickup',
      status: pickupTracking.status || currentOrder.status || 'Pending',
      address: { coordinates: currentOrder.pickup.coordinates, city: currentOrder.pickup.city, state: currentOrder.pickup.state },
      actual_start_at: pickupTracking.actual_start_at || pickupTracking.actual_departure_at || pickupTracking.actual_arrival_at
    });
  }
  if (currentOrder?.delivery?.coordinates?.length === 2) {
    const deliveryTracking = tracking?.stops?.find(s => s.type === 'Dropoff') || {};
    mapStops.push({
      _id: deliveryTracking._id || `${currentOrder._id}-dropoff`,
      type: 'Dropoff',
      status: deliveryTracking.status || currentOrder.status || 'Pending',
      address: { coordinates: currentOrder.delivery.coordinates, city: currentOrder.delivery.city, state: currentOrder.delivery.state },
      actual_start_at: deliveryTracking.actual_start_at || deliveryTracking.actual_departure_at || deliveryTracking.actual_arrival_at
    });
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
                          Total: Rs. <span id="total-amount">{total.toFixed(2)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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

              <UserActions order={currentOrder} userRole={userType} />
            </div>
          </div>

          <div id="tracking-container" className="tracking-section">
            {/* <div className={combinedSectionClass}> */}
              <div className={`tracking-card ${expandedSection === 'tracking' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'tracking' ? 'hidden-card' : ''}`}>
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Live Tracking</h2>
                  </div>
                  <div className="map-container" style={{ height: '800px' }}>
                    <MapDisplay
                      stops={mapStops}
                      currentLocation={tracking?.trip?.current_location?.coordinates}
                      tripStatus={tracking?.trip?.status || currentOrder.status}
                      orderStatus={currentOrder.status}
                      showLive={true}
                      routeMode="trackorder"
                    />
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


            {/* </div> */}
          </div>

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
      <Footer />
    </>
  );
};

export default TrackOrderPage;