import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';

const STATUS_COLOR = {
    Available: 'green', Assigned: 'blue', 'In Maintenance': 'orange', Unavailable: 'gray',
};
const RC_COLOR = { approved: 'green', pending: 'orange', rejected: 'red' };

export default function FleetOverview() {
    const { showNotification } = useNotification();
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [rcFilter, setRcFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => { fetchFleet(); }, []);

    const fetchFleet = async () => {
        try {
            setLoading(true);
            const res = await http.get('/api/admin/fleet');
            const payload = res?.data?.data || res?.data || res || {};
            const nextVehicles = Array.isArray(payload.vehicles)
                ? payload.vehicles
                : Array.isArray(payload.fleet)
                    ? payload.fleet
                    : [];

            setVehicles(nextVehicles);
            setStats(payload.stats || {});
        } catch {
            showNotification({ message: 'Failed to load fleet data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const truckTypes = [...new Set(vehicles.map(v => v.truck_type).filter(Boolean))];

    const filtered = vehicles.filter(v => {
        if (statusFilter && v.status !== statusFilter) return false;
        if (rcFilter && v.rc_status !== rcFilter) return false;
        if (typeFilter && v.truck_type !== typeFilter) return false;
        if (search) {
            const s = search.toLowerCase();
            return (
                v.name?.toLowerCase().includes(s) ||
                v.registration?.toLowerCase().includes(s) ||
                v.transporter_name?.toLowerCase().includes(s) ||
                v.truck_type?.toLowerCase().includes(s)
            );
        }
        return true;
    });

    if (loading) {
        return (<><Header /><div className="admin-container"><div className="adm-loading"><div className="adm-spinner" /><p>Loading fleet data...</p></div></div><Footer /></>);
    }

    return (
        <>
            <Header />
            <div className="admin-container">
                <div className="adm-page-header">
                    <h1 className="adm-page-title">Fleet Overview</h1>
                    <p className="adm-page-subtitle">All vehicles across all transporters</p>
                </div>

                {/* Stats */}
                <div className="adm-stats-row">
                    <div className="adm-stat-card blue">
                        <span className="adm-stat-label">Total Vehicles</span>
                        <span className="adm-stat-value">{stats.total || 0}</span>
                    </div>
                    <div className="adm-stat-card green">
                        <span className="adm-stat-label">Available</span>
                        <span className="adm-stat-value">{stats.available || 0}</span>
                    </div>
                    <div className="adm-stat-card purple">
                        <span className="adm-stat-label">Assigned</span>
                        <span className="adm-stat-value">{stats.assigned || 0}</span>
                    </div>
                    <div className="adm-stat-card orange">
                        <span className="adm-stat-label">Maintenance</span>
                        <span className="adm-stat-value">{stats.maintenance || 0}</span>
                    </div>
                    <div className="adm-stat-card green">
                        <span className="adm-stat-label">RC Approved</span>
                        <span className="adm-stat-value">{stats.rcApproved || 0}</span>
                    </div>
                    <div className="adm-stat-card orange">
                        <span className="adm-stat-label">RC Pending</span>
                        <span className="adm-stat-value">{stats.rcPending || 0}</span>
                    </div>
                    <div className="adm-stat-card red">
                        <span className="adm-stat-label">RC Rejected</span>
                        <span className="adm-stat-value">{stats.rcRejected || 0}</span>
                    </div>
                    <div className="adm-stat-card gray">
                        <span className="adm-stat-label">Unavailable</span>
                        <span className="adm-stat-value">{stats.unavailable || 0}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="adm-filter-bar">
                    <input
                        className="adm-search-input"
                        placeholder="Search by vehicle name, reg no., transporter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="adm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Maintenance">In Maintenance</option>
                        <option value="Unavailable">Unavailable</option>
                    </select>
                    <select className="adm-select" value={rcFilter} onChange={e => setRcFilter(e.target.value)}>
                        <option value="">All RC Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select className="adm-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        <option value="">All Types</option>
                        {truckTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button className="adm-btn adm-btn-outline" onClick={fetchFleet}>Refresh</button>
                </div>

                {/* Table */}
                <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Vehicle Name</th>
                                    <th>Reg No.</th>
                                    <th>Type</th>
                                    <th>Capacity</th>
                                    <th>Transporter</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>RC Status</th>
                                    <th>Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="adm-empty">No vehicles found</td></tr>
                                ) : (
                                    filtered.map((v, i) => (
                                        <tr key={v._id || i}>
                                            <td style={{ fontWeight: 600 }}>{v.name}</td>
                                            <td>{v.registration}</td>
                                            <td>{v.truck_type}</td>
                                            <td>{v.capacity} tons</td>
                                            <td>{v.transporter_name}</td>
                                            <td>{v.transporter_location || '—'}</td>
                                            <td>
                                                <span className={`adm-badge ${STATUS_COLOR[v.status] || 'gray'}`}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`adm-badge ${RC_COLOR[v.rc_status] || 'orange'}`}>
                                                    {v.rc_status || 'pending'}
                                                </span>
                                            </td>
                                            <td>{v.manufacture_year || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 12 }}>
                    Showing {filtered.length} of {vehicles.length} vehicles
                </p>
            </div>
            <Footer />
        </>
    );
}
