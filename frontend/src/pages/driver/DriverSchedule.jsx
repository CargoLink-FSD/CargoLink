// Driver Schedule Page with Gantt Chart
// Displays a 2-week Gantt chart view where drivers can mark unavailable slots

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { getDriverSchedule, addScheduleBlock, removeScheduleBlock } from '../../api/driver';
import { getDriverProfile } from '../../api/driver';
import '../../styles/DriverSchedule.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate 14 days starting from a given date
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

const formatDateRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return `${formatDate(s)} – ${formatDate(e)}`;
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

const isToday = (date) => isSameDay(new Date(date), new Date());

export default function DriverSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ date: null, startHour: 8, endHour: 18, title: 'Unavailable', notes: '' });
  const [saving, setSaving] = useState(false);
  const [transporterInfo, setTransporterInfo] = useState(null);

  // Compute the start of the 2-week window
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const days = generateDays(baseDate);

  const startISO = days[0].toISOString();
  const endISO = new Date(days[13].getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDriverSchedule(startISO, endISO);
      setBlocks(data.blocks || []);
    } catch (err) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [startISO, endISO]);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await getDriverProfile();
      const p = profile.data || profile;
      if (p.transporter_id) {
        setTransporterInfo({ id: p.transporter_id, name: p.transporterName || 'Your Transporter' });
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handlers

  const handlePrev = () => setWeekOffset((o) => o - 1);
  const handleNext = () => setWeekOffset((o) => o + 1);
  const handleToday = () => setWeekOffset(0);

  const handleCellClick = (day, hour) => {
    setModalData({
      date: new Date(day),
      startHour: hour,
      endHour: Math.min(hour + 2, 24),
      title: 'Unavailable',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSaveBlock = async () => {
    try {
      setSaving(true);
      setError(null);
      const startTime = new Date(modalData.date);
      startTime.setHours(modalData.startHour, 0, 0, 0);
      const endTime = new Date(modalData.date);
      endTime.setHours(modalData.endHour, 0, 0, 0);

      // If endHour overflows to next day
      if (modalData.endHour >= 24) {
        endTime.setDate(endTime.getDate() + 1);
        endTime.setHours(0, 0, 0, 0);
      }

      await addScheduleBlock({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        title: modalData.title || 'Unavailable',
        notes: modalData.notes || '',
      });

      setShowModal(false);
      await fetchSchedule();
    } catch (err) {
      setError(err.message || 'Failed to add block');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlock = async (blockId) => {
    if (!confirm('Remove this schedule block?')) return;
    try {
      setError(null);
      await removeScheduleBlock(blockId);
      await fetchSchedule();
    } catch (err) {
      setError(err.message || 'Failed to remove block');
    }
  };

  // Compute block positions for a given day
  const getBlocksForDay = (day) => {
    return blocks.filter((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      return bStart <= dayEnd && bEnd >= dayStart;
    }).map((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);

      // Clamp to this day
      const visStart = bStart < dayStart ? 0 : bStart.getHours() + bStart.getMinutes() / 60;
      const dayEndMs = new Date(day);
      dayEndMs.setHours(24, 0, 0, 0);
      const visEnd = bEnd > dayEndMs ? 24 : bEnd.getHours() + bEnd.getMinutes() / 60;

      const left = (visStart / 24) * 100;
      const width = ((visEnd - visStart) / 24) * 100;

      return { ...b, left, width };
    });
  };

  return (
    <div className="schedule-page">
      <Header />
      <br />
      <br />
      <br />

      <main className="container main-content">
        <div className="schedule-container">
          {/* Header */}
          <div className="schedule-header">
            <h1>My Schedule</h1>
            <div className="schedule-nav">
              <button onClick={handlePrev}>← Prev</button>
              <button onClick={handleToday}>Today</button>
              <span className="date-range">{formatDateRange(days[0], days[13])}</span>
              <button onClick={handleNext}>Next →</button>
            </div>
          </div>

          {/* Transporter Banner */}
          {transporterInfo ? (
            <div className="transporter-banner">
              <div className="banner-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <div className="banner-text">
                <h3>Associated with: {transporterInfo.name}</h3>
                <p>Your schedule is visible to your transporter</p>
              </div>
            </div>
          ) : (
            <div className="transporter-banner no-transporter-banner">
              <div className="banner-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="banner-text">
                <h3>Not associated with a transporter</h3>
                <p><Link to="/driver/join-transporter">Join a transporter</Link> to get trip assignments and show your availability.</p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="schedule-legend">
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-color unavailable"></div>
              <span>Unavailable (manual)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color trip"></div>
              <span>Trip Assigned</span>
            </div>
          </div>

          {error && <div className="schedule-error">{error}</div>}

          {/* Gantt Chart */}
          <div className="gantt-wrapper">
            {loading ? (
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
                      {/* Day Label */}
                      <div className={`gantt-day-label${isToday(day) ? ' today-label' : ''}`}>
                        <span className="day-name">{DAY_NAMES[day.getDay()]}</span>
                        <span>{formatDate(day)}</span>
                      </div>

                      {/* Hour Cells */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className={`gantt-cell${h >= 8 && h < 18 ? ' work-hour' : ''}`}
                          onClick={() => handleCellClick(day, h)}
                          title={`Click to mark unavailable at ${h}:00`}
                        />
                      ))}

                      {/* Block Overlays */}
                      <div className="gantt-blocks-container">
                        {dayBlocks.map((block) => (
                          <div
                            key={block._id}
                            className={`gantt-block ${block.type}`}
                            style={{ left: `${block.left}%`, width: `${Math.max(block.width, 2)}%` }}
                            title={`${block.title || block.type}: ${new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${block.notes ? `\n${block.notes}` : ''}`}
                          >
                            <span>{block.title || block.type}</span>
                            {block.type === 'unavailable' && (
                              <button
                                className="block-delete"
                                onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block._id); }}
                                title="Remove block"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tip */}
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
            💡 Click on any time slot to mark it as unavailable. Trip assignments from your transporter will appear automatically.
          </p>
        </div>
      </main>

      {/* Add Block Modal */}
      {showModal && (
        <div className="schedule-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Mark as Unavailable</h2>

            {error && <div className="schedule-error">{error}</div>}

            <div className="form-group">
              <label>Date</label>
              <input
                type="text"
                value={modalData.date ? formatDate(modalData.date) + ', ' + modalData.date.getFullYear() : ''}
                readOnly
              />
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
              <label>Title</label>
              <input
                type="text"
                value={modalData.title}
                onChange={(e) => setModalData((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Personal, Break, Day Off"
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
                {saving ? 'Saving...' : 'Mark Unavailable'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}