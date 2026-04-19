import React, { useCallback, useEffect, useState } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useNotification } from '../../context/NotificationContext';
import { getAdminTripDetail, getAdminTrips } from '../../api/adminOps';
import './AdminStyles.css';
import './AdminTrips.css';

const STATUS_OPTIONS = ['Scheduled', 'Active', 'Completed', 'Cancelled'];

export default function AdminTrips() {
  const { showNotification } = useNotification();
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getAdminTrips({
        status,
        search: search.trim(),
        page,
        limit: 20,
        sort,
      });

      const items = payload.items || [];
      setTrips(items);
      setPagination(payload.pagination || null);
      setStats({
        total: payload.pagination?.total || items.length,
        active: items.filter((t) => t.status === 'Active').length,
        scheduled: items.filter((t) => t.status === 'Scheduled').length,
        completed: items.filter((t) => t.status === 'Completed').length,
      });
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load trips', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showNotification, status, search, page, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTrips();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadTrips]);

  const openDetail = async (tripId) => {
    try {
      setDetailLoading(true);
      const detail = await getAdminTripDetail(tripId);
      setSelectedTrip(detail);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load trip detail', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
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
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Trip Oversight</h1>
          <p className="adm-page-subtitle">Cross-platform visibility of all scheduled and active trips</p>
        </div>

        <div className="admxr-stats">
          <div className="admxr-stat"><span>Total</span><strong>{stats.total}</strong></div>
          <div className="admxr-stat"><span>Scheduled</span><strong>{stats.scheduled}</strong></div>
          <div className="admxr-stat"><span>Active</span><strong>{stats.active}</strong></div>
          <div className="admxr-stat"><span>Completed</span><strong>{stats.completed}</strong></div>
        </div>

        <div className="admxr-filters">
          <input
            className="admxr-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by city, status or ID"
          />
          <select className="admxr-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="admxr-select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="date">Newest</option>
            <option value="start_time">Planned Start</option>
          </select>
          <button className="admxr-refresh" onClick={loadTrips} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div className="admxr-table-wrap">
          <table className="admxr-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Status</th>
                <th>Transporter</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Orders</th>
                <th>Planned Start</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="admxr-empty">Loading trips...</td></tr>
              )}
              {!loading && trips.length === 0 && (
                <tr><td colSpan={8} className="admxr-empty">No trips found.</td></tr>
              )}
              {!loading && trips.map((trip) => (
                <tr key={trip._id}>
                  <td className="admxr-id">{trip._id}</td>
                  <td><span className={`admxr-status admxr-status-${(trip.status || '').toLowerCase()}`}>{trip.status}</span></td>
                  <td>{trip.transporter_id?.name || '—'}</td>
                  <td>{trip.assigned_driver_id ? `${trip.assigned_driver_id.firstName || ''} ${trip.assigned_driver_id.lastName || ''}`.trim() : '—'}</td>
                  <td>{trip.assigned_vehicle_id?.registration || '—'}</td>
                  <td>{trip.order_ids?.length || 0}</td>
                  <td>{formatDate(trip.planned_start_at)}</td>
                  <td>
                    <button className="admxr-view" onClick={() => openDetail(trip._id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && pagination?.totalPages > 1 && (
          <div className="admxr-pagination">
            <button className="admxr-page-btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>Previous</button>
            <span className="admxr-page-label">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="admxr-page-btn" onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))} disabled={page >= pagination.totalPages}>Next</button>
          </div>
        )}
      </div>

      {selectedTrip && (
        <div className="admxr-modal-backdrop" onClick={() => setSelectedTrip(null)}>
          <div className="admxr-modal" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="admxr-empty">Loading trip details...</div>
            ) : (
              <>
                <div className="admxr-modal-header">
                  <h3 className="admxr-modal-title">Trip Detail</h3>
                  <button className="admxr-close" onClick={() => setSelectedTrip(null)}>Close</button>
                </div>
                <div className="admxr-detail-grid">
                  <div><span>Status</span><strong>{selectedTrip.status}</strong></div>
                  <div><span>Planned Start</span><strong>{formatDate(selectedTrip.planned_start_at)}</strong></div>
                  <div><span>Planned End</span><strong>{formatDate(selectedTrip.planned_end_at)}</strong></div>
                  <div><span>Distance</span><strong>{selectedTrip.total_distance_km || 0} km</strong></div>
                </div>
                <div className="admxr-section-title">Stops</div>
                <div className="admxr-stop-list">
                  {(selectedTrip.stops || []).map((stop, index) => (
                    <div key={`${stop._id || index}`} className="admxr-stop-item">
                      <span className="admxr-stop-index">{index + 1}</span>
                      <div>
                        <div className="admxr-stop-line">{stop.type} • {stop.status}</div>
                        <div className="admxr-stop-city">{stop.address?.city || 'Unknown city'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
