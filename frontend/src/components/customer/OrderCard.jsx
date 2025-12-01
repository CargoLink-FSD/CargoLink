import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './OrderCard.css';

export default function OrderCard({ order, onDelete, onCancelOrder }) {
  const navigate = useNavigate();

  const statusClass = order.status?.toLowerCase().replace(' ', '-') || 'unknown';

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/customer/order/${order._id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(order._id);
  };

  const handleTrackOrder = (e) => {
    e.stopPropagation();
    navigate(`/customer/track/${order._id}`);
  };

  const handleCancelOrder = (e) => {
    e.stopPropagation();
    if (onCancelOrder) {
      onCancelOrder(order._id);
    }
  };

  const handleViewBids = (e) => {
    e.stopPropagation();
    navigate(`/customer/order/${order._id}/bids`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="order-card" onClick={handleViewDetails} role="button">
      <div className="order-header">
        <div>
          <h3>Order</h3>
          <div className="order-id">#{order._id}</div>
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
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
            <div className="route-text">
              <div className="from">From: {order.pickup?.city || 'N/A'}, {order.pickup?.state || ''}</div>
              <div className="to">To: {order.delivery?.city || 'N/A'}, {order.delivery?.state || ''}</div>
            </div>
          </div>
          <div className="route-right">
            <div className="distance">{order.distance || '—'} km</div>
            <div className="scheduled">{order.scheduled_at ? new Date(order.scheduled_at).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        <ul className="order-list">
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
            {order.truck_type || 'Not Specified'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
            </svg>
            {order.goods_type || 'Not Specified'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            {order.max_price ? `₹${order.max_price}` : '—'}
          </li>
          <li>
            <svg className="li-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="8" width="18" height="8" rx="1.5" ry="1.5"/>
              <path d="M6 12h2M10 12h4M17 12h1"/>
            </svg>
            {order.assignment?.vehicle_number || 'Not Assigned'}
          </li>
        </ul>
      </div>

      <div className="order-actions">
        <button 
          className="btn btn-primary"
          onClick={handleViewDetails}
        >
          View Details
        </button>
        
        {order.status && order.status.toLowerCase() === 'placed' && (
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
        
        {order.status && order.status.toLowerCase().includes('transit') && (
          <button 
            className="btn btn-outline"
            onClick={handleTrackOrder}
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
  onDelete: PropTypes.func.isRequired,
  onCancelOrder: PropTypes.func,
};
