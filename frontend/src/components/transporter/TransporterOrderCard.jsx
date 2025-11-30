import React from 'react';
import './TransporterOrderCard.css';

const TransporterOrderCard = ({ order, onAssign, onUnassign, onStartTransit, onTrackOrder, onViewDetails }) => {
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return 'status-assigned';
      case 'started':
      case 'in transit':
        return 'status-in-transit';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
    }
  };

  // Check if order can be unassigned
  const canUnassign = order.status?.toLowerCase() === 'assigned' && order.assignment;

  // Check if transit can be started
  const canStartTransit = order.status?.toLowerCase() === 'assigned' && order.assignment;

  // Check if order is in transit
  const isInTransit = order.status?.toLowerCase() === 'started' || order.status?.toLowerCase() === 'in transit';

  return (
    <div className="transporter-order-card">
      <div className="order-header">
        <div className="order-id">Order #{order._id?.slice(-8).toUpperCase() || 'N/A'}</div>
        <span className={`status-badge ${getStatusClass(order.status)}`}>
          {order.status || 'Pending'}
        </span>
      </div>

      <div className="order-route">
        <div className="route-info">
          <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="location-details">
            <div className="location-label">Pickup</div>
            <div className="location-value">{order.pickup?.city || 'N/A'}</div>
          </div>
        </div>
        
        <div className="route-arrow">→</div>
        
        <div className="route-info">
          <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="location-details">
            <div className="location-label">Delivery</div>
            <div className="location-value">{order.delivery?.city || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div className="order-details">
        <div className="detail-row">
          <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <span className="detail-label">Goods:</span>
          <span className="detail-value">{order.goods_type || 'N/A'}</span>
        </div>

        <div className="detail-row">
          <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-4-1a1 1 0 001 1h3m-6-1h1" />
          </svg>
          <span className="detail-label">Truck:</span>
          <span className="detail-value">{order.truck_type || 'N/A'}</span>
        </div>

        <div className="detail-row">
          <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
          </svg>
          <span className="detail-label">Scheduled:</span>
          <span className="detail-value">{formatDate(order.scheduled_at)}</span>
        </div>

        <div className="detail-row">
          <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="detail-label">Price:</span>
          <span className="detail-value">₹{order.max_price || 'N/A'}</span>
        </div>

        {order.assignment && (
          <div className="detail-row highlight">
            <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth={2} />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth={2} />
            </svg>
            <span className="detail-label">Vehicle:</span>
            <span className="detail-value">{order.assignment.vehicle_number || 'N/A'}</span>
          </div>
        )}
      </div>

      <div className="order-actions">
        <button className="btn-secondary" onClick={() => onViewDetails(order._id)}>
          View Details
        </button>

        {!order.assignment && (
          <button className="btn-primary" onClick={() => onAssign(order)}>
            Assign Vehicle
          </button>
        )}

        {canUnassign && (
          <button className="btn-danger" onClick={() => onUnassign(order)}>
            Unassign
          </button>
        )}

        {canStartTransit && (
          <button className="btn-success" onClick={() => onStartTransit(order)}>
            Start Transit
          </button>
        )}

        {isInTransit && (
          <button className="btn-info" onClick={() => onTrackOrder(order._id)}>
            Track Order
          </button>
        )}
      </div>
    </div>
  );
};

export default TransporterOrderCard;
