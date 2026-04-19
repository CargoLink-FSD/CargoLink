import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { toApiUrl } from '../../utils/apiBase';
import './AdminStyles.css';

const normalizeEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id;
    if (value._id && typeof value._id.toString === 'function') {
      const nested = value._id.toString();
      if (nested && nested !== '[object Object]') return nested;
    }
    if (typeof value.id === 'string') return value.id;
  }

  if (typeof value.toString === 'function') {
    const converted = value.toString();
    if (converted && converted !== '[object Object]') return converted;
  }

  return null;
};

const getUserRowId = (user, role) => {
  if (role === 'customer') return normalizeEntityId(user.customer_id || user._id);
  if (role === 'driver') return normalizeEntityId(user.driver_id || user._id);
  return normalizeEntityId(user.transporter_id || user._id);
};

export default function UserManagement() {
  const { showNotification } = useNotification();
  const listStartRef = useRef(null);
  const [tab, setTab] = useState('customer');
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Detail modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('role', tab);
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());

      const res = await http.get(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.users || []);
      setPagination(res.pagination || null);
    } catch (err) {
      showNotification({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [tab, search, sortBy, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await http.del(`/api/admin/users/${tab}/${userId}`);
      showNotification({ message: 'User deleted successfully', type: 'success' });
      fetchUsers();
    } catch (err) {
      showNotification({ message: 'Failed to delete user', type: 'error' });
    }
  };

  const openDetail = async (userId) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const endpoint = tab === 'customer'
        ? `/api/admin/users/customer/${userId}`
        : tab === 'driver'
          ? `/api/admin/users/driver/${userId}`
          : `/api/admin/users/transporter/${userId}`;
      const res = await http.get(endpoint);
      setDetail(res.data);
    } catch (err) {
      showNotification({ message: 'Failed to load details', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getTripRoute = (trip) => {
    if (!trip?.stops?.length) return '—';
    const firstStop = trip.stops[0];
    const lastStop = trip.stops[trip.stops.length - 1];
    const fromCity = firstStop?.address?.city || firstStop?.address?.state || '—';
    const toCity = lastStop?.address?.city || lastStop?.address?.state || '—';
    return `${fromCity} → ${toCity}`;
  };

  const scrollToListStart = () => {
    const anchor = listStartRef.current;
    if (!anchor) return;

    const y = anchor.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const goToPage = (nextPage) => {
    if (nextPage === page) return;
    setPage(nextPage);
    requestAnimationFrame(scrollToListStart);
  };

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">User Management</h1>
          <p className="adm-page-subtitle">Manage customers, transporters and drivers</p>
        </div>

        {/* Tabs */}
        <div className="adm-tabs">
          <button className={`adm-tab ${tab === 'customer' ? 'active' : ''}`} onClick={() => { setTab('customer'); setSearch(''); setPage(1); }}>
            Customers
          </button>
          <button className={`adm-tab ${tab === 'transporter' ? 'active' : ''}`} onClick={() => { setTab('transporter'); setSearch(''); setPage(1); }}>
            Transporters
          </button>
          <button className={`adm-tab ${tab === 'driver' ? 'active' : ''}`} onClick={() => { setTab('driver'); setSearch(''); setPage(1); }}>
            Drivers
          </button>
        </div>

        {/* Filters */}
        <div className="adm-filter-bar">
          <input
            className="adm-search-input"
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="adm-select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="id">Sort by ID</option>
          </select>
          <button className="adm-btn adm-btn-outline" onClick={fetchUsers}>Refresh</button>
        </div>

        {/* Table */}
        <div ref={listStartRef}>
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" /><p>Loading users...</p></div>
        ) : (
          <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{tab === 'customer' ? 'Name' : tab === 'driver' ? 'Driver Name' : 'Company'}</th>
                    <th>Email</th>
                    <th>{tab === 'driver' ? 'License No.' : 'Phone'}</th>
                    {tab === 'driver' ? <th>Status</th> : <th>Orders</th>}
                    <th>Joined</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="adm-empty">No users found</td></tr>
                  ) : (
                    users.map((u, idx) => {
                      const id = getUserRowId(u, tab);
                      const rowKey = id || normalizeEntityId(u._id) || `${tab}-${u.email || 'user'}-${idx}`;
                      const name = tab === 'customer' ? `${u.first_name} ${u.last_name}`
                        : tab === 'driver' ? `${u.first_name} ${u.last_name}`
                        : u.name;
                      return (
                        <tr key={rowKey}>
                          <td style={{ fontWeight: 600 }}>{name}</td>
                          <td>{u.email}</td>
                          <td>{tab === 'driver' ? (u.licenseNumber || '—') : (u.phone || u.primary_contact || '—')}</td>
                          <td>{tab === 'driver'
                            ? <span className={`adm-badge ${u.status === 'Available' ? 'green' : u.status === 'Assigned' ? 'blue' : 'orange'}`}>{u.status || '—'}</span>
                            : (u.noOfOrders || 0)}
                          </td>
                          <td>{formatDate(u.createdAt)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="adm-btn adm-btn-primary adm-btn-sm"
                              style={{ marginRight: 8 }}
                              onClick={() => id && openDetail(id)}
                              disabled={!id}
                            >
                              View
                            </button>
                            <button
                              className="adm-btn adm-btn-danger adm-btn-sm"
                              onClick={() => id && deleteUser(id)}
                              disabled={!id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        {!loading && pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button className="adm-btn adm-btn-outline" onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button className="adm-btn adm-btn-outline" onClick={() => goToPage(Math.min(pagination.totalPages, page + 1))} disabled={page >= pagination.totalPages}>
              Next
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {(detail || detailLoading) && (
          <div className="adm-modal-overlay" onClick={() => { setDetail(null); setDetailLoading(false); }}>
            <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div className="adm-modal-header">
                <h3>{tab === 'customer' ? 'Customer Details' : tab === 'driver' ? 'Driver Details' : 'Transporter Details'}</h3>
                <button className="adm-modal-close" onClick={() => { setDetail(null); setDetailLoading(false); }}>&times;</button>
              </div>
              <div className="adm-modal-body">
                {detailLoading ? (
                  <div className="adm-loading"><div className="adm-spinner" /><p>Loading...</p></div>
                ) : detail && tab === 'customer' ? (
                  <>
                    <div className="adm-detail-grid">
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Name</span>
                        <span className="adm-detail-value">{detail.firstName} {detail.lastName}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Email</span>
                        <span className="adm-detail-value">{detail.email}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Phone</span>
                        <span className="adm-detail-value">{detail.phone || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Gender</span>
                        <span className="adm-detail-value">{detail.gender || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Total Orders</span>
                        <span className="adm-detail-value">{detail.totalOrders}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Completed</span>
                        <span className="adm-detail-value">{detail.completedOrders}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Total Spent</span>
                        <span className="adm-detail-value">₹{(detail.totalSpent || 0).toLocaleString()}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Joined</span>
                        <span className="adm-detail-value">{formatDate(detail.createdAt)}</span>
                      </div>
                    </div>

                    {detail.orders?.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Order History ({detail.orders.length})</h4>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th>Route</th>
                                <th>Goods</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.orders.slice(0, 10).map((o) => (
                                <tr key={o._id}>
                                  <td>{o.pickup?.city} → {o.delivery?.city}</td>
                                  <td>{o.goods_type}</td>
                                  <td><span className={`adm-badge ${o.status === 'Completed' ? 'green' : o.status === 'Cancelled' ? 'red' : 'blue'}`}>{o.status}</span></td>
                                  <td>₹{(o.final_price || o.max_price || 0).toLocaleString()}</td>
                                  <td>{formatDate(o.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                ) : detail && tab === 'driver' ? (
                  <>
                    <div className="adm-detail-grid">
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Name</span>
                        <span className="adm-detail-value">{detail.firstName} {detail.lastName}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Email</span>
                        <span className="adm-detail-value">{detail.email}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Phone</span>
                        <span className="adm-detail-value">{detail.phone || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">License No.</span>
                        <span className="adm-detail-value">{detail.licenseNumber || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">License Expiry</span>
                        <span className="adm-detail-value">{detail.licenseExpiry ? formatDate(detail.licenseExpiry) : '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Status</span>
                        <span className="adm-detail-value">
                          <span className={`adm-badge ${detail.status === 'Available' ? 'green' : detail.status === 'Assigned' ? 'blue' : 'orange'}`}>
                            {detail.status || '—'}
                          </span>
                        </span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Verification</span>
                        <span className="adm-detail-value">
                          <span className={`adm-badge ${detail.verificationStatus === 'approved' ? 'green' : detail.verificationStatus === 'rejected' ? 'red' : 'orange'}`}>
                            {detail.verificationStatus || 'pending'}
                          </span>
                        </span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Transporter</span>
                        <span className="adm-detail-value">{detail.transporter_id?.name || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Transporter Email</span>
                        <span className="adm-detail-value">{detail.transporter_id?.email || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Transporter Contact</span>
                        <span className="adm-detail-value">{detail.transporter_id?.primary_contact || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Employment</span>
                        <span className="adm-detail-value">{detail.employment_type || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Joined</span>
                        <span className="adm-detail-value">{formatDate(detail.createdAt)}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Total Trips</span>
                        <span className="adm-detail-value">{detail.totalTrips || 0}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Completed Trips</span>
                        <span className="adm-detail-value">{detail.completedTrips || 0}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Active Trips</span>
                        <span className="adm-detail-value">{detail.activeTrips || 0}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Cancelled Trips</span>
                        <span className="adm-detail-value">{detail.cancelledTrips || 0}</span>
                      </div>
                    </div>

                    {detail.trips?.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Trip History ({detail.trips.length})</h4>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th>Route</th>
                                <th>Transporter</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                                <th>Start</th>
                                <th>End</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.trips.slice(0, 20).map((trip, idx) => (
                                <tr key={normalizeEntityId(trip._id) || `trip-${idx}`}>
                                  <td>{getTripRoute(trip)}</td>
                                  <td>{trip.transporter_id?.name || detail.transporter_id?.name || '—'}</td>
                                  <td>{trip.assigned_vehicle_id?.registration || trip.assigned_vehicle_id?.name || '—'}</td>
                                  <td>
                                    <span className={`adm-badge ${trip.status === 'Completed' ? 'green' : trip.status === 'Cancelled' ? 'red' : trip.status === 'Active' ? 'blue' : 'orange'}`}>
                                      {trip.status}
                                    </span>
                                  </td>
                                  <td>{formatDate(trip.actual_start_at || trip.planned_start_at || trip.createdAt)}</td>
                                  <td>{formatDate(trip.actual_end_at || trip.planned_end_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                ) : detail && tab === 'transporter' ? (
                  <>
                    <div className="adm-detail-grid">
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Company</span>
                        <span className="adm-detail-value">{detail.name}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Email</span>
                        <span className="adm-detail-value">{detail.email}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Contact</span>
                        <span className="adm-detail-value">{detail.primary_contact || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">GST</span>
                        <span className="adm-detail-value">{detail.gst_in || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Location</span>
                        <span className="adm-detail-value">{[detail.city, detail.state].filter(Boolean).join(', ') || '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Verification</span>
                        <span className="adm-detail-value">
                          <span className={`adm-badge ${detail.isVerified ? 'green' : detail.verificationStatus === 'under_review' ? 'orange' : 'gray'}`}>
                            {detail.verificationStatus || 'unsubmitted'}
                          </span>
                        </span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Total Orders</span>
                        <span className="adm-detail-value">{detail.totalOrders}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Completed</span>
                        <span className="adm-detail-value">{detail.completedOrders}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Rating</span>
                        <span className="adm-detail-value">{detail.avgRating ? `${detail.avgRating} ⭐` : '—'}</span>
                      </div>
                      <div className="adm-detail-field">
                        <span className="adm-detail-label">Joined</span>
                        <span className="adm-detail-value">{formatDate(detail.createdAt)}</span>
                      </div>
                    </div>

                    {/* Fleet */}
                    {detail.fleet?.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Fleet ({detail.fleet.length} vehicles)</h4>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th>Vehicle</th>
                                <th>Reg No.</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Status</th>
                                <th>RC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.fleet.map((v) => (
                                <tr key={v._id}>
                                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                                  <td>{v.registration}</td>
                                  <td>{v.truck_type}</td>
                                  <td>{v.capacity} tons</td>
                                  <td><span className={`adm-badge ${v.status === 'Available' ? 'green' : v.status === 'Assigned' ? 'blue' : 'orange'}`}>{v.status}</span></td>
                                  <td><span className={`adm-badge ${v.rc_status === 'approved' ? 'green' : v.rc_status === 'rejected' ? 'red' : 'orange'}`}>{v.rc_status || 'pending'}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Documents */}
                    {detail.documents && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Documents</h4>
                        <div className="adm-detail-grid">
                          <div className="adm-detail-field">
                            <span className="adm-detail-label">PAN Card</span>
                            <span className="adm-detail-value">
                              {detail.documents.pan_card?.url
                                ? <><span className={`adm-badge ${detail.documents.pan_card.adminStatus === 'approved' ? 'green' : detail.documents.pan_card.adminStatus === 'rejected' ? 'red' : 'orange'}`}>{detail.documents.pan_card.adminStatus}</span> <a href={toApiUrl(detail.documents.pan_card.url)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#6366f1' }}>View</a></>
                                : '—'}
                            </span>
                          </div>
                          <div className="adm-detail-field">
                            <span className="adm-detail-label">Driving License</span>
                            <span className="adm-detail-value">
                              {detail.documents.driving_license?.url
                                ? <><span className={`adm-badge ${detail.documents.driving_license.adminStatus === 'approved' ? 'green' : detail.documents.driving_license.adminStatus === 'rejected' ? 'red' : 'orange'}`}>{detail.documents.driving_license.adminStatus}</span> <a href={toApiUrl(detail.documents.driving_license.url)} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#6366f1' }}>View</a></>
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Orders */}
                    {detail.orders?.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Recent Orders ({detail.orders.length})</h4>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th>Route</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.orders.slice(0, 10).map((o) => (
                                <tr key={o._id}>
                                  <td>{o.pickup?.city} → {o.delivery?.city}</td>
                                  <td>{o.customer_id ? `${o.customer_id.firstName} ${o.customer_id.lastName}` : '—'}</td>
                                  <td><span className={`adm-badge ${o.status === 'Completed' ? 'green' : o.status === 'Cancelled' ? 'red' : 'blue'}`}>{o.status}</span></td>
                                  <td>₹{(o.final_price || o.max_price || 0).toLocaleString()}</td>
                                  <td>{formatDate(o.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Reviews */}
                    {detail.reviews?.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px', color: '#1e293b' }}>Reviews ({detail.reviews.length})</h4>
                        <div className="adm-table-wrap">
                          <table className="adm-table">
                            <thead>
                              <tr>
                                <th>Customer</th>
                                <th>Rating</th>
                                <th>Comment</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.reviews.slice(0, 10).map((r) => (
                                <tr key={r._id}>
                                  <td>{r.customer_id ? `${r.customer_id.firstName} ${r.customer_id.lastName}` : '—'}</td>
                                  <td>{'⭐'.repeat(r.rating)}</td>
                                  <td style={{ whiteSpace: 'normal', maxWidth: 300 }}>{r.comment}</td>
                                  <td>{formatDate(r.createdAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
