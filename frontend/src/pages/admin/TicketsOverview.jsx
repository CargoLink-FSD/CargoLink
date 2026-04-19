import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';

const STATUS_COLOR = { open: 'blue', in_progress: 'orange', closed: 'gray' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
const PRIORITY_COLOR = { low: 'green', medium: 'orange', high: 'red' };
const PAGE_SIZE = 20;

export default function TicketsOverview() {
    const { showNotification } = useNotification();
    const listStartRef = useRef(null);
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);

    useEffect(() => { fetchTickets(); }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await http.get('/api/admin/tickets');
            setTickets(res.data.tickets || []);
            setStats(res.data.stats || {});
            setPage(1);
        } catch {
            showNotification({ message: 'Failed to load tickets', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];

    const filtered = useMemo(() => (
        tickets.filter((t) => {
            if (statusFilter && t.status !== statusFilter) return false;
            if (priorityFilter && t.priority !== priorityFilter) return false;
            if (categoryFilter && t.category !== categoryFilter) return false;
            if (roleFilter && t.userRole !== roleFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return (
                    t.ticketId?.toLowerCase().includes(s) ||
                    t.userName?.toLowerCase().includes(s) ||
                    t.userEmail?.toLowerCase().includes(s) ||
                    t.subject?.toLowerCase().includes(s)
                );
            }
            return true;
        })
    ), [tickets, statusFilter, priorityFilter, categoryFilter, roleFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedTickets = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, priorityFilter, categoryFilter, roleFilter]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const scrollToListStart = () => {
        const anchor = listStartRef.current;
        if (!anchor) return;

        const y = anchor.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    const goToPage = (nextPage) => {
        if (nextPage === safePage) return;
        setPage(nextPage);
        requestAnimationFrame(scrollToListStart);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

    if (loading) {
        return (<><Header /><div className="admin-container"><div className="adm-loading"><div className="adm-spinner" /><p>Loading tickets...</p></div></div><Footer /></>);
    }

    return (
        <>
            <Header />
            <div className="admin-container">
                <div className="adm-page-header">
                    <h1 className="adm-page-title">Support Tickets</h1>
                    <p className="adm-page-subtitle">Read-only overview of all support tickets</p>
                </div>

                {/* Stats */}
                <div className="adm-stats-row">
                    <div className="adm-stat-card purple">
                        <span className="adm-stat-label">Total Tickets</span>
                        <span className="adm-stat-value">{stats.total || 0}</span>
                    </div>
                    <div className="adm-stat-card blue">
                        <span className="adm-stat-label">Open</span>
                        <span className="adm-stat-value">{stats.open || 0}</span>
                    </div>
                    <div className="adm-stat-card orange">
                        <span className="adm-stat-label">In Progress</span>
                        <span className="adm-stat-value">{stats.in_progress || 0}</span>
                    </div>
                    <div className="adm-stat-card gray">
                        <span className="adm-stat-label">Closed</span>
                        <span className="adm-stat-value">{stats.closed || 0}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="adm-filter-bar">
                    <input
                        className="adm-search-input"
                        placeholder="Search by ticket ID, user, subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select className="adm-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                        <option value="">All Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <select className="adm-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="adm-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="">All Roles</option>
                        <option value="customer">Customer</option>
                        <option value="transporter">Transporter</option>
                        <option value="driver">Driver</option>
                    </select>
                    <button className="adm-btn adm-btn-outline" onClick={fetchTickets}>Refresh</button>
                </div>

                {/* Table */}
                <div ref={listStartRef} className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Category</th>
                                    <th>Subject</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Messages</th>
                                    <th>Created</th>
                                    <th style={{ textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={10} className="adm-empty">No tickets found</td></tr>
                                ) : (
                                    pagedTickets.map(t => (
                                        <tr key={t._id}>
                                            <td style={{ fontWeight: 700, color: '#6366f1' }}>{t.ticketId}</td>
                                            <td>{t.userName}</td>
                                            <td>
                                                <span className={`adm-badge ${t.userRole === 'customer' ? 'blue' : t.userRole === 'driver' ? 'green' : 'purple'}`}>
                                                    {t.userRole}
                                                </span>
                                            </td>
                                            <td>{t.category}</td>
                                            <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {t.subject}
                                            </td>
                                            <td>
                                                <span className={`adm-badge ${PRIORITY_COLOR[t.priority] || 'gray'}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`adm-badge ${STATUS_COLOR[t.status] || 'gray'}`}>
                                                    {STATUS_LABEL[t.status] || t.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{t.messages?.length || 0}</td>
                                            <td>{formatDate(t.createdAt)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => setSelected(t)}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 12 }}>
                    Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                    {' '}to {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} tickets
                </p>

                {filtered.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <button
                            className="adm-btn adm-btn-outline"
                            onClick={() => goToPage(Math.max(1, safePage - 1))}
                            disabled={safePage <= 1}
                        >
                            Previous
                        </button>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Page {safePage} of {totalPages}
                        </span>
                        <button
                            className="adm-btn adm-btn-outline"
                            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                            disabled={safePage >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Detail Modal */}
                {selected && (
                    <div className="adm-modal-overlay" onClick={() => setSelected(null)}>
                        <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                            <div className="adm-modal-header">
                                <h3>{selected.ticketId} — {selected.subject}</h3>
                                <button className="adm-modal-close" onClick={() => setSelected(null)}>&times;</button>
                            </div>
                            <div className="adm-modal-body">
                                <div className="adm-detail-grid">
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">User</span>
                                        <span className="adm-detail-value">{selected.userName}</span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Email</span>
                                        <span className="adm-detail-value">{selected.userEmail}</span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Role</span>
                                        <span className="adm-detail-value">
                                            <span className={`adm-badge ${selected.userRole === 'customer' ? 'blue' : selected.userRole === 'driver' ? 'green' : 'purple'}`}>
                                                {selected.userRole}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Category</span>
                                        <span className="adm-detail-value">{selected.category}</span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Priority</span>
                                        <span className="adm-detail-value">
                                            <span className={`adm-badge ${PRIORITY_COLOR[selected.priority]}`}>{selected.priority}</span>
                                        </span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Status</span>
                                        <span className="adm-detail-value">
                                            <span className={`adm-badge ${STATUS_COLOR[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
                                        </span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Created</span>
                                        <span className="adm-detail-value">{formatDate(selected.createdAt)}</span>
                                    </div>
                                    <div className="adm-detail-field">
                                        <span className="adm-detail-label">Last Updated</span>
                                        <span className="adm-detail-value">{formatDate(selected.updatedAt)}</span>
                                    </div>
                                </div>

                                {/* Conversation */}
                                <h4 style={{ margin: '20px 0 12px', color: '#1e293b', fontSize: '0.95rem' }}>
                                    Conversation ({selected.messages?.length || 0} messages)
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 350, overflowY: 'auto', padding: '4px 0' }}>
                                    {(!selected.messages || selected.messages.length === 0) ? (
                                        <p className="adm-empty" style={{ padding: '20px 0' }}>No messages</p>
                                    ) : (
                                        selected.messages.map((msg, i) => {
                                            const isManager = msg.sender === 'manager';
                                            return (
                                                <div key={i} style={{
                                                    background: isManager ? '#f0f4ff' : '#f8fafc',
                                                    borderLeft: isManager ? '3px solid #6366f1' : '3px solid #10b981',
                                                    borderRadius: 8,
                                                    padding: '10px 14px',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isManager ? '#6366f1' : '#059669' }}>
                                                            {isManager ? 'Manager' : (msg.senderName || selected.userName)}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                            {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>{msg.text}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
