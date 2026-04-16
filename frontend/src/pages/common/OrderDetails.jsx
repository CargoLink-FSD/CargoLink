import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import { paymentAPI } from '../../api/payment';
import Header from '../../components/common/Header';
import TransporterProfileModal, { StarRating } from '../../components/common/TransporterProfileModal';
import ReviewModal from '../../components/customer/ReviewModal';
import { toApiUrl } from '../../utils/apiBase';
import './OrderDetails.css';

function QuoteBreakdownTable({ breakdown, total }) {
  if (!breakdown) return null;

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  let sno = 0;
  const rows = [];

  rows.push({ label: 'Transportation Charges', value: formatINR(breakdown.transportation_charges) });

  if (breakdown.packing_included) rows.push({ label: 'Packing Cost', value: 'Included' });
  else if (breakdown.packing_cost > 0) rows.push({ label: 'Packing Cost', value: formatINR(breakdown.packing_cost) });

  if (breakdown.loading_included) rows.push({ label: 'Loading Charges', value: 'Included' });
  else if (breakdown.loading_charges > 0) rows.push({ label: 'Loading Charges', value: formatINR(breakdown.loading_charges) });

  if (breakdown.toll_cost > 0) rows.push({ label: 'Toll Cost', value: formatINR(breakdown.toll_cost) });
  if (breakdown.octroi_entry_tax > 0) rows.push({ label: 'Octroi / Entry Tax', value: formatINR(breakdown.octroi_entry_tax) });

  if (breakdown.risk_coverage && breakdown.risk_coverage.amount > 0) {
    rows.push({
      label: `Transit Risk @ ${breakdown.risk_coverage.rate_percent}% on ${formatINR(breakdown.risk_coverage.on_declared_value)}`,
      value: formatINR(breakdown.risk_coverage.amount),
    });
  }

  if (breakdown.storage_charges > 0) rows.push({ label: 'Storage Charges', value: formatINR(breakdown.storage_charges) });

  if (breakdown.custom_items && breakdown.custom_items.length > 0) {
    breakdown.custom_items.forEach((ci) => rows.push({ label: ci.label, value: formatINR(ci.amount) }));
  }

  if (breakdown.gst && breakdown.gst.amount > 0) {
    rows.push({ label: `GST @ ${breakdown.gst.rate_percent}%`, value: formatINR(breakdown.gst.amount), isGst: true });
  }

  return (
    <div className="order-breakdown-view">
      <table className="breakdown-table">
        <thead>
          <tr>
            <th className="bt-sno">S.No</th>
            <th className="bt-particular">Particular</th>
            <th className="bt-charges">Charges</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={row.isGst ? 'bt-row-gst' : ''}>
              <td>{++sno}.</td>
              <td>{row.label}</td>
              <td className={row.value === 'Included' ? 'bt-included' : ''}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total && (
        <div className="breakdown-total-row">
          <span>Grand Total</span>
          <span className="breakdown-total-amount">{formatINR(total)}</span>
        </div>
      )}
    </div>
  );
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const user = useSelector((state) => state.auth.user);
  const userType = user?.role; // 'customer' or 'transporter'

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [transporterRating, setTransporterRating] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [orderReview, setOrderReview] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  // Fetch review details (if already reviewed)
  useEffect(() => {
    if (userType !== 'customer') return;
    if (!order?._id) return;
    if (!order.is_reviewed) {
      setOrderReview(null);
      return;
    }

    paymentAPI
      .getOrderReview(order._id)
      .then((res) => {
        setOrderReview(res?.data || null);
      })
      .catch(() => {
        setOrderReview(null);
      });
  }, [order?._id, order?.is_reviewed, userType]);

  // Fetch transporter rating when order loads
  useEffect(() => {
    if (order?.assigned_transporter_id?._id && userType === 'customer') {
      http.get(`/api/transporters/${order.assigned_transporter_id._id}/public-profile`)
        .then(res => {
          const data = res.data;
          setTransporterRating({
            avgRating: data.averageRating,
            totalReviews: data.totalReviews
          });
        })
        .catch(() => {});
    }
  }, [order, userType]);

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

  const truckTypeLabel = (t) => {
    const map = {
      van: 'Van',
      'truck-small': 'Small Truck',
      'truck-medium': 'Medium Truck',
      'truck-large': 'Large Truck',
      refrigerated: 'Refrigerated Truck',
      flatbed: 'Flatbed Truck',
      container: 'Container Truck',
      any: 'Any',
    };
    return map[t] || t || '—';
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
                <span className="value">{truckTypeLabel(order.truck_type)}</span>
              </div>
              <div className="info-item">
                <span className="label">Cargo Type</span>
                <span className="value">{order.goods_type}</span>
              </div>
              <div className="info-item">
                <span className="label">Weight</span>
                <span className="value">{order.weight} kg</span>
              </div>
              {order.toll_cost > 0 && (
                <div className="info-item">
                  <span className="label">Est. Toll Cost</span>
                  <span className="value">₹{order.toll_cost?.toLocaleString('en-IN')}</span>
                </div>
              )}
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
            {order.cargo_photo && (
              <div className="info-item" style={{ marginTop: '1rem' }}>
                <span className="label">Cargo Photo</span>
                <div className="cargo-photo-display">
                  <img
                    src={toApiUrl(order.cargo_photo)}
                    alt="Cargo"
                    className="cargo-photo-full"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
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

          {/* Accepted Quote Breakdown */}
          {order.accepted_quote_breakdown && (
            <div className="info-section quote-breakdown-section">
              <div className="breakdown-header-row">
                <h3>Quote Breakdown</h3>
                <button
                    className="btn-toggle-breakdown"
                    onClick={() => setShowBreakdown((prev) => !prev)}
                  >
                    {showBreakdown ? 'Hide Details' : 'View Details'}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" className={`chevron-icon ${showBreakdown ? 'chevron-up' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
              </div>
              {showBreakdown && (
                <QuoteBreakdownTable breakdown={order.accepted_quote_breakdown} total={order.final_price} />
              )}
            </div>
          )}

          {/* Transporter Information (for customers) */}
          {userType === 'customer' && order.assigned_transporter_id && (
            <div className="info-section">
              <h3>Transporter Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name</span>
                  <span className="value">
                    <button
                      className="transporter-name-link"
                      onClick={() => setProfileModal({
                        id: order.assigned_transporter_id._id,
                        name: order.assigned_transporter_id.name
                      })}
                    >
                      {order.assigned_transporter_id.name || 'N/A'}
                    </button>
                    {transporterRating && transporterRating.totalReviews > 0 && (
                      <span className="transporter-rating-inline">
                        <StarRating rating={transporterRating.avgRating} size={14} />
                        <span>{transporterRating.avgRating} ({transporterRating.totalReviews} reviews)</span>
                      </span>
                    )}
                  </span>
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

          {/* Ratings & Reviews (customers only) */}
          {userType === 'customer' && order.status === 'Completed' && (
            <div className="info-section">
              <h3>Ratings & Reviews</h3>

              {order.payment_status !== 'Paid' ? (
                <p className="form-hint">Complete the final payment to rate and review the transporter.</p>
              ) : order.is_reviewed ? (
                <div>
                  <p className="form-hint">Review submitted.</p>
                  {orderReview && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <StarRating rating={orderReview.rating} size={16} />
                        <span>{orderReview.rating} / 5</span>
                      </div>
                      <p style={{ marginTop: '0.5rem' }}>{orderReview.comment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => setReviewModalOpen(true)}>
                  Rate Transporter
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Transporter Profile Modal */}
      {profileModal && (
        <TransporterProfileModal
          transporterId={profileModal.id}
          transporterName={profileModal.name}
          onClose={() => setProfileModal(null)}
        />
      )}

      <ReviewModal
        orderId={order?._id}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={() => {
          setReviewModalOpen(false);
          fetchOrderDetails();
        }}
      />
    </>
  );
}