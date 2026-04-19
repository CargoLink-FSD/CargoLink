import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';

const STATUS_COLOR = {
    Available: 'green', Assigned: 'blue', 'In Maintenance': 'orange', Unavailable: 'gray',
};
const RC_COLOR = { approved: 'green', pending: 'orange', rejected: 'red' };
const PAGE_SIZE = 20;

export default function FleetOverview() {
    const { showNotification } = useNotification();
    const listStartRef = useRef(null);
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState({});
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [rcFilter, setRcFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchFleet = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(PAGE_SIZE));
            if (search.trim()) params.set('search', search.trim());
            if (statusFilter) params.set('status', statusFilter);
            if (rcFilter) params.set('rcStatus', rcFilter);
            if (typeFilter) params.set('truckType', typeFilter);

            const res = await http.get(`/api/admin/fleet?${params.toString()}`);
            const payload = res?.data || {};
            const nextVehicles = Array.isArray(payload.vehicles)
                ? payload.vehicles
                : Array.isArray(payload.fleet)
                    ? payload.fleet
                    : [];

            setVehicles(nextVehicles);
            setStats(payload.stats || {});
            const nextPagination = res?.pagination || payload?.pagination || null;
            setPagination(nextPagination);
            if (nextPagination?.totalPages && page > nextPagination.totalPages) {
                setPage(nextPagination.totalPages);
            }
        } catch {
            showNotification({ message: 'Failed to load fleet data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchFleet();
        }, search.trim() ? 250 : 0);

        return () => clearTimeout(timeout);
    }, [page, search, statusFilter, rcFilter, typeFilter]);

    const truckTypes = [...new Set(vehicles.map(v => v.truck_type).filter(Boolean))];
    const totalItems = pagination?.total ?? vehicles.length;
    const totalPages = pagination?.totalPages ?? 1;
    const currentPage = pagination?.page ?? page;
    const currentLimit = pagination?.limit ?? PAGE_SIZE;
    const visibleStart = totalItems === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
    const visibleEnd = Math.min(currentPage * currentLimit, totalItems);

    const scrollToListStart = () => {
        const anchor = listStartRef.current;
        if (!anchor) return;

        const y = anchor.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    const goToPage = (nextPage) => {
        if (nextPage === currentPage) return;
        setPage(nextPage);
        requestAnimationFrame(scrollToListStart);
    };

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
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <select className="adm-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                        <option value="">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Maintenance">In Maintenance</option>
                        <option value="Unavailable">Unavailable</option>
                    </select>
                    <select className="adm-select" value={rcFilter} onChange={(e) => { setRcFilter(e.target.value); setPage(1); }}>
                        <option value="">All RC Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select className="adm-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                        <option value="">All Types</option>
                        {truckTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button className="adm-btn adm-btn-outline" onClick={fetchFleet}>Refresh</button>
                </div>

                {/* Table */}
                <div ref={listStartRef} className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                                {vehicles.length === 0 ? (
                                    <tr><td colSpan={9} className="adm-empty">No vehicles found</td></tr>
                                ) : (
                                    vehicles.map((v, i) => (
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
                    Showing {visibleStart} to {visibleEnd} of {totalItems} vehicles
                </p>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <button
                            className="adm-btn adm-btn-outline"
                            onClick={() => goToPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                        >
                            Previous
                        </button>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="adm-btn adm-btn-outline"
                            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
