import React, { useState, useEffect, useCallback } from 'react';
import { getVerificationQueue, approveDocument, rejectDocument, getManagerProfile } from '../../api/manager';
import { Check, CircleCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import { toApiUrl } from '../../utils/apiBase';
import './ManagerDashboard.css';

const statusBadge = (status) => {
  const styles = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const entityTypeBadge = (entityType) => {
  const styles = {
    transporter: { bg: '#dbeafe', color: '#1e40af', label: 'Transporter' },
    driver: { bg: '#fce7f3', color: '#9d174d', label: 'Driver' },
  };
  const s = styles[entityType] || styles.transporter;
  return (
    <span className="entity-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

export default function ManagerDashboard() {
  const { showSuccess, showError } = useNotification();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { entityId, entityType, docType, name, docLabel }
  const [rejectNote, setRejectNote] = useState('');
  const [managerProfile, setManagerProfile] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, transporter, driver

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profile] = await Promise.all([
        getVerificationQueue(),
        getManagerProfile(),
      ]);
      setQueueItems(data || []);
      setManagerProfile(profile);
    } catch (err) {
      showError(err?.message || 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Queue comes pre-flattened from backend — filter by entity type
  const filteredItems = filterType === 'all'
    ? queueItems
    : queueItems.filter(item => item.entityType === filterType);

  const handleApprove = async (entityId, docType, entityType) => {
    const key = `${entityId}-${docType}`;
    setActionLoading(key);
    try {
      await approveDocument(entityId, docType, entityType);
      showSuccess('Document approved');
      await loadQueue();
    } catch (err) {
      showError(err?.message || 'Failed to approve document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectNote.trim()) {
      showError('Please enter a rejection reason');
      return;
    }
    const { entityId, docType, entityType } = rejectModal;
    const key = `${entityId}-${docType}`;
    setActionLoading(key);
    try {
      await rejectDocument(entityId, docType, rejectNote, entityType);
      showSuccess('Document rejected');
      setRejectModal(null);
      setRejectNote('');
      await loadQueue();
    } catch (err) {
      showError(err?.message || 'Failed to reject document');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const transporterCount = queueItems.filter(i => i.entityType === 'transporter').length;
  const driverCount = queueItems.filter(i => i.entityType === 'driver').length;

  return (
    <>
      <Header />
      <div className="manager-dashboard-container">
        {/* Manager Profile Welcome */}
        {managerProfile && (
          <div className="mgr-welcome-banner">
            <div className="mgr-welcome-info">
              <h2>Welcome, {managerProfile.name}!</h2>
              <span className="mgr-welcome-email">{managerProfile.email}</span>
              {managerProfile.categories && (
                <div className="mgr-welcome-cats">
                  {managerProfile.categories.map(c => (
                    <span key={c} className="mgr-welcome-cat-chip">{c.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
              {managerProfile.verificationCategories && managerProfile.verificationCategories.length > 0 && (
                <div className="mgr-welcome-cats">
                  {managerProfile.verificationCategories.map(c => (
                    <span key={c} className="mgr-welcome-cat-chip verification-cat">{c.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="mgr-welcome-stats">
              <span><strong>{managerProfile.openTicketCount ?? 0}</strong> open tickets</span>
              <span><strong>{managerProfile.totalResolved ?? 0}</strong> resolved</span>
              <span><strong>{managerProfile.openVerificationCount ?? 0}</strong> pending verifications</span>
              <span><strong>{managerProfile.totalVerified ?? 0}</strong> verified</span>
            </div>
          </div>
        )}

        <div className="manager-dashboard-header">
          <h1>Verification Dashboard</h1>
          <p className="subtitle">Review and manage document submissions</p>
          <button className="refresh-btn" onClick={loadQueue} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-number">{queueItems.length}</span>
            <span className="stat-label">Total Documents</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{queueItems.filter((r) => r.status === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{transporterCount}</span>
            <span className="stat-label">Transporter Docs</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{driverCount}</span>
            <span className="stat-label">Driver Docs</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button className={`filter-tab ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
            All ({queueItems.length})
          </button>
          <button className={`filter-tab ${filterType === 'transporter' ? 'active' : ''}`} onClick={() => setFilterType('transporter')}>
            Transporters ({transporterCount})
          </button>
          <button className={`filter-tab ${filterType === 'driver' ? 'active' : ''}`} onClick={() => setFilterType('driver')}>
            Drivers ({driverCount})
          </button>
        </div>

        {loading && <div className="loading-state">Loading verification queue...</div>}

        {!loading && filteredItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <CircleCheck size={44} />
            </div>
            <h3>No pending documents</h3>
            <p>All documents have been processed or none have been submitted.</p>
          </div>
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="table-container">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Document</th>
                  <th>Verify Against</th>
                  <th>Preview</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row, idx) => {
                  const key = `${row._id}-${row.docType}`;
                  const previewUrl = row.url ? toApiUrl(row.url) : null;
                  const isActionLoading = actionLoading === key;
                  return (
                    <tr key={`${key}-${idx}`}>
                      <td>
                        <div className="user-info">
                          <span className="user-name">{row.name}</span>
                          <span className="user-email">{row.email}</span>
                        </div>
                      </td>
                      <td>{entityTypeBadge(row.entityType)}</td>
                      <td>{row.docLabel}</td>
                      <td>
                        {row.refData && row.refData.length > 0 ? (
                          <div className="ref-data-list">
                            {row.refData.map((item, i) => (
                              <div key={i} className="ref-chip">
                                <span className="ref-chip-label">{item.label}:</span>
                                <span className="ref-chip-value">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {previewUrl ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="preview-link"
                          >
                            View Document
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Unavailable</span>
                        )}
                      </td>
                      <td>{formatDate(row.uploadedAt)}</td>
                      <td>
                        {statusBadge(row.status)}
                        {row.note && <div className="reject-note" title={row.note}>Note: {row.note}</div>}
                      </td>
                      <td className="actions-cell">
                        {row.status !== 'approved' && (
                          <button
                            className="action-btn approve-btn"
                            onClick={() => handleApprove(row._id, row.docType, row.entityType)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? '...' : 'Approve'}
                          </button>
                        )}
                        {row.status !== 'rejected' && (
                          <button
                            className="action-btn reject-btn"
                            onClick={() =>
                              setRejectModal({
                                entityId: row._id,
                                entityType: row.entityType,
                                docType: row.docType,
                                name: row.name,
                                docLabel: row.docLabel,
                              })
                            }
                            disabled={isActionLoading}
                          >
                            Reject
                          </button>
                        )}
                        {row.status === 'approved' && (
                          <span className="approved-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={16} aria-hidden="true" />
                            <span>Approved</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectModal && (
          <div className="modal-overlay" onClick={() => setRejectModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Reject Document</h3>
              <p>
                Rejecting <strong>{rejectModal.docLabel}</strong> for{' '}
                <strong>{rejectModal.name}</strong>
              </p>
              <label htmlFor="reject-reason">Reason for rejection *</label>
              <textarea
                id="reject-reason"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Enter the reason for rejecting this document..."
                rows={4}
              />
              <div className="modal-actions">
                <button className="modal-btn cancel-btn" onClick={() => { setRejectModal(null); setRejectNote(''); }}>
                  Cancel
                </button>
                <button
                  className="modal-btn confirm-reject-btn"
                  onClick={handleRejectSubmit}
                  disabled={!rejectNote.trim() || actionLoading}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
