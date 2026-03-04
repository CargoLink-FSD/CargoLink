import React, { useState } from 'react';
import { useMyBids } from '../../hooks/useMyBids';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/Bid.css';

function QuoteBreakdownView({ breakdown }) {
  if (!breakdown) return null;

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  let sno = 0;

  const rows = [];

  rows.push({ label: 'Transportation Charges', value: formatINR(breakdown.transportation_charges) });

  if (breakdown.packing_included) {
    rows.push({ label: 'Packing Cost', value: 'Included' });
  } else if (breakdown.packing_cost > 0) {
    rows.push({ label: 'Packing Cost', value: formatINR(breakdown.packing_cost) });
  }

  if (breakdown.loading_included) {
    rows.push({ label: 'Loading Charges', value: 'Included' });
  } else if (breakdown.loading_charges > 0) {
    rows.push({ label: 'Loading Charges', value: formatINR(breakdown.loading_charges) });
  }

  if (breakdown.unloading_included) {
    rows.push({ label: 'Unloading Charges', value: 'Included' });
  } else if (breakdown.unloading_charges > 0) {
    rows.push({ label: 'Unloading Charges', value: formatINR(breakdown.unloading_charges) });
  }

  if (breakdown.unpacking_included) {
    rows.push({ label: 'Unpacking Charges', value: 'Included' });
  } else if (breakdown.unpacking_charges > 0) {
    rows.push({ label: 'Unpacking Charges', value: formatINR(breakdown.unpacking_charges) });
  }

  if (breakdown.escort_charges > 0) {
    rows.push({ label: 'Escort / Security', value: formatINR(breakdown.escort_charges) });
  }

  if (breakdown.octroi_entry_tax > 0) {
    rows.push({ label: 'Octroi / Entry Tax', value: formatINR(breakdown.octroi_entry_tax) });
  }

  if (breakdown.risk_coverage && breakdown.risk_coverage.amount > 0) {
    rows.push({
      label: `Transit Risk @ ${breakdown.risk_coverage.rate_percent}% on ${formatINR(breakdown.risk_coverage.on_declared_value)}`,
      value: formatINR(breakdown.risk_coverage.amount),
    });
  }

  if (breakdown.storage_charges > 0) {
    rows.push({ label: 'Storage Charges', value: formatINR(breakdown.storage_charges) });
  }

  if (breakdown.custom_items && breakdown.custom_items.length > 0) {
    breakdown.custom_items.forEach((ci) => {
      rows.push({ label: ci.label, value: formatINR(ci.amount) });
    });
  }

  if (breakdown.gst && breakdown.gst.amount > 0) {
    rows.push({ label: `GST @ ${breakdown.gst.rate_percent}%`, value: formatINR(breakdown.gst.amount), isGst: true });
  }

  return (
    <table className="mybids-breakdown-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Particular</th>
          <th>Charges</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className={row.isGst ? 'mybids-row-gst' : ''}>
            <td>{++sno}.</td>
            <td>{row.label}</td>
            <td className={row.value === 'Included' ? 'mybids-included' : ''}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MyBidsPage() {
  const { myBids, loading } = useMyBids();
  const [expandedBid, setExpandedBid] = useState(null);

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <>
      <Header />
      <div className="main-content-bid">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">My Bids</h1>
          </div>
          {loading && <div style={{ padding: '1rem' }}>Loading...</div>}
          {!loading && myBids.length === 0 && (
            <div className="no-bids-message"><p>You have not placed any bids yet.</p></div>
          )}
          {!loading && myBids.length > 0 && (
            <div className="mybids-list">
              {myBids.map(bid => {
                const isExpanded = expandedBid === bid._id;
                const hasBreakdown = !!bid.quote_breakdown;
                return (
                  <div className={`mybids-card ${isExpanded ? 'mybids-card--expanded' : ''}`} key={bid._id}>
                    <div className="mybids-card-top">
                      <div className="mybids-card-route">
                        <div className="mybids-card-locations">
                          <span className="mybids-pickup">
                            {bid.order_id?.pickup
                              ? `${bid.order_id.pickup.city}, ${bid.order_id.pickup.state}`
                              : 'N/A'}
                          </span>
                          <span className="mybids-arrow">→</span>
                          <span className="mybids-dropoff">
                            {bid.order_id?.delivery
                              ? `${bid.order_id.delivery.city}, ${bid.order_id.delivery.state}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="mybids-card-meta">
                          <span className="mybids-order-id">Order: {bid.order_id?._id?.slice(-8) || 'N/A'}</span>
                          <span className={`mybids-status mybids-status--${(bid.order_id?.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`}>
                            {bid.order_id?.status || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="mybids-card-amount-section">
                        <div className="mybids-amount">{formatINR(bid.bid_amount)}</div>
                        <div className="mybids-time">{new Date(bid.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="mybids-card-actions">
                        {hasBreakdown && (
                          <button
                            className="mybids-btn-breakdown"
                            onClick={() => setExpandedBid(isExpanded ? null : bid._id)}
                          >
                            {isExpanded ? 'Hide' : 'View Quote'}
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2" className={`mybids-chevron ${isExpanded ? 'mybids-chevron--up' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {bid.notes && (
                      <div className="mybids-notes"><strong>Notes:</strong> {bid.notes}</div>
                    )}
                    {isExpanded && hasBreakdown && (
                      <div className="mybids-breakdown-wrapper">
                        <QuoteBreakdownView breakdown={bid.quote_breakdown} />
                        <div className="mybids-breakdown-total">
                          <span>Total</span>
                          <span>{formatINR(bid.bid_amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
