import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import tokenStorage from '../../utils/token';
import { getBaseUrl } from '../../api/http';
import Header from '../../components/common/Header';
import TransporterProfileModal, { StarRating } from '../../components/common/TransporterProfileModal';
import './OrderBids.css';

function QuoteBreakdownView({ breakdown }) {
  if (!breakdown) return <p className="no-breakdown">No detailed breakdown available for this bid.</p>;

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  let sno = 0;

  const rows = [];

  // 1. Transportation
  rows.push({ label: 'Transportation Charges', value: formatINR(breakdown.transportation_charges) });

  // 2. Packing
  if (breakdown.packing_included) {
    rows.push({ label: 'Packing Cost', value: 'Included' });
  } else if (breakdown.packing_cost > 0) {
    rows.push({ label: 'Packing Cost', value: formatINR(breakdown.packing_cost) });
  }

  // 3. Loading
  if (breakdown.loading_included) {
    rows.push({ label: 'Loading Charges', value: 'Included' });
  } else if (breakdown.loading_charges > 0) {
    rows.push({ label: 'Loading Charges', value: formatINR(breakdown.loading_charges) });
  }

  // 4. Toll Cost
  if (breakdown.toll_cost > 0) {
    rows.push({ label: 'Toll Cost', value: formatINR(breakdown.toll_cost) });
  }

  // 5. Car Transportation
  // 5. Octroi
  if (breakdown.octroi_entry_tax > 0) {
    rows.push({ label: 'Octroi / Entry Tax', value: formatINR(breakdown.octroi_entry_tax) });
  }

  // 7. Risk
  if (breakdown.risk_coverage && breakdown.risk_coverage.amount > 0) {
    rows.push({
      label: `Transit Risk @ ${breakdown.risk_coverage.rate_percent}% on ${formatINR(breakdown.risk_coverage.on_declared_value)}`,
      value: formatINR(breakdown.risk_coverage.amount),
    });
  }

  // 8. Storage
  if (breakdown.storage_charges > 0) {
    rows.push({ label: 'Storage Charges', value: formatINR(breakdown.storage_charges) });
  }

  // Custom items
  if (breakdown.custom_items && breakdown.custom_items.length > 0) {
    breakdown.custom_items.forEach((ci) => {
      rows.push({ label: ci.label, value: formatINR(ci.amount) });
    });
  }

  // GST
  const gst = breakdown.gst;
  if (gst && gst.amount > 0) {
    rows.push({ label: `GST @ ${gst.rate_percent}%`, value: formatINR(gst.amount), isGst: true });
  }

  return (
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
  );
}

export default function OrderBids() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBid, setExpandedBid] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [transporterRatings, setTransporterRatings] = useState({});

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
      const bidsArray = Array.isArray(bidsData) ? bidsData : [];
      setBids(bidsArray);

      // Fetch ratings for each unique transporter
      const uniqueIds = [...new Set(bidsArray.map((b) => b.transporter_id?._id).filter(Boolean))];
      const ratings = {};
      await Promise.all(
        uniqueIds.map((id) =>
          http
            .get(`/api/transporters/${id}/public-profile`)
            .then((res) => {
              ratings[id] = {
                avgRating: res.data.averageRating,
                totalReviews: res.data.totalReviews,
              };
            })
            .catch(() => {})
        )
      );
      setTransporterRatings(ratings);
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

  const handleDownloadQuotePdf = async (bid) => {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        showNotification({ message: 'Please log in again to download the quote', type: 'error' });
        return;
      }

      const url = `${getBaseUrl()}/api/orders/${orderId}/bids/${bid._id}/quote-pdf`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to download quote PDF');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `quote_${orderId.slice(-8)}_${String(bid._id).slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Quote PDF download failed:', err);
      showNotification({ message: err.message || 'Failed to download quote PDF', type: 'error' });
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

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <>
        <Header />
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
        <div className="orders-container">
          <div className="error-state">
            <div className="error-icon" aria-hidden="true">
              <TriangleAlert size={44} />
            </div>
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
            <div className="bids-cards-list">
              {bids.map((bid, index) => {
                const isExpanded = expandedBid === bid._id;
                const hasBreakdown = !!bid.quote_breakdown;
                return (
                  <div className={`bid-card-item ${isExpanded ? 'bid-card-item--expanded' : ''}`} key={bid._id || index}>
                    <div className="bid-card-top">
                      <div className="bid-card-rank">#{index + 1}</div>
                      <div className="bid-card-info">
                        <div className="bid-card-transporter">
                          {bid.transporter_id?._id ? (
                            <button
                              className="transporter-name-link"
                              onClick={() =>
                                setProfileModal({
                                  id: bid.transporter_id._id,
                                  name: bid.transporter_id.company_name || bid.transporter_id.name,
                                })
                              }
                            >
                              {bid.transporter_id.company_name || bid.transporter_id.name || 'Unknown Transporter'}
                            </button>
                          ) : (
                            <span>{bid.transporter_id?.company_name || bid.transporter_id?.name || 'Unknown Transporter'}</span>
                          )}
                          {bid.transporter_id?._id && transporterRatings[bid.transporter_id._id]?.totalReviews > 0 && (
                            <span className="bid-card-rating">
                              <StarRating rating={transporterRatings[bid.transporter_id._id].avgRating} size={13} />
                              <span className="bid-card-rating-text">
                                {Number(transporterRatings[bid.transporter_id._id].avgRating).toFixed(1)}
                                {' '}({transporterRatings[bid.transporter_id._id].totalReviews})
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="bid-card-contact">
                          {bid.transporter_id?.primary_contact || bid.transporter_id?.phone || 'N/A'}
                          {bid.transporter_id?.email && (
                            <span className="bid-card-email"> · {bid.transporter_id.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="bid-card-amount-section">
                        <div className="bid-card-amount">{formatCurrency(bid.bid_amount)}</div>
                        <div className="bid-card-time">{formatDate(bid.createdAt || bid.bid_time)}</div>
                      </div>
                      <div className="bid-card-actions">
                        {hasBreakdown && (
                          <button
                            className="btn-view-breakdown"
                            onClick={() => setExpandedBid(isExpanded ? null : bid._id)}
                          >
                            {isExpanded ? 'Hide Breakdown' : 'View Breakdown'}
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" className={`chevron-icon ${isExpanded ? 'chevron-up' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="btn-view-breakdown"
                          onClick={() => handleDownloadQuotePdf(bid)}
                        >
                          Download PDF
                        </button>
                        <button 
                          className="btn-accept"
                          onClick={() => handleAcceptBid(bid._id)}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                    {bid.notes && (
                      <div className="bid-card-notes">
                        <strong>Notes:</strong> {bid.notes}
                      </div>
                    )}
                    {isExpanded && hasBreakdown && (
                      <div className="bid-card-breakdown">
                        <QuoteBreakdownView breakdown={bid.quote_breakdown} />
                        <div className="breakdown-total-row">
                          <span>Total Quote</span>
                          <span className="breakdown-total-amount">{formatCurrency(bid.bid_amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {profileModal && (
        <TransporterProfileModal
          transporterId={profileModal.id}
          transporterName={profileModal.name}
          onClose={() => setProfileModal(null)}
        />
      )}
    </>
  );
}
