import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';

const STATUS_COLORS = { Placed: 'blue', Assigned: 'green', 'In Transit': 'cyan', Completed: 'green', Cancelled: 'red' };

export default function OrderManagement() {
  const { showNotification } = useNotification();
  const listStartRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState({ total: 0, byStatus: {} });
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [expandedBidId, setExpandedBidId] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOrders();
    }, 250);
    return () => clearTimeout(timeout);
  }, [page, search, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const res = await http.get(`/api/admin/orders?${params.toString()}`);
      setOrders(res.data || []);
      setPagination(res.pagination || null);
      const fallbackTotal = Number.isFinite(Number(res?.pagination?.total))
        ? Number(res.pagination.total)
        : Array.isArray(res?.data) ? res.data.length : 0;
      setSummary({
        total: Number.isFinite(Number(res?.summary?.total)) ? Number(res.summary.total) : fallbackTotal,
        byStatus: (res?.summary?.byStatus && typeof res.summary.byStatus === 'object') ? res.summary.byStatus : {},
      });
    } catch (err) {
      showNotification({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (order) => {
    setSelected(order);
    setExpandedBidId(null);
    setBidsLoading(true);
    try {
      const res = await http.get(`/api/admin/orders/${order.order_id}/bids`);
      setBids(res.data || []);
    } catch (err) {
      setBids([]);
    } finally {
      setBidsLoading(false);
    }
  };

  const closeModal = () => { setSelected(null); setBids([]); setExpandedBidId(null); };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  const totalOrders = Number.isFinite(Number(summary?.total))
    ? Number(summary.total)
    : (Number.isFinite(Number(pagination?.total)) ? Number(pagination.total) : orders.length);

  const getStatusCount = (status) => {
    const countFromSummary = summary?.byStatus?.[status];
    if (Number.isFinite(Number(countFromSummary))) {
      return Number(countFromSummary);
    }
    return orders.filter((o) => o.status === status).length;
  };

  const getQuoteRows = (breakdown) => {
    if (!breakdown || typeof breakdown !== 'object') return [];

    const rows = [];
    const pushCurrencyRow = (label, value) => {
      if (Number(value) > 0) {
        rows.push({ label, value: formatCurrency(value) });
      }
    };

    pushCurrencyRow('Transportation Charges', breakdown.transportation_charges);

    if (breakdown.packing_included) {
      rows.push({ label: 'Packing Cost', value: 'Included' });
    } else {
      pushCurrencyRow('Packing Cost', breakdown.packing_cost);
    }

    if (breakdown.loading_included) {
      rows.push({ label: 'Loading Charges', value: 'Included' });
    } else {
      pushCurrencyRow('Loading Charges', breakdown.loading_charges);
    }

    pushCurrencyRow('Toll Cost', breakdown.toll_cost);
    pushCurrencyRow('Octroi / Entry Tax', breakdown.octroi_entry_tax);
    pushCurrencyRow('Storage Charges', breakdown.storage_charges);

    if (Array.isArray(breakdown.custom_items)) {
      breakdown.custom_items.forEach((item) => {
        if (item?.label) {
          rows.push({ label: item.label, value: formatCurrency(item.amount) });
        }
      });
    }

    const riskAmount = breakdown?.risk_coverage?.amount;
    if (Number(riskAmount) > 0) {
      rows.push({
        label: `Transit Risk @ ${breakdown.risk_coverage.rate_percent || 0}%`,
        value: formatCurrency(riskAmount),
      });
    }

    const gstAmount = breakdown?.gst?.amount;
    if (Number(gstAmount) > 0) {
      rows.push({
        label: `GST @ ${breakdown.gst.rate_percent || 0}%`,
        value: formatCurrency(gstAmount),
      });
    }

    return rows;
  };

  const renderQuoteBreakdown = (breakdown, totalAmount) => {
    const rows = getQuoteRows(breakdown);

    if (rows.length === 0) {
      return <p className="adm-empty" style={{ textAlign: 'left' }}>No detailed quote breakdown available.</p>;
    }

    return (
      <div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Particular</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.label}-${idx}`}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontWeight: 600, color: '#0f172a' }}>
          Total Quote: {formatCurrency(totalAmount)}
        </div>
      </div>
    );
  };

  const scrollToListStart = () => {
    const anchor = listStartRef.current;
    if (!anchor) return;

    const y = anchor.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const goToPage = (nextPage) => {
    const currentPage = pagination?.page || page;
    if (nextPage === currentPage) return;
    setPage(nextPage);
    requestAnimationFrame(scrollToListStart);
  };

  if (loading) {
    return (<><Header /><div className="admin-container"><div className="adm-loading"><div className="adm-spinner" /><p>Loading orders...</p></div></div><Footer /></>);
  }

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Order Management</h1>
          <p className="adm-page-subtitle">{totalOrders} total orders</p>
        </div>

        {/* Quick Stats */}
        <div className="adm-stats-row">
          {['Placed', 'Assigned', 'In Transit', 'Completed', 'Cancelled'].map((s) => (
            <div key={s} className={`adm-stat-card ${STATUS_COLORS[s]}`}>
              <span className="adm-stat-label">{s}</span>
              <span className="adm-stat-value">{getStatusCount(s)}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="adm-filter-bar">
          <input className="adm-search-input" placeholder="Search by customer, transporter, location..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="adm-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="Placed">Placed</option>
            <option value="Assigned">Assigned</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="adm-btn adm-btn-outline" onClick={() => fetchOrders()}>Refresh</button>
        </div>

        {/* Table */}
        <div ref={listStartRef} className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Transporter</th>
                  <th>From → To</th>
                  <th>Truck</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="adm-empty">No orders found</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.order_id}>
                      <td style={{ fontWeight: 600 }}>#{o.order_id.slice(-6).toUpperCase()}</td>
                      <td>{o.customer_name}</td>
                      <td>{o.transporter_name || '—'}</td>
                      <td>{o.pickup_location} → {o.dropoff_location}</td>
                      <td>{o.truck_type}</td>
                      <td>₹{(o.final_price || 0).toLocaleString()}</td>
                      <td><span className={`adm-badge ${STATUS_COLORS[o.status] || 'gray'}`}>{o.status}</span></td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => openDetail(o)}>View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 12 }}>
          Showing {orders.length} of {totalOrders} orders
        </p>

        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <button className="adm-btn adm-btn-outline" onClick={() => goToPage(Math.max(1, (pagination?.page || page) - 1))} disabled={(pagination?.page || page) <= 1}>
              Previous
            </button>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button className="adm-btn adm-btn-outline" onClick={() => goToPage(Math.min(pagination.totalPages, (pagination?.page || page) + 1))} disabled={(pagination?.page || page) >= pagination.totalPages}>
              Next
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {selected && (
          <div className="adm-modal-overlay" onClick={closeModal}>
            <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="adm-modal-header">
                <h3>Order #{selected.order_id.slice(-6).toUpperCase()}</h3>
                <button className="adm-modal-close" onClick={closeModal}>&times;</button>
              </div>
              <div className="adm-modal-body">
                <div className="adm-detail-grid">
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Customer</span>
                    <span className="adm-detail-value">{selected.customer_name}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Customer Email</span>
                    <span className="adm-detail-value">{selected.customer_email}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Transporter</span>
                    <span className="adm-detail-value">{selected.transporter_name || '—'}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Transporter Email</span>
                    <span className="adm-detail-value">{selected.transporter_email || '—'}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">From</span>
                    <span className="adm-detail-value">{selected.pickup_location}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">To</span>
                    <span className="adm-detail-value">{selected.dropoff_location}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Truck Type</span>
                    <span className="adm-detail-value">{selected.truck_type}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Price</span>
                    <span className="adm-detail-value">₹{(selected.final_price || 0).toLocaleString()}</span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Status</span>
                    <span className="adm-detail-value"><span className={`adm-badge ${STATUS_COLORS[selected.status] || 'gray'}`}>{selected.status}</span></span>
                  </div>
                  <div className="adm-detail-field">
                    <span className="adm-detail-label">Created</span>
                    <span className="adm-detail-value">{formatDate(selected.createdAt)}</span>
                  </div>
                </div>

                {selected.accepted_quote_breakdown && (
                  <>
                    <h4 style={{ margin: '20px 0 10px', color: '#1e293b' }}>Accepted Transporter Quote</h4>
                    {renderQuoteBreakdown(selected.accepted_quote_breakdown, selected.final_price)}
                  </>
                )}

                <h4 style={{ margin: '20px 0 10px', color: '#1e293b' }}>All Bids Received</h4>
                {bidsLoading ? (
                  <div className="adm-loading"><div className="adm-spinner" /><p>Loading bids...</p></div>
                ) : bids.length === 0 ? (
                  <p className="adm-empty">No bids for this order</p>
                ) : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Transporter</th>
                          <th>Contact</th>
                          <th>Amount</th>
                          <th>Notes</th>
                          <th>Quote</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map((b) => {
                          const hasQuote = !!b.quote_breakdown;
                          const isExpanded = expandedBidId === b.bid_id;

                          return (
                            <React.Fragment key={b.bid_id}>
                              <tr>
                                <td style={{ fontWeight: 600 }}>{b.transporter?.name || '—'}</td>
                                <td>{b.transporter?.email || '—'}</td>
                                <td>{formatCurrency(b.bid_amount)}</td>
                                <td style={{ whiteSpace: 'normal', maxWidth: 200 }}>{b.notes || '—'}</td>
                                <td>
                                  {hasQuote ? (
                                    <button
                                      className="adm-btn adm-btn-outline adm-btn-sm"
                                      onClick={() => setExpandedBidId(isExpanded ? null : b.bid_id)}
                                    >
                                      {isExpanded ? 'Hide Quote' : 'View Quote'}
                                    </button>
                                  ) : '—'}
                                </td>
                                <td>{formatDate(b.createdAt)}</td>
                              </tr>
                              {isExpanded && hasQuote && (
                                <tr>
                                  <td colSpan={6}>
                                    {renderQuoteBreakdown(b.quote_breakdown, b.bid_amount)}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
