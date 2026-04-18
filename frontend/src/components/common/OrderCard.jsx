import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Building2, UserRound, Truck } from 'lucide-react';
import { toApiUrl } from '../../utils/apiBase';
import './OrderCard.css';

export default function OrderCard({
  order,
  variant = 'customer', // 'customer' or 'transporter'
  onDelete,
  onCancelOrder,
  onCompletePayment,
  onViewDetails,
}) {
  const navigate = useNavigate();

  const statusClass = order.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const scheduledAssignment = order.scheduled_assignment || null;
  const assignedVehicleNumber =
    scheduledAssignment?.vehicle?.registration ||
    order.assignment?.vehicle_number ||
    'Not Assigned';
  const assignedDriverName = scheduledAssignment?.driver
    ? `${scheduledAssignment.driver.firstName || ''} ${scheduledAssignment.driver.lastName || ''}`.trim()
    : 'Not Assigned';
  const assignedTransporterName =
    scheduledAssignment?.transporter?.name ||
    order.assigned_transporter_id?.name ||
    (variant === 'transporter' ? 'You' : 'Not Assigned');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Customer actions
  const handleViewDetails = (e) => {
    e?.stopPropagation();
    const path = variant === 'customer'
      ? `/customer/orders/${order._id}`
      : `/transporter/orders/${order._id}`;
    navigate(path);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(order._id);
  };

  const handleTrackOrderClick = (e) => {
    e.stopPropagation();
    navigate(`/customer/orders/${order._id}/track`);
  };

  const handleCancelOrder = (e) => {
    e.stopPropagation();
    if (onCancelOrder) onCancelOrder(order._id);
  };

  const handleCompletePayment = (e) => {
    e.stopPropagation();
    if (onCompletePayment) onCompletePayment(order);
  };

  const handleViewBids = (e) => {
    e.stopPropagation();
    navigate(`/customer/order/${order._id}/bids`);
  };
  return (
    <div
      className={`order-card ${variant}`}
      onClick={handleViewDetails}
      role="button"
    >
      <div className="order-header">
        <div>
          <h3>Order</h3>
          <div className="order-id">
            #{order._id?.slice(-8).toUpperCase()}
          </div>
          <span className="date">{formatDate(order.createdAt || order.order_date)}</span>
        </div>
        <span className={`status-badge ${statusClass}`}>
          {order.status || 'Unknown'}
        </span>
      </div>

      <div className="order-details">
        <div className="route-box">
          <div className="route-left">
            <svg className="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <div className="route-text">
              <div className="from">From: {order.pickup?.city || 'N/A'}, {order.pickup?.state || ''}</div>
              <div className="to">To: {order.delivery?.city || 'N/A'}, {order.delivery?.state || ''}</div>
            </div>
          </div>
          <div className="route-right">
            <div className="distance">{order.distance || '—'} km</div>
            <div className="scheduled">{order.scheduled_at ? formatDate(order.scheduled_at) : '—'}</div>
          </div>
        </div>

        <ul className="order-list">
          <li>
            <Building2 size={18} className="li-icon" aria-hidden="true" />
            {assignedTransporterName}
          </li>
          <li>
            <UserRound size={18} className="li-icon" aria-hidden="true" />
            {assignedDriverName}
          </li>
          <li>
            <Truck size={18} className="li-icon" aria-hidden="true" />
            {assignedVehicleNumber}
          </li>
        </ul>

        {/* Cargo Photo Display */}
        {order.cargo_photo && (
          <div className="cargo-photo-thumbnail">
            <img
              src={toApiUrl(order.cargo_photo)}
              alt="Cargo"
              className="cargo-thumbnail-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className="order-actions">
        <button
          className="btn btn-primary"
          onClick={handleViewDetails}
        >
          View Details
        </button>

        {/* Customer-specific actions */}
        {variant === 'customer' && order.status?.toLowerCase() === 'placed' && (
          <>
            <button
              className="btn btn-outline btn-view-bids"
              onClick={handleViewBids}
            >
              View Bids
            </button>
            <button
              className="btn btn-danger"
              onClick={handleCancelOrder}
            >
              Cancel Order
            </button>
          </>
        )}

        {variant === 'customer' && order.status?.toLowerCase() === 'payment pending' && (
          <button
            className="btn btn-primary"
            onClick={handleCompletePayment}
          >
            Complete Payment
          </button>
        )}

        {variant === 'customer' && ['started', 'in transit', 'scheduled'].includes(order.status?.toLowerCase()) && (
          <button
            className="btn btn-outline"
            onClick={handleTrackOrderClick}
          >
            Track Order
          </button>
        )}
      </div>
    </div>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    order_date: PropTypes.string,
    scheduled_at: PropTypes.string,
    status: PropTypes.string,
    pickup: PropTypes.shape({
      city: PropTypes.string,
      state: PropTypes.string,
      street: PropTypes.string,
      pin: PropTypes.string,
    }),
    delivery: PropTypes.shape({
      city: PropTypes.string,
      state: PropTypes.string,
      street: PropTypes.string,
      pin: PropTypes.string,
    }),
    goods_type: PropTypes.string,
    weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    distance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    max_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    final_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    assignment: PropTypes.shape({
      vehicle_number: PropTypes.string,
      vehicle_id: PropTypes.string,
    }),
  }).isRequired,
  variant: PropTypes.oneOf(['customer', 'transporter']),
  onDelete: PropTypes.func,
  onCancelOrder: PropTypes.func,
  onCompletePayment: PropTypes.func,
  onViewDetails: PropTypes.func,
};
