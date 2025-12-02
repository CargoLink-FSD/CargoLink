import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import './OrderDetails.css';

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const user = useSelector((state) => state.auth.user);
  const userType = user?.role; // 'customer' or 'transporter'

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await http.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      showNotification({ message: 'Failed to load order details', type: 'error' });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    return status ? status.toLowerCase().replace(/\s+/g, '-') : 'unknown';
  };

  const calculateInsurance = () => {
    if (!order?.shipments || order.shipments.length === 0) return 0;
    const totalValue = order.shipments.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return (totalValue * 0.02).toFixed(2); // 2% insurance
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="error-state">
            <p>Order not found</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container">
        <div className="order-info-container">
          {/* Order Header */}
          <div className="order-header">
            <h2>Order #{order._id?.slice(-8).toUpperCase()}</h2>
            <span className={`status-badge ${getStatusClass(order.status)}`}>
              {order.status}
            </span>
          </div>

          {/* Route Information */}
          <div className="info-section">
            <h3>Route Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">From</span>
                <span className="value">
                  {order.pickup?.street}, {order.pickup?.city}, {order.pickup?.state} - {order.pickup?.pin}
                </span>
              </div>
              <div className="info-item">
                <span className="label">To</span>
                <span className="value">
                  {order.delivery?.street}, {order.delivery?.city}, {order.delivery?.state} - {order.delivery?.pin}
                </span>
              </div>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Pickup Date</span>
                <span className="value">{formatDate(order.scheduled_at)}</span>
              </div>
              <div className="info-item">
                <span className="label">Pickup Time</span>
                <span className="value">{formatTime(order.scheduled_at)}</span>
              </div>
              <div className="info-item">
                <span className="label">Distance</span>
                <span className="value">{order.distance} km</span>
              </div>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="info-section">
            <h3>Cargo Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Vehicle Type</span>
                <span className="value">{order.truck_type}</span>
              </div>
              <div className="info-item">
                <span className="label">Cargo Type</span>
                <span className="value">{order.goods_type}</span>
              </div>
              <div className="info-item">
                <span className="label">Weight</span>
                <span className="value">{order.weight} kg</span>
              </div>
            </div>
            {order.description && (
              <div className="info-item" style={{ marginTop: '1rem' }}>
                <span className="label">Description</span>
                <span className="value">{order.description}</span>
              </div>
            )}
            {order.special_instructions && (
              <div className="info-item" style={{ marginTop: '1rem' }}>
                <span className="label">Special Instructions</span>
                <span className="value">{order.special_instructions}</span>
              </div>
            )}
          </div>

          {/* Shipment Items */}
          {order.shipments && order.shipments.length > 0 && (
            <div className="info-section">
              <h3>Shipment Items</h3>
              <table className="shipment-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.shipments.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price.toFixed(2)}</td>
                      <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="insurance-amount">
                <p>Insurance Amount (2%): <span>₹{calculateInsurance()}</span></p>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="info-section">
            <h3>Payment Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Maximum Price</span>
                <span className="value">₹{order.max_price?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Final Price</span>
                <span className="value earnings">₹{order.final_price?.toFixed(2) || 'Not Assigned'}</span>
              </div>
            </div>
          </div>

          {/* Transporter Information (for customers) */}
          {userType === 'customer' && order.assigned_transporter_id && (
            <div className="info-section">
              <h3>Transporter Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name</span>
                  <span className="value">{order.assigned_transporter_id.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Contact</span>
                  <span className="value">{order.assigned_transporter_id.primary_contact || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{order.assigned_transporter_id.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Customer Information (for transporters) */}
          {userType === 'transporter' && order.customer_id && (
            <div className="info-section">
              <h3>Customer Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name</span>
                  <span className="value">
                    {order.customer_id.firstName} {order.customer_id.lastName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Contact</span>
                  <span className="value">{order.customer_id.phone || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{order.customer_id.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back to Orders
            </button>
          </div>
        </div>
      </main>
    </>
  );
}