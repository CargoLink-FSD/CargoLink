// Driver Management Page (Transporter)
// View associated drivers, accept/reject applications, view driver schedules

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import {
  getDrivers,
  getDriverRequests,
  acceptDriverRequest,
  rejectDriverRequest,
  removeDriver,
  getDriverSchedule,
} from '../../api/transporter';
import '../../styles/DriverManagement.css';
import '../../styles/DriverSchedule.css';

// ─── Inline Mini Gantt Chart (read-only) ────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateDays = (startDate, count = 7) => {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(new Date(d));
  }
  return days;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
};

const MiniGantt = ({ blocks }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = generateDays(today, 7);

  const getBlocksForDay = (day) => {
    return (blocks || []).filter((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      return bStart <= dayEnd && bEnd >= dayStart;
    }).map((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEndMs = new Date(day); dayEndMs.setHours(24, 0, 0, 0);

      const visStart = bStart < dayStart ? 0 : bStart.getHours() + bStart.getMinutes() / 60;
      const visEnd = bEnd > dayEndMs ? 24 : bEnd.getHours() + bEnd.getMinutes() / 60;
      const left = (visStart / 24) * 100;
      const width = ((visEnd - visStart) / 24) * 100;
      return { ...b, left, width };
    });
  };

  return (
    <div className="gantt-wrapper" style={{ fontSize: '0.8rem' }}>
      <div className="gantt-chart">
        <div className="gantt-header" style={{ gridTemplateColumns: '80px repeat(24, 1fr)' }}>
          <div className="gantt-header-label" style={{ fontSize: '0.7rem' }}>Date</div>
          {HOURS.map((h) => (
            <div key={h} className="gantt-header-label" style={{ fontSize: '0.6rem', padding: '0.4rem 0.2rem' }}>
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
        {days.map((day, idx) => {
          const dayBlocks = getBlocksForDay(day);
          return (
            <div key={idx} className="gantt-row" style={{ gridTemplateColumns: '80px repeat(24, 1fr)', minHeight: '36px' }}>
              <div className="gantt-day-label" style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem' }}>
                <span className="day-name" style={{ fontSize: '0.6rem' }}>{DAY_NAMES[day.getDay()]}</span>
                <span>{formatDate(day)}</span>
              </div>
              {HOURS.map((h) => (
                <div key={h} className={`gantt-cell${h >= 8 && h < 18 ? ' work-hour' : ''}`} style={{ cursor: 'default' }} />
              ))}
              <div className="gantt-blocks-container" style={{ left: '80px' }}>
                {dayBlocks.map((block, bIdx) => (
                  <div
                    key={block._id || bIdx}
                    className={`gantt-block ${block.type}`}
                    style={{ left: `${block.left}%`, width: `${Math.max(block.width, 2)}%` }}
                    title={`${block.title || block.type}: ${new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  >
                    <span style={{ fontSize: '0.6rem' }}>{block.title || block.type}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DriverManagement() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Schedule viewer
  const [scheduleModal, setScheduleModal] = useState(null); // { driverId, driverName, blocks }

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDrivers();
      setDrivers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getDriverRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load requests', err);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchRequests();
  }, [fetchDrivers, fetchRequests]);

  useEffect(() => {
    const relevantTypes = new Set([
      'driver.application.submitted',
      'driver.application.accepted',
      'driver.application.rejected',
    ]);

    const handleRealtimeNotification = (event) => {
      const notification = event?.detail;
      const type = notification?.type || '';
      if (!relevantTypes.has(type)) return;
      fetchRequests();
      fetchDrivers();
    };

    window.addEventListener('cargolink:notification', handleRealtimeNotification);
    return () => {
      window.removeEventListener('cargolink:notification', handleRealtimeNotification);
    };
  }, [fetchDrivers, fetchRequests]);

  const handleAccept = async (applicationId) => {
    try {
      setError(null);
      await acceptDriverRequest(applicationId);
      await fetchRequests();
      await fetchDrivers();
    } catch (err) {
      setError(err.message || 'Failed to accept request');
    }
  };

  const handleReject = async (applicationId) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      setError(null);
      await rejectDriverRequest(applicationId, reason || '');
      await fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject request');
    }
  };

  const handleRemoveDriver = async (driverId) => {
    if (!confirm('Remove this driver from your company?')) return;
    try {
      setError(null);
      await removeDriver(driverId);
      await fetchDrivers();
    } catch (err) {
      setError(err.message || 'Failed to remove driver');
    }
  };

  const handleViewSchedule = async (driver) => {
    try {
      setError(null);
      const data = await getDriverSchedule(driver._id);
      setScheduleModal({
        driverId: driver._id,
        driverName: data.driverName || `${driver.firstName} ${driver.lastName}`,
        blocks: data.blocks || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load driver schedule');
    }
  };

  const statusClass = (s) => (s || '').toLowerCase().replace(/\s+/g, '');

  return (
    <div className="driver-mgmt-page">
      <Header />
      <br />
      <br />
      <br />

      <main className="container main-content">
        <div className="driver-mgmt-container">
          {/* Header */}
          <div className="driver-mgmt-header">
            <h1>Manage Drivers</h1>
            <p>View your associated drivers and manage join requests</p>
          </div>

          {error && <div className="mgmt-error">{error}</div>}

          {/* Tabs */}
          <div className="mgmt-tabs">
            <button
              className={`mgmt-tab ${activeTab === 'drivers' ? 'active' : ''}`}
              onClick={() => setActiveTab('drivers')}
            >
              My Drivers ({drivers.length})
            </button>
            <button
              className={`mgmt-tab ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Join Requests
              {requests.length > 0 && <span className="request-badge">{requests.length}</span>}
            </button>
          </div>

          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading drivers...</div>
              ) : drivers.length === 0 ? (
                <div className="mgmt-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3>No drivers yet</h3>
                  <p>Drivers can apply to join your company from their dashboard</p>
                </div>
              ) : (
                <div className="drivers-grid">
                  {drivers.map((driver) => (
                    <div key={driver._id} className="driver-card">
                      <div className="driver-card-header">
                        <div className="driver-avatar">
                          {driver.profilePicture ? (
                            <img src={`http://localhost:3000${driver.profilePicture}`} alt="" />
                          ) : (
                            (driver.firstName || '?')[0].toUpperCase()
                          )}
                        </div>
                        <div className="driver-info">
                          <h3>{driver.firstName} {driver.lastName}</h3>
                          <p>{driver.email}</p>
                        </div>
                        <span className={`driver-status ${statusClass(driver.status)}`}>
                          {driver.status || 'Available'}
                        </span>
                      </div>

                      <div className="driver-card-details">
                        {driver.phone && <span className="driver-detail-chip">📞 {driver.phone}</span>}
                        {driver.licenseNumber && <span className="driver-detail-chip">🪪 {driver.licenseNumber}</span>}
                        {driver.city && <span className="driver-detail-chip">{driver.city}</span>}
                      </div>

                      <div className="driver-card-actions">
                        <button className="btn-view-schedule" onClick={() => handleViewSchedule(driver)}>
                          View Schedule
                        </button>
                        <button className="btn-remove-driver" onClick={() => handleRemoveDriver(driver._id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <>
              {requests.length === 0 ? (
                <div className="mgmt-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  <h3>No pending requests</h3>
                  <p>New driver applications will appear here</p>
                </div>
              ) : (
                <div className="requests-list">
                  {requests.map((req) => {
                    const driver = req.driver_id || {};
                    return (
                      <div key={req._id} className="request-card">
                        <div className="request-card-header">
                          <div className="driver-avatar">
                            {driver.profilePicture ? (
                              <img src={`http://localhost:3000${driver.profilePicture}`} alt="" />
                            ) : (
                              (driver.firstName || '?')[0].toUpperCase()
                            )}
                          </div>
                          <div className="req-info">
                            <h3>{driver.firstName} {driver.lastName}</h3>
                            <p>Applied {new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {req.message && (
                          <div className="request-message">
                            "{req.message}"
                          </div>
                        )}

                        <div className="request-details">
                          {driver.email && <span className="driver-detail-chip">{driver.email}</span>}
                          {driver.phone && <span className="driver-detail-chip">{driver.phone}</span>}
                          {driver.licenseNumber && <span className="driver-detail-chip">🪪 {driver.licenseNumber}</span>}
                          {driver.city && <span className="driver-detail-chip">{[driver.city, driver.state].filter(Boolean).join(', ')}</span>}
                        </div>

                        <div className="request-actions">
                          <button className="btn-accept" onClick={() => handleAccept(req._id)}>
                            Accept Driver
                          </button>
                          <button className="btn-reject" onClick={() => handleReject(req._id)}>
                            Reject
                          </button>
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

      {/* Schedule Viewer Modal */}
      {scheduleModal && (
        <div className="schedule-overlay" onClick={() => setScheduleModal(null)}>
          <div className="schedule-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-viewer-header">
              <h2>{scheduleModal.driverName}'s Schedule</h2>
              <button className="close-btn" onClick={() => setScheduleModal(null)}>×</button>
            </div>
            <div className="schedule-viewer-body">
              <div className="schedule-legend" style={{ marginBottom: '1rem' }}>
                <div className="legend-item">
                  <div className="legend-color available"></div>
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color unavailable"></div>
                  <span>Unavailable</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color trip"></div>
                  <span>Trip Assigned</span>
                </div>
              </div>
              <MiniGantt blocks={scheduleModal.blocks} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
