// src/pages/transporter/TripManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { getTrips, cancelTrip, completeTrip as completeTripApi, deleteTrip } from '../../api/trips';
import '../../styles/TripManagement.css';

const STATUS_CONFIG = {
  Planned:     { label: 'Planned',    color: '#6366f1' },
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

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, onView, onCancel, onComplete, onDelete }) {
  const s = STATUS_CONFIG[trip.status] || { label: trip.status, color: '#6366f1' };
  const firstStop = trip.stops?.[0];
  const lastStop = trip.stops?.[trip.stops.length - 1];

  return (
    <div className="tm-trip-card">
      <div className="tm-card-header">
        <div className="tm-card-id">#{trip._id?.slice(-6)}</div>
        <span className="tm-status-badge" style={{ background: s.color + '22', color: s.color, borderColor: s.color }}>
          {s.label}
        </span>
      </div>
      <div className="tm-card-route">
        <div className="tm-route-point">
          <span className="tm-dot tm-dot--from" />
          <span>{firstStop?.address?.city || 'Start'}</span>
        </div>
        <div className="tm-route-line" />
        <div className="tm-route-point">
          <span className="tm-dot tm-dot--to" />
          <span>{lastStop?.address?.city || 'End'}</span>
        </div>
      </div>
      <div className="tm-card-meta">
        <div><span className="tm-meta-label">Vehicle</span><span>{trip.assigned_vehicle_id?.registration || '—'}</span></div>
        <div><span className="tm-meta-label">Driver</span><span>{trip.assigned_driver_id ? `${trip.assigned_driver_id.firstName || ''} ${trip.assigned_driver_id.lastName || ''}`.trim() : '—'}</span></div>
        <div><span className="tm-meta-label">Orders</span><span>{trip.order_ids?.length || 0}</span></div>
        <div><span className="tm-meta-label">Stops</span><span>{trip.stops?.length || 0}</span></div>
        <div><span className="tm-meta-label">Departure</span><span>{formatDate(trip.planned_start_at)}</span></div>
        {trip.total_distance_km > 0 && <div><span className="tm-meta-label">Distance</span><span>{trip.total_distance_km} km</span></div>}
      </div>
      <div className="tm-card-actions">
        <button className="btn btn-outline btn-sm" onClick={() => onView(trip)}>View</button>
        {trip.status === 'Planned' && <button className="btn btn-outline btn-sm btn-danger-outline" onClick={() => onDelete(trip)}>Delete</button>}
        {['Planned', 'Scheduled'].includes(trip.status) && <button className="btn btn-outline btn-sm btn-danger-outline" onClick={() => onCancel(trip)}>Cancel</button>}
        {['In Transit', 'Delayed'].includes(trip.status) && <button className="btn btn-primary btn-sm" onClick={() => onComplete(trip)}>Complete</button>}
      </div>
    </div>
  );
}

// ─── Trip Detail Modal ────────────────────────────────────────────────────────
function TripDetailModal({ trip, onClose }) {
  if (!trip) return null;
  const s = STATUS_CONFIG[trip.status] || { label: trip.status, color: '#6366f1' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tm-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Trip #{trip._id?.slice(-6)}</h2>
            <span className="tm-status-badge" style={{ background: s.color + '22', color: s.color, borderColor: s.color }}>{s.label}</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="tm-modal-grid">
            <div><strong>Vehicle:</strong> {trip.assigned_vehicle_id?.registration || '—'} ({trip.assigned_vehicle_id?.truck_type || ''})</div>
            <div><strong>Driver:</strong> {trip.assigned_driver_id ? `${trip.assigned_driver_id.firstName} ${trip.assigned_driver_id.lastName || ''}` : '—'}</div>
            <div><strong>Orders:</strong> {trip.order_ids?.length || 0}</div>
            <div><strong>Departure:</strong> {formatDate(trip.planned_start_at)}</div>
            <div><strong>ETA:</strong> {formatDate(trip.planned_end_at)}</div>
            {trip.total_distance_km > 0 && <div><strong>Distance:</strong> {trip.total_distance_km} km</div>}
          </div>

          <h3 style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Stops ({trip.stops?.length || 0})</h3>
          <div className="tm-stops-list">
            {trip.stops?.map((stop, i) => (
              <div key={stop._id || i} className="tm-stop-item">
                <div className={`tm-stop-num ${stop.status === 'Completed' ? 'completed' : ''}`}>{i + 1}</div>
                <div className="tm-stop-body">
                  <strong>{stop.address?.city || stop.address?.street || 'Stop'}</strong>
                  <span className="tm-stop-type">{stop.type}</span>
                  <span className="tm-stop-status">{stop.status}</span>
                  {stop.eta_at && <span className="tm-stop-eta">ETA: {formatDate(stop.eta_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TripManagement = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTrips();
      setTrips(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const filteredTrips = trips.filter(trip => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      trip._id?.toLowerCase().includes(q) ||
      trip.assigned_vehicle_id?.registration?.toLowerCase().includes(q) ||
      trip.stops?.some(s => s.address?.city?.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCancel = async (trip) => {
    if (!window.confirm(`Cancel trip #${trip._id?.slice(-6)}?`)) return;
    try {
      await cancelTrip(trip._id);
      loadTrips();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleComplete = async (trip) => {
    if (!window.confirm(`Complete trip #${trip._id?.slice(-6)}?`)) return;
    try {
      await completeTripApi(trip._id);
      loadTrips();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleDelete = async (trip) => {
    if (!window.confirm(`Delete trip #${trip._id?.slice(-6)}? This cannot be undone.`)) return;
    try {
      await deleteTrip(trip._id);
      loadTrips();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = trips.filter(t => t.status === key).length;
    return acc;
  }, {});

  return (
    <>
      <Header />
      <br /><br />
      <div className="orders-container">
        {/* Header */}
        <div className="orders-header">
          <div className="orders-header-row">
            <h1>My Trips</h1>
            <button className="btn-create-trip" onClick={() => navigate('/transporter/trips/create')}>+ Create Trip</button>
          </div>
          <div className="stats-bar">
            <button className={`stat-chip ${statusFilter === 'all' ? 'stat-chip--active' : ''}`}
              onClick={() => setStatusFilter('all')}>
              <span className="stat-chip-num">{trips.length}</span> Total
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <button key={key} className={`stat-chip ${statusFilter === key ? 'stat-chip--active' : ''}`}
                onClick={() => setStatusFilter(key)}>
                <span className="stat-chip-num">{statusCounts[key] || 0}</span> {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="orders-filters">
          <input type="text" placeholder="Search by trip ID, vehicle, or city..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="status-filter">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading && (
          <div className="loading-state"><div className="spinner"></div><p>Loading trips...</p></div>
        )}

        {!loading && error && (
          <div className="empty-state"><h3>Error</h3><p>{error}</p><button className="btn btn-primary" onClick={loadTrips}>Retry</button></div>
        )}

        {!loading && !error && filteredTrips.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🚛</div>
            <h3>No trips found</h3>
            <p>{trips.length === 0 ? 'Create your first trip to get started.' : 'No trips match your filters.'}</p>
            {trips.length === 0 && <button className="btn btn-primary" onClick={() => navigate('/transporter/trips/create')}>Create Trip</button>}
          </div>
        )}

        {!loading && !error && filteredTrips.length > 0 && (
          <div className="orders-grid">
            {filteredTrips.map(trip => (
              <TripCard key={trip._id} trip={trip}
                onView={setSelectedTrip} onCancel={handleCancel}
                onComplete={handleComplete} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {selectedTrip && <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
      <Footer />
    </>
  );
};

export default TripManagement;
