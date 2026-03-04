// src/pages/driver/DriverTrips.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { getDriverTrips, startTrip } from '../../api/trips';
import '../../styles/DriverTrips.css';

const STATUS_CONFIG = {
  Scheduled:   { label: 'Scheduled',  color: '#1976d2' },
  'In Transit':{ label: 'In Transit', color: '#388e3c' },
  Delayed:     { label: 'Delayed',    color: '#c62828' },
  Completed:   { label: 'Completed',  color: '#00796b' },
  Cancelled:   { label: 'Cancelled',  color: '#757575' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const DriverTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active' | 'all' | status
  const [startingTripId, setStartingTripId] = useState(null);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDriverTrips();
      setTrips(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const handleStartTrip = useCallback(async (e, id) => {
    e.stopPropagation();
    setStartingTripId(id);
    try {
      await startTrip(id);
      await loadTrips();
    } catch (err) {
      console.error('Failed to start trip:', err.message);
    } finally {
      setStartingTripId(null);
    }
  }, [loadTrips]);

  const activeTrips = trips.filter(t => ['Scheduled', 'In Transit', 'Delayed'].includes(t.status));
  const filteredTrips = filter === 'active' ? activeTrips
    : filter === 'all' ? trips
    : trips.filter(t => t.status === filter);

  return (
    <>
      <Header />
      <br /><br />
      <div className="orders-container">
        <div className="orders-header">
          <h1>My Trips</h1>
          <div className="stats-bar">
            <button className={`stat-chip ${filter === 'active' ? 'stat-chip--active' : ''}`} onClick={() => setFilter('active')}>
              <span className="stat-chip-num">{activeTrips.length}</span> Active
            </button>
            <button className={`stat-chip ${filter === 'all' ? 'stat-chip--active' : ''}`} onClick={() => setFilter('all')}>
              <span className="stat-chip-num">{trips.length}</span> All
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <button key={key} className={`stat-chip ${filter === key ? 'stat-chip--active' : ''}`} onClick={() => setFilter(key)}>
                <span className="stat-chip-num">{trips.filter(t => t.status === key).length}</span> {val.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="loading-state"><div className="spinner"></div><p>Loading trips...</p></div>}
        {!loading && error && <div className="empty-state"><h3>Error</h3><p>{error}</p><button className="btn btn-primary" onClick={loadTrips}>Retry</button></div>}

        {!loading && !error && filteredTrips.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🚛</div>
            <h3>No trips found</h3>
            <p>{trips.length === 0 ? 'You haven\'t been assigned any trips yet.' : 'No trips match this filter.'}</p>
          </div>
        )}

        {!loading && !error && filteredTrips.length > 0 && (
          <div className="orders-grid">
            {filteredTrips.map(trip => {
              const s = STATUS_CONFIG[trip.status] || { label: trip.status, color: '#6366f1' };
              const firstStop = trip.stops?.[0];
              const lastStop = trip.stops?.[trip.stops.length - 1];
              const isActive = ['In Transit', 'Delayed'].includes(trip.status);

              return (
                <div key={trip._id} className="dt-trip-card" onClick={() => navigate(`/driver/trips/${trip._id}`)}>
                  <div className="dt-card-top">
                    <span className="dt-trip-id">#{trip._id?.slice(-6)}</span>
                    <span className="tm-status-badge" style={{ background: s.color + '22', color: s.color, borderColor: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="tm-card-route">
                    <div className="tm-route-point"><span className="tm-dot tm-dot--from" /><span>{firstStop?.address?.city || 'Start'}</span></div>
                    <div className="tm-route-line" />
                    <div className="tm-route-point"><span className="tm-dot tm-dot--to" /><span>{lastStop?.address?.city || 'End'}</span></div>
                  </div>
                  <div className="dt-card-meta">
                    <span>🚛 {trip.assigned_vehicle_id?.registration || '—'}</span>
                    <span>📦 {trip.order_ids?.length || 0} orders</span>
                    <span>🕐 {formatDate(trip.planned_start_at)}</span>
                  </div>
                  {isActive && (
                    <div className="dt-card-progress">
                      <div className="dt-progress-bar">
                        <div className="dt-progress-fill" style={{ width: `${((trip.current_stop_index || 0) / Math.max(trip.stops?.length || 1, 1)) * 100}%` }} />
                      </div>
                      <span className="dt-progress-text">Stop {(trip.current_stop_index || 0) + 1} of {trip.stops?.length}</span>
                    </div>
                  )}
                  <div className="dt-card-actions" onClick={e => e.stopPropagation()}>
                    {trip.status === 'Scheduled' && (
                      <button
                        className="dt-action-btn dt-action-btn--start"
                        onClick={(e) => handleStartTrip(e, trip._id)}
                        disabled={startingTripId === trip._id}
                      >
                        {startingTripId === trip._id ? '⏳ Starting...' : '▶ Start Trip'}
                      </button>
                    )}
                    {isActive && (
                      <button
                        className="dt-action-btn dt-action-btn--open"
                        onClick={(e) => { e.stopPropagation(); navigate(`/driver/trips/${trip._id}`); }}
                      >
                        🗺 Open Active Trip
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default DriverTrips;
