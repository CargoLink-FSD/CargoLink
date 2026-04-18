// Join Transporter Page
// Allows drivers to browse transporters and apply to join their company

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import {
  getTransportersList,
  applyToTransporter,
  getApplications,
  withdrawApplication,
} from '../../api/driver';
import '../../styles/JoinTransporter.css';

export default function JoinTransporter() {
  const [activeTab, setActiveTab] = useState('browse');
  const [transporters, setTransporters] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);

  const pendingCount = applications.filter((a) => a.status === 'Pending').length;

  const fetchTransporters = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTransportersList();
      setTransporters(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load transporters');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const data = await getApplications();
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications', err);
    }
  }, []);

  useEffect(() => {
    fetchTransporters();
    fetchApplications();
  }, [fetchTransporters, fetchApplications]);

  useEffect(() => {
    const relevantTypes = new Set(['driver.application.accepted', 'driver.application.rejected', 'driver.application.submitted']);
    const handleRealtimeNotification = (event) => {
      const notification = event?.detail;
      const type = notification?.type || '';
      if (!relevantTypes.has(type)) return;
      fetchApplications();
    };

    window.addEventListener('cargolink:notification', handleRealtimeNotification);
    return () => {
      window.removeEventListener('cargolink:notification', handleRealtimeNotification);
    };
  }, [fetchApplications]);

  // Check if driver already applied to a transporter
  const getApplicationFor = (transporterId) => {
    return applications.find(
      (a) => (a.transporter_id?._id || a.transporter_id) === transporterId && a.status === 'Pending'
    );
  };

  const handleOpenApply = (transporter) => {
    setSelectedTransporter(transporter);
    setApplyMessage('');
    setShowApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedTransporter) return;
    try {
      setApplying(true);
      setError(null);
      await applyToTransporter(selectedTransporter._id, applyMessage);
      setShowApplyModal(false);
      await fetchApplications();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async (applicationId) => {
    if (!confirm('Withdraw this application?')) return;
    try {
      setError(null);
      await withdrawApplication(applicationId);
      await fetchApplications();
    } catch (err) {
      setError(err.message || 'Failed to withdraw application');
    }
  };

  // Filter transporters
  const filteredTransporters = transporters.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.city || '').toLowerCase().includes(q) ||
      (t.state || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="join-transporter-page">
      <Header />
      <br />
      <br />
      <br />

      <main className="container main-content">
        <div className="join-container">
          {/* Header */}
          <div className="join-header">
            <h1>Join a Transporter</h1>
            <p>Browse transport companies and apply to join as a driver</p>
          </div>

          {error && <div className="join-error">{error}</div>}

          {/* Tabs */}
          <div className="join-tabs">
            <button
              className={`join-tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse Transporters
            </button>
            <button
              className={`join-tab ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              My Applications
              {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
            </button>
          </div>

          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <>
              <div className="join-search">
                <input
                  type="text"
                  placeholder="Search by name, city, or state..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  Loading transporters...
                </div>
              ) : filteredTransporters.length === 0 ? (
                <div className="join-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <h3>No transporters found</h3>
                  <p>Try adjusting your search query</p>
                </div>
              ) : (
                <div className="transporter-grid">
                  {filteredTransporters.map((t) => {
                    const existingApp = getApplicationFor(t._id);
                    return (
                      <div key={t._id} className="transporter-card">
                        <div className="transporter-card-header">
                          <div className="transporter-avatar">
                            {(t.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3>{t.name}</h3>
                            <p className="transporter-location">
                              {[t.city, t.state].filter(Boolean).join(', ') || 'Location not specified'}
                            </p>
                          </div>
                        </div>

                        <div className="transporter-card-details">
                          <span className="detail-chip">
                            {t.email}
                          </span>
                          {t.fleetCount !== undefined && (
                            <span className="detail-chip">
                              {t.fleetCount} vehicles
                            </span>
                          )}
                          {t.primary_contact && (
                            <span className="detail-chip">
                              {t.primary_contact}
                            </span>
                          )}
                        </div>

                        <div className="transporter-card-actions">
                          {existingApp ? (
                            <button className="btn-apply btn-applied" disabled>
                              Applied
                            </button>
                          ) : (
                            <button className="btn-apply" onClick={() => handleOpenApply(t)}>
                              Apply to Join
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <>
              {applications.length === 0 ? (
                <div className="join-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h3>No applications yet</h3>
                  <p>Browse transporters and apply to join a company</p>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((app) => {
                    const transporter = app.transporter_id || {};
                    return (
                      <div key={app._id} className="application-card">
                        <div className="application-info">
                          <div className="transporter-avatar">
                            {(transporter.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="app-details">
                            <h4>{transporter.name || 'Unknown Transporter'}</h4>
                            <p>
                              {[transporter.city, transporter.state].filter(Boolean).join(', ')}
                              {' · '}
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                            {app.rejectionReason && (
                              <p style={{ color: '#991b1b', marginTop: '0.25rem' }}>
                                Reason: {app.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="application-status">
                          <span className={`status-pill ${app.status.toLowerCase()}`}>
                            {app.status}
                          </span>
                          {app.status === 'Pending' && (
                            <button
                              className="btn-withdraw"
                              onClick={() => handleWithdraw(app._id)}
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="apply-modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="apply-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Apply to {selectedTransporter?.name}</h2>
            <p className="apply-subtitle">
              Send an application to join this transport company as a driver
            </p>

            <div className="form-group">
              <label>Message (optional)</label>
              <textarea
                rows="4"
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Introduce yourself, mention your experience, license details..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowApplyModal(false)}>Cancel</button>
              <button className="btn-submit" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
