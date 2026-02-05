import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './OrderCard.css';

export default function OrderCard({
  order,
  variant = 'customer', // 'customer' or 'transporter'
  onDelete,
  onCancelOrder,
  onAssign,
  onUnassign,
  onStartTransit,
  onTrackOrder
}) {
  const navigate = useNavigate();

  const statusClass = order.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown';

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
    if (variant === 'customer') {
      navigate(`/customer/orders/${order._id}/track`);
    } else if (onTrackOrder) {
      onTrackOrder(order._id);
    }
  };

  const handleCancelOrder = (e) => {
    e.stopPropagation();
    if (onCancelOrder) onCancelOrder(order._id);
  };

  const handleViewBids = (e) => {
    e.stopPropagation();
    navigate(`/customer/order/${order._id}/bids`);
  };

  // Transporter actions
  const handleAssign = (e) => {
    e?.stopPropagation();
    if (onAssign) onAssign(order);
  };

  const handleUnassign = (e) => {
    e?.stopPropagation();
    if (onUnassign) onUnassign(order);
  };

  const handleStartTransit = (e) => {
    e?.stopPropagation();
    if (onStartTransit) onStartTransit(order);
  };

  // Transporter checks
  const canUnassign = order.status?.toLowerCase() === 'assigned' && order.assignment;
  const canStartTransit = order.status?.toLowerCase() === 'assigned' && order.assignment;
  const isInTransit = order.status?.toLowerCase() === 'started' || order.status?.toLowerCase() === 'in transit';

  if (variant === 'transporter') {
    console.log('OrderCard Debug:', order._id?.slice(-6), {
      status: order.status,
      assignment: order.assignment,
      assignmentType: typeof order.assignment,
      vehicleId: order.assignment?.vehicle_id,
      hasVehicleId: !!order.assignment?.vehicle_id,
      notHasVehicleId: !order.assignment?.vehicle_id,
      showAssignBtn: variant === 'transporter' && order.status?.toLowerCase() === 'assigned' && !order.assignment?.vehicle_id,
      showStartBtn: variant === 'transporter' && order.status?.toLowerCase() === 'assigned' && !!order.assignment?.vehicle_id
    });
  }
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
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
            {order.truck_type || 'Not Specified'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
            </svg>
            {order.goods_type || 'Not Specified'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {order.final_price ? `₹${order.final_price}` : order.max_price ? `₹${order.max_price}` : '—'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="8" width="18" height="8" rx="1.5" ry="1.5" />
              <path d="M6 12h2M10 12h4M17 12h1" />
            </svg>
            {order.assignment?.vehicle_number || 'Not Assigned'}
          </li>
        </ul>

        {/* Cargo Photo Display */}
        {order.cargo_photo && (
          <div className="cargo-photo-thumbnail">
            <img
              src={`http://localhost:3000${order.cargo_photo}`}
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

        {variant === 'customer' && (order.status?.toLowerCase() === 'started' || order.status?.toLowerCase() === 'in transit') && (
          <button
            className="btn btn-outline"
            onClick={handleTrackOrderClick}
          >
            Track Order
          </button>
        )}

        {/* Transporter-specific actions */}
        {variant === 'transporter' && order.status?.toLowerCase() === 'assigned' && !order.assignment?.vehicle_id && (
          <button
            className="btn btn-primary"
            onClick={handleAssign}
          >
            Assign Vehicle
          </button>
        )}

        {variant === 'transporter' && order.status?.toLowerCase() === 'assigned' && order.assignment?.vehicle_id && (
          <button
            className="btn btn-outline"
            onClick={handleStartTransit}
          >
            Start Transit
          </button>
        )}

        {variant === 'transporter' && (order.status?.toLowerCase() === 'started' || order.status?.toLowerCase() === 'in transit') && (
          <button
            className="btn btn-info"
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
    truck_type: PropTypes.string,
    distance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    max_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    final_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    assignment: PropTypes.shape({
      vehicle_number: PropTypes.string,
      vehicle_type: PropTypes.string,
      vehicle_id: PropTypes.string,
    }),
  }).isRequired,
  variant: PropTypes.oneOf(['customer', 'transporter']),
  onDelete: PropTypes.func,
  onCancelOrder: PropTypes.func,
  onAssign: PropTypes.func,
  onUnassign: PropTypes.func,
  onStartTransit: PropTypes.func,
  onTrackOrder: PropTypes.func,
};
