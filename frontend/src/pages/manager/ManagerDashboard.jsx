import React, { useState, useEffect, useCallback } from 'react';
import { getVerificationQueue, approveDocument, rejectDocument } from '../../api/manager';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import './ManagerDashboard.css';

const API_BASE = 'http://localhost:3000';

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

const docTypeLabel = (type, vehicle) => {
  if (type === 'pan_card') return 'PAN Card';
  if (type === 'driving_license') return 'Driving License';
  if (type.startsWith('vehicle_rc')) {
    const reg = vehicle?.registration || vehicle?.registrationNumber || '';
    const name = vehicle?.name || '';
    if (!vehicle) return `Vehicle RC (vehicle removed by transporter)`;
    return `Vehicle RC${name ? ` — ${name}` : ''}${reg ? ` (${reg})` : ''}`;
  }
  return type;
};

export default function ManagerDashboard() {
  const { showSuccess, showError } = useNotification();
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // track which doc action is in progress
  const [rejectModal, setRejectModal] = useState(null); // { transporterId, docType, transporterName }
  const [rejectNote, setRejectNote] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVerificationQueue();
      setTransporters(data || []);
    } catch (err) {
      showError(err?.message || 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Flatten transporters into document rows for the table
  const documentRows = [];
  transporters.forEach((t) => {
    const docs = t.documents;
    if (!docs) return;

    if (docs.pan_card) {
      documentRows.push({
        transporterId: t._id,
        transporterName: t.name,
        transporterEmail: t.email,
        docType: 'pan_card',
        docLabel: docTypeLabel('pan_card'),
        url: docs.pan_card.url,
        uploadedAt: docs.pan_card.uploadedAt,
        status: docs.pan_card.adminStatus,
        note: docs.pan_card.adminNote,
        vehicle: null,
        refData: [
          t.pan && { label: 'PAN Number', value: t.pan },
          t.gst_in && { label: 'GST', value: t.gst_in },
          t.primary_contact && { label: 'Contact', value: t.primary_contact },
        ].filter(Boolean),
      });
    }

    if (docs.driving_license) {
      documentRows.push({
        transporterId: t._id,
        transporterName: t.name,
        transporterEmail: t.email,
        docType: 'driving_license',
        docLabel: docTypeLabel('driving_license'),
        url: docs.driving_license.url,
        uploadedAt: docs.driving_license.uploadedAt,
        status: docs.driving_license.adminStatus,
        note: docs.driving_license.adminNote,
        vehicle: null,
        refData: [
          { label: 'Name', value: t.name },
          t.primary_contact && { label: 'Contact', value: t.primary_contact },
          (t.city || t.state) && { label: 'Location', value: [t.city, t.state].filter(Boolean).join(', ') },
        ].filter(Boolean),
      });
    }

    if (docs.vehicle_rcs && docs.vehicle_rcs.length > 0) {
      docs.vehicle_rcs.forEach((rc, idx) => {
        // Find matching fleet vehicle by vehicleId
        const vehicle = t.fleet?.find((v) => v._id?.toString() === rc.vehicleId?.toString()) || null;
        documentRows.push({
          transporterId: t._id,
          transporterName: t.name,
          transporterEmail: t.email,
          docType: `vehicle_rc_${idx}`,
          docLabel: docTypeLabel(`vehicle_rc_${idx}`, vehicle),
          url: rc.url,
          uploadedAt: rc.uploadedAt,
          status: rc.adminStatus,
          note: rc.adminNote,
          vehicle,
          refData: vehicle ? [
            { label: 'Reg No.', value: vehicle.registration },
            { label: 'Type', value: vehicle.truck_type },
            vehicle.capacity && { label: 'Capacity', value: `${vehicle.capacity} ton${vehicle.capacity !== 1 ? 's' : ''}` },
            vehicle.manufacture_year && { label: 'Year', value: vehicle.manufacture_year },
          ].filter(Boolean) : [],
        });
      });
    }
  });

  const handleApprove = async (transporterId, docType) => {
    const key = `${transporterId}-${docType}`;
    setActionLoading(key);
    try {
      await approveDocument(transporterId, docType);
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
    const { transporterId, docType } = rejectModal;
    const key = `${transporterId}-${docType}`;
    setActionLoading(key);
    try {
      await rejectDocument(transporterId, docType, rejectNote);
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

  return (
    <>
      <Header />
      <div className="manager-dashboard-container">
        <div className="manager-dashboard-header">
          <h1>Verification Dashboard</h1>
          <p className="subtitle">Review and manage transporter document submissions</p>
          <button className="refresh-btn" onClick={loadQueue} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-number">{transporters.length}</span>
            <span className="stat-label">Transporters in Queue</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{documentRows.filter((r) => r.status === 'pending').length}</span>
            <span className="stat-label">Pending Documents</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{documentRows.filter((r) => r.status === 'approved').length}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{documentRows.filter((r) => r.status === 'rejected').length}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>

        {loading && <div className="loading-state">Loading verification queue...</div>}

        {!loading && documentRows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>No pending documents</h3>
            <p>All transporter documents have been processed or none have been submitted.</p>
          </div>
        )}

        {!loading && documentRows.length > 0 && (
          <div className="table-container">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Document Type</th>
                  <th>Verify Against</th>
                  <th>Preview</th>
                  <th>Upload Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentRows.map((row, idx) => {
                  const key = `${row.transporterId}-${row.docType}`;
                  const isActionLoading = actionLoading === key;
                  return (
                    <tr key={`${key}-${idx}`}>
                      <td>
                        <div className="user-info">
                          <span className="user-name">{row.transporterName}</span>
                          <span className="user-email">{row.transporterEmail}</span>
                        </div>
                      </td>
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
                        <a
                          href={`${API_BASE}${row.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="preview-link"
                        >
                          View Document
                        </a>
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
                            onClick={() => handleApprove(row.transporterId, row.docType)}
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
                                transporterId: row.transporterId,
                                docType: row.docType,
                                transporterName: row.transporterName,
                                docLabel: row.docLabel,
                              })
                            }
                            disabled={isActionLoading}
                          >
                            Reject
                          </button>
                        )}
                        {row.status === 'approved' && (
                          <span className="approved-text">Approved ✓</span>
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
                <strong>{rejectModal.transporterName}</strong>
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
