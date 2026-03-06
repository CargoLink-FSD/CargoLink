import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVehicleDetails } from '../../hooks/fleet/useVehicleDetails';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/truck-details.css';
import '../../styles/DriverSchedule.css';

// ─── Gantt Chart Constants ──────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateDays = (startDate) => {
  const days = [];
  for (let i = 0; i < 14; i++) {
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

const formatDateRange = (start, end) =>
  `${formatDate(start)} – ${formatDate(end)}`;

const isToday = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

// ─── Block type config ──────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { value: 'maintenance', label: 'Maintenance', cssClass: 'maintenance' },
  { value: 'unavailable', label: 'Unavailable', cssClass: 'unavailable' },
  { value: 'trip', label: 'Trip / Assigned', cssClass: 'trip' },
];

const VehicleDetails = () => {
  const { vehicleId } = useParams();

  const {
    vehicle,
    loading,
    scheduleBlocks,
    scheduleLoading,
    fetchSchedule,
    handleAddScheduleBlock,
    handleRemoveScheduleBlock,
    refetch,
  } = useVehicleDetails(vehicleId);

  const { showSuccess, showError } = useNotification();

  // ─── Schedule state ─────────────────────────────────────────────────────────

  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    date: null,
    startHour: 8,
    endHour: 18,
    title: '',
    notes: '',
    type: 'unavailable',
  });
  const [saving, setSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  // Compute the 14-day window
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const days = generateDays(baseDate);

  const startISO = days[0].toISOString();
  const endISO = new Date(days[13].getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

  // Fetch schedule whenever the date window changes
  const loadSchedule = useCallback(async () => {
    try {
      setScheduleError(null);
      await fetchSchedule(startISO, endISO);
    } catch (err) {
      setScheduleError(err.message || 'Failed to load schedule');
    }
  }, [fetchSchedule, startISO, endISO]);

  useEffect(() => {
    if (vehicleId) loadSchedule();
  }, [loadSchedule, vehicleId]);

  // ─── Schedule handlers ────────────────────────────────────────────────────────

  const handlePrev = () => setWeekOffset((o) => o - 1);
  const handleNext = () => setWeekOffset((o) => o + 1);
  const handleToday = () => setWeekOffset(0);

  const handleCellClick = (day, hour) => {
    setModalData({
      date: new Date(day),
      startHour: hour,
      endHour: Math.min(hour + 2, 24),
      title: '',
      notes: '',
      type: 'unavailable',
    });
    setShowModal(true);
    setScheduleError(null);
  };

  const handleSaveBlock = async () => {
    try {
      setSaving(true);
      setScheduleError(null);
      const startTime = new Date(modalData.date);
      startTime.setHours(modalData.startHour, 0, 0, 0);
      const endTime = new Date(modalData.date);
      endTime.setHours(modalData.endHour, 0, 0, 0);

      if (modalData.endHour >= 24) {
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(0, 0, 0, 0);
      }

      const typeConfig = BLOCK_TYPES.find((t) => t.value === modalData.type);

      await handleAddScheduleBlock({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: modalData.type,
        title: modalData.title || typeConfig?.label || modalData.type,
        notes: modalData.notes || '',
      });

      setShowModal(false);
      showSuccess('Schedule block added');
      await loadSchedule();
      await refetch();
    } catch (err) {
      setScheduleError(err.message || 'Failed to add block');
      showError(err.message || 'Failed to add block');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Remove this schedule block?')) return;
    try {
      setScheduleError(null);
      await handleRemoveScheduleBlock(blockId);
      showSuccess('Schedule block removed');
      await loadSchedule();
      await refetch();
    } catch (err) {
      setScheduleError(err.message || 'Failed to remove block');
      showError(err.message || 'Failed to remove block');
    }
  };

  // Compute block positions for a given day
  const getBlocksForDay = (day) => {
    return scheduleBlocks
      .filter((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return bStart <= dayEnd && bEnd >= dayStart;
      })
      .map((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEndMs = new Date(day);
        dayEndMs.setHours(24, 0, 0, 0);

        const visStart = bStart < dayStart ? 0 : bStart.getHours() + bStart.getMinutes() / 60;
        const visEnd = bEnd > dayEndMs ? 24 : bEnd.getHours() + bEnd.getMinutes() / 60;
        const left = (visStart / 24) * 100;
        const width = ((visEnd - visStart) / 24) * 100;

        return { ...b, left, width };
      });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!vehicle) return <div className="error-screen">Vehicle not found</div>;

  return (
    <div className="truck-details-page">
      <Header />
      <main className="container">
        <div className="page-header">
          <div className="title-section">
            <h1>Truck Details - {vehicle.name}</h1>
            <div className="title-underline"></div>
          </div>
          <Link to="/transporter/fleet" className="btn-back">
            ← Back to Fleet
          </Link>
        </div>

        {/* ── Vehicle Info Card ─────────────────────────────────────────────── */}
        <div className="details-card">
          <div className="card-header">
            <h2>{vehicle.name}</h2>
            <span className={`status-text ${vehicle.status ? vehicle.status.toLowerCase().replace(/\s+/g, '') : ''}`}>
              {vehicle.status ? vehicle.status.toUpperCase() : 'UNKNOWN'}
            </span>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <label>Registration</label>
              <p>{vehicle.registration || vehicle.registrationNumber}</p>
            </div>
            <div className="detail-item">
              <label>Type</label>
              <p>{vehicle.truck_type || vehicle.type}</p>
            </div>
            <div className="detail-item">
              <label>Capacity</label>
              <p>{vehicle.capacity} tons</p>
            </div>
            <div className="detail-item">
              <label>Manufacture Year</label>
              <p>{vehicle.manufacture_year || vehicle.manufactureYear}</p>
            </div>
            <div className="detail-item">
              <label>Last Service Date</label>
              <p>{vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="detail-item">
              <label>Next Service Date</label>
              <p>{vehicle.next_service_date ? new Date(vehicle.next_service_date).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* ── Fleet Schedule Gantt Chart ────────────────────────────────────── */}
        <div className="fleet-schedule-section">
          <div className="schedule-container">
            <div className="schedule-header">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Vehicle Schedule</h2>
              <div className="schedule-nav">
                <button onClick={handlePrev}>← Prev</button>
                <button onClick={handleToday}>Today</button>
                <span className="date-range">{formatDateRange(days[0], days[13])}</span>
                <button onClick={handleNext}>Next →</button>
              </div>
            </div>

            {/* Legend */}
            <div className="schedule-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}></div>
                <span>Maintenance</span>
              </div>
              <div className="legend-item">
                <div className="legend-color unavailable"></div>
                <span>Unavailable</span>
              </div>
              <div className="legend-item">
                <div className="legend-color trip"></div>
                <span>Trip / Assigned</span>
              </div>
            </div>

            {scheduleError && <div className="schedule-error">{scheduleError}</div>}

            {/* Gantt Chart */}
            <div className="gantt-wrapper">
              {scheduleLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading schedule...</div>
              ) : (
                <div className="gantt-chart">
                  {/* Header Row */}
                  <div className="gantt-header">
                    <div className="gantt-header-label">Date</div>
                    {HOURS.map((h) => (
                      <div key={h} className="gantt-header-label">
                        {h.toString().padStart(2, '0')}
                      </div>
                    ))}
                  </div>

                  {/* Day Rows */}
                  {days.map((day, dayIdx) => {
                    const dayBlocks = getBlocksForDay(day);
                    const todayClass = isToday(day) ? ' today' : '';

                    return (
                      <div key={dayIdx} className={`gantt-row${todayClass}`}>
                        <div className={`gantt-day-label${isToday(day) ? ' today-label' : ''}`}>
                          <span className="day-name">{DAY_NAMES[day.getDay()]}</span>
                          <span>{formatDate(day)}</span>
                        </div>

                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className={`gantt-cell${h >= 8 && h < 18 ? ' work-hour' : ''}`}
                            onClick={() => handleCellClick(day, h)}
                            title={`Click to add schedule block at ${h}:00`}
                          />
                        ))}

                        <div className="gantt-blocks-container">
                          {dayBlocks.map((block) => {
                            const cssClass =
                              block.type === 'maintenance' ? 'maintenance' :
                              block.type === 'trip' ? 'trip' : 'unavailable';
                            return (
                              <div
                                key={block._id}
                                className={`gantt-block ${cssClass}`}
                                style={{ left: `${block.left}%`, width: `${Math.max(block.width, 2)}%` }}
                                title={`${block.title || block.type}: ${new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${block.notes ? `\n${block.notes}` : ''}`}
                              >
                                <span>{block.title || block.type}</span>
                                <button
                                  className="block-delete"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block._id); }}
                                  title="Remove block"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
              💡 Click on any time slot to add a schedule block. Mark maintenance windows, unavailable periods, or trip assignments.
            </p>
          </div>
        </div>
      </main>

      {/* ── Add Block Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="schedule-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Schedule Block</h2>

            {scheduleError && <div className="schedule-error">{scheduleError}</div>}

            <div className="form-group">
              <label>Date</label>
              <input
                type="text"
                value={modalData.date ? formatDate(modalData.date) + ', ' + modalData.date.getFullYear() : ''}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Block Type</label>
              <select
                value={modalData.type}
                onChange={(e) => setModalData((d) => ({ ...d, type: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={modalData.startHour}
                  onChange={(e) => setModalData((d) => ({ ...d, startHour: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label>End Hour</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={modalData.endHour}
                  onChange={(e) => setModalData((d) => ({ ...d, endHour: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Title (optional)</label>
              <input
                type="text"
                value={modalData.title}
                onChange={(e) => setModalData((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Engine service, Tire change, Route delivery"
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                rows="2"
                value={modalData.notes}
                onChange={(e) => setModalData((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn-save"
                onClick={handleSaveBlock}
                disabled={saving || modalData.startHour >= modalData.endHour}
              >
                {saving ? 'Saving...' : 'Add Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default VehicleDetails;