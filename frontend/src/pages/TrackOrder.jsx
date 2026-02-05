// src/pages/TrackOrderPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails, clearCurrentOrder } from '../store/slices/ordersSlice';
import UserActions from '../components/trackOrders/UserActions';
import ChatWindow from '../components/trackOrders/ChatWindow';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
// import LiveTracking from '../components/trackOrders/LiveTracking';
// import { fetchTrackingData, clearTracking } from '../store/slices/trackingSlice';

import '../styles/TrackOrder.css';

const TrackOrderPage = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();




  const { currentOrder, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const userType = user?.role; // 'Customer' or 'Transporter'


  console.log({ currentOrder, orderId })

  useEffect(() => {
    if (orderId && userType) {
      // Fetch all data
      dispatch(fetchOrderDetails(orderId));
      // dispatch(fetchChatMessages(orderId));
      // dispatch(fetchTrackingData({ orderId, userType }));
    }
    return () => {
      dispatch(clearCurrentOrder());
      // dispatch(clearChat());
      // dispatch(clearTracking());
    };
  }, [orderId, userType, dispatch]);

  // console.log(currentOrder);

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
      <div className="container">
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

  return (
    <>
      <Header />
      <div className="container">
        <div id="main-content">

          <div id="page-header" className="page-header">
            <h1>
              Order Details <span className="order-id">#{currentOrder._id}</span>
            </h1>
            <div className="status-update">
              <span className="status-label">Status:</span>
              <span className={`status-badge-${currentOrder.status.toLowerCase().replace(' ', '-')}`}>
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
            <div className={`combined-section ${expandedSection ? 'expanded' : ''}`}>
              <div className={`tracking-card ${expandedSection === 'tracking' ? 'expanded-card' : ''} ${expandedSection && expandedSection !== 'tracking' ? 'hidden-card' : ''}`}>
                <div class="card">
                  <div class="card-header">
                    <h2 class="card-title">Live Tracking</h2>
                  </div>
                  <div class="map-container">
                    <div class="map-placeholder">
                      <div class="loader"></div>
                      <p>Loading map...</p>
                    </div>
                  </div>
                  <div class="action-buttons">
                    <button class="btn btn-outline">View Route</button>
                  </div>
                </div>
              </div>
              {/* <LiveTracking isExpanded={expandedSection === 'tracking'} onToggleExpand={() => toggleExpand('tracking')}/> */}



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