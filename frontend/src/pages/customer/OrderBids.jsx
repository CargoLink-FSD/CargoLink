import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import { formatCurrency } from '../../utils/currency';
import './OrderBids.css';

export default function OrderBids() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBids();
    // Refresh bids every 30 seconds
    const interval = setInterval(loadBids, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadBids = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await http.get(`/api/orders/${orderId}/bids`);
      const bidsData = response.data || response || [];
      setBids(Array.isArray(bidsData) ? bidsData : []);
    } catch (err) {
      console.error('Error loading bids:', err);
      setError(err.message || 'Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to accept this bid? This will assign the order to the transporter.')) {
      return;
    }

    try {
      await http.post(`/api/orders/${orderId}/bids/${bidId}/accept`, {});
      showNotification({ message: 'Bid accepted successfully!', type: 'success' });
      setTimeout(() => {
        navigate('/customer/orders');
      }, 1500);
    } catch (err) {
      console.error('Error accepting bid:', err);
      showNotification({ message: err.message || 'Failed to accept bid', type: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <br /><br />
        <div className="orders-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading bids...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <br /><br />
        <div className="orders-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={() => navigate('/customer/orders')} className="btn-back">
              Back to Orders
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <br /><br />
      <div className="orders-container">
        <div className="orders-header">
          <div className="header-with-back">
            <button onClick={() => navigate('/customer/orders')} className="btn-back-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1>Bids for Order</h1>
              <p className="order-id-subtitle">#{orderId}</p>
            </div>
          </div>
        </div>

        {bids.length === 0 ? (
          <div className="empty-state">
          
            <h3>No Bids Yet</h3>
            <p>No transporters have placed bids on this order yet. Please check back later.</p>
            <button onClick={() => navigate('/customer/orders')} className="btn-primary">
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="bids-table-container">
            <div className="bids-count">
              {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'} Received
            </div>
            <div className="table-responsive">
              <table className="bids-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Transporter Name</th>
                    <th>Contact</th>
                    <th>Bid Amount</th>
                    <th>Bid Time</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid, index) => (
                    <tr key={bid._id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="transporter-info">
                          <div className="transporter-name">
                            {bid.transporter_id?.company_name || bid.transporter_id?.name || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          {bid.transporter_id?.primary_contact || bid.transporter_id?.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="bid-amount">{formatCurrency(bid.bid_amount)}</div>
                      </td>
                      <td>
                        <div className="bid-time">{formatDate(bid.createdAt || bid.bid_time)}</div>
                      </td>
                      <td>
                        <div className="bid-notes">{bid.notes || bid.bid_message || '—'}</div>
                      </td>
                      <td>
                        <button 
                          className="btn-accept"
                          onClick={() => handleAcceptBid(bid._id)}
                        >
                          Accept
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
