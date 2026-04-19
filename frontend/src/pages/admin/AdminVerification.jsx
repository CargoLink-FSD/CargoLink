import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useNotification } from '../../context/NotificationContext';
import { toApiUrl } from '../../utils/apiBase';
import {
  getAdminVerificationQueue,
} from '../../api/adminOps';
import './AdminStyles.css';
import './AdminVerification.css';

const statusMeta = {
  pending: { label: 'Pending', cls: 'pending' },
  approved: { label: 'Approved', cls: 'approved' },
  rejected: { label: 'Rejected', cls: 'rejected' },
};

export default function AdminVerification() {
  const { showNotification } = useNotification();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminVerificationQueue();
      const normalized = (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        status: String(item?.status || 'pending').toLowerCase(),
        entityType: String(item?.entityType || 'transporter').toLowerCase(),
      }));
      setQueueItems(normalized);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load verification queue', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queueItems.filter((item) => {
      if (entityFilter !== 'all' && item.entityType !== entityFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      const line = `${item.name || ''} ${item.email || ''} ${item.docLabel || ''} ${item.verificationType || ''}`.toLowerCase();
      return line.includes(q);
    });
  }, [queueItems, entityFilter, statusFilter, search]);

  const counts = useMemo(() => ({
    total: queueItems.length,
    pending: queueItems.filter((i) => i.status === 'pending').length,
    transporters: queueItems.filter((i) => i.entityType === 'transporter').length,
    drivers: queueItems.filter((i) => i.entityType === 'driver').length,
  }), [queueItems]);

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Verification Oversight</h1>
          <p className="adm-page-subtitle">Read-only visibility for transporter and driver document verification</p>
        </div>

        <div className="admxv-stats">
          <div className="admxv-stat">
            <span className="admxv-stat-label">Total</span>
            <span className="admxv-stat-value">{counts.total}</span>
          </div>
          <div className="admxv-stat">
            <span className="admxv-stat-label">Pending</span>
            <span className="admxv-stat-value">{counts.pending}</span>
          </div>
          <div className="admxv-stat">
            <span className="admxv-stat-label">Transporter Docs</span>
            <span className="admxv-stat-value">{counts.transporters}</span>
          </div>
          <div className="admxv-stat">
            <span className="admxv-stat-label">Driver Docs</span>
            <span className="admxv-stat-value">{counts.drivers}</span>
          </div>
        </div>

        <div className="admxv-filters">
          <input
            className="admxv-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, email, document..."
          />
          <select className="admxv-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="all">All Entities</option>
            <option value="transporter">Transporters</option>
            <option value="driver">Drivers</option>
          </select>
          <select className="admxv-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="admxv-refresh" onClick={loadQueue} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="admxv-table-wrap">
          <table className="admxv-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Entity</th>
                <th>Document</th>
                <th>Verification Type</th>
                <th>Preview</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="admxv-empty">Loading verification documents...</td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="admxv-empty">No documents found for current filters.</td>
                </tr>
              )}
              {!loading && filteredItems.map((item, idx) => {
                const status = statusMeta[item.status] || statusMeta.pending;
                const previewUrl = item.url ? toApiUrl(item.url) : null;

                return (
                  <tr key={`${item._id}-${item.docType}-${idx}`}>
                    <td>
                      <div className="admxv-user-name">{item.name || 'Unknown'}</div>
                      <div className="admxv-user-email">{item.email || '—'}</div>
                    </td>
                    <td>
                      <span className={`admxv-entity admxv-entity-${item.entityType || 'transporter'}`}>
                        {item.entityType || 'transporter'}
                      </span>
                    </td>
                    <td>{item.docLabel || item.docType}</td>
                    <td>{(item.verificationType || '—').replace(/_/g, ' ')}</td>
                    <td>
                      {previewUrl ? (
                        <a className="admxv-preview" href={previewUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="admxv-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`admxv-status admxv-status-${status.cls}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
}
