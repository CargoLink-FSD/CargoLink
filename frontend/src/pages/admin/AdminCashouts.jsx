import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminCashouts } from '../../store/slices/adminCashoutsSlice';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';

export default function AdminCashouts() {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  const { cashouts, stats, pagination, loading, error } = useSelector((state) => state.adminCashouts);
  
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadCashouts = useCallback(() => {
    dispatch(fetchAdminCashouts({
      status,
      search: search.trim(),
      sort: sortBy,
      page,
      limit
    }));
  }, [dispatch, status, search, sortBy, page, limit]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCashouts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadCashouts]);

  useEffect(() => {
    if (error) {
      showNotification({ message: error, type: 'error' });
    }
  }, [error, showNotification]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Cashout Management</h1>
          <p className="adm-page-subtitle">Monitor all transporter payout requests</p>
        </div>

        {/* Analytics Cards */}
        {stats && (
          <div className="adm-stats-row" style={{ marginBottom: '24px' }}>
            <div className="adm-stat-card blue">
               <span className="adm-stat-label">Total Cashouts</span>
               <span className="adm-stat-value">{stats.total}</span>
            </div>
            <div className="adm-stat-card green">
               <span className="adm-stat-label">Total Amount Requested</span>
               <span className="adm-stat-value">{formatCurrency(stats.totalAmount)}</span>
            </div>
            <div className="adm-stat-card orange">
               <span className="adm-stat-label">Pending Amount</span>
               <span className="adm-stat-value" style={{ color: '#eab308' }}>{formatCurrency(stats.pendingAmount)}</span>
            </div>
            <div className="adm-stat-card red">
               <span className="adm-stat-label">Unprocessed Checks</span>
               <span className="adm-stat-value" style={{ color: '#ef4444' }}>{stats.processing}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="adm-filter-bar">
          <input
            className="adm-search-input"
            placeholder="Search transporter ID or Name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="adm-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="Processing">Processing</option>
            <option value="Processed">Processed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select className="adm-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="date">Newest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
            <option value="status">Status</option>
          </select>
          <button className="adm-btn adm-btn-outline" onClick={loadCashouts}>Refresh</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" /><p>Loading cashouts...</p></div>
        ) : (
          <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Transporter</th>
                    <th>Requested</th>
                    <th>Commission (10%)</th>
                    <th>Transfer (Payable)</th>
                    <th>Status</th>
                    <th>Date Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {cashouts.length === 0 ? (
                    <tr><td colSpan={6} className="adm-empty">No cashout requests found</td></tr>
                  ) : (
                    cashouts.map((co) => {
                      return (
                        <tr key={co._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{co.transporter_id?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{co.transporter_id?.email}</div>
                          </td>
                          <td>{formatCurrency(co.requested_amount)}</td>
                          <td style={{ color: '#ef4444' }}>-{formatCurrency(co.commission_amount)}</td>
                          <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(co.payable_amount)}</td>
                          <td>
                            <span className={`adm-badge ${co.status === 'Processed' ? 'green' : co.status === 'Processing' ? 'orange' : 'red'}`}>
                              {co.status}
                            </span>
                          </td>
                          <td>{formatDate(co.createdAt)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button className="adm-btn adm-btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button className="adm-btn adm-btn-outline" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
              Next
            </button>
          </div>
        )}

      </div>
      <Footer />
    </>
  );
}
