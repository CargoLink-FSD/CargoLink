import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package } from 'lucide-react';
import {
    getAllTickets,
    getTicketStats,
    managerGetTicket,
    managerReply,
    managerUpdateStatus,
} from '../../api/tickets';
import { getManagerProfile } from '../../api/manager';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import './ManagerSupport.css';

const API_BASE = 'http://localhost:3000';

const STATUS_OPTIONS = ['open', 'in_progress', 'closed'];
const ROLE_OPTIONS = ['customer', 'transporter', 'driver'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const badgeColor = (status) => {
    const map = {
        open: { bg: '#fef3c7', color: '#92400e' },
        in_progress: { bg: '#dbeafe', color: '#1e40af' },
        closed: { bg: '#f3f4f6', color: '#6b7280' },
    };
    return map[status] || map.open;
};

const priorityColor = (p) => {
    const map = {
        low: { bg: '#e0f2fe', color: '#0369a1' },
        medium: { bg: '#fef3c7', color: '#92400e' },
        high: { bg: '#fee2e2', color: '#991b1b' },
    };
    return map[p] || map.low;
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function ManagerSupport() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useNotification();

    // ─── List view state ───
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', userRole: '', priority: '' });

    // ─── Detail view state ───
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [managerProfile, setManagerProfile] = useState(null);

    /* ─── Load List ─── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const activeFilters = {};
            if (filters.status) activeFilters.status = filters.status;
            if (filters.userRole) activeFilters.userRole = filters.userRole;
            if (filters.priority) activeFilters.priority = filters.priority;
            activeFilters.page = page;
            activeFilters.limit = limit;

            const [ticketData, statsData, profileData] = await Promise.all([
                getAllTickets(activeFilters),
                getTicketStats(),
                getManagerProfile(),
            ]);
            setTickets(ticketData?.items || []);
            setPagination(ticketData?.pagination || null);
            setStats(statsData);
            setManagerProfile(profileData);
        } catch (err) {
            showError(err?.message || 'Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const handleRealtimeNotification = async (event) => {
            const notification = event?.detail;
            const type = notification?.type || '';
            if (!type.startsWith('ticket.')) return;

            await loadData();

            const updatedTicketId = notification?.meta?.ticketId;
            if (selectedTicket?._id && updatedTicketId && selectedTicket._id === updatedTicketId) {
                try {
                    const data = await managerGetTicket(selectedTicket._id);
                    setSelectedTicket(data.ticket || data);
                } catch {
                    // Ignore detail refresh failures from realtime path
                }
            }
        };

        window.addEventListener('cargolink:notification', handleRealtimeNotification);
        return () => {
            window.removeEventListener('cargolink:notification', handleRealtimeNotification);
        };
    }, [loadData, selectedTicket?._id]);

    useEffect(() => {
        setPage(1);
    }, [filters.status, filters.userRole, filters.priority]);

    /* ─── Open Ticket Detail ─── */
    const openTicket = async (id) => {
        setDetailLoading(true);
        try {
            const data = await managerGetTicket(id);
            setSelectedTicket(data.ticket || data);
        } catch (err) {
            showError(err?.message || 'Failed to load ticket');
        } finally {
            setDetailLoading(false);
        }
    };

    /* ─── Manager Reply ─── */
    const handleReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;
        setSending(true);
        try {
            const data = await managerReply(selectedTicket._id, replyText.trim());
            setSelectedTicket(data.ticket || data);
            setReplyText('');
            showSuccess('Reply sent');
            // refresh list counts
            loadData();
        } catch (err) {
            showError(err?.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    /* ─── Update Status ─── */
    const handleStatusChange = async (newStatus) => {
        if (!selectedTicket) return;
        setStatusUpdating(true);
        try {
            const data = await managerUpdateStatus(selectedTicket._id, newStatus);
            setSelectedTicket(data.ticket || data);
            showSuccess(`Ticket marked as ${newStatus.replace('_', ' ')}`);
            loadData();
        } catch (err) {
            showError(err?.message || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleReply();
        }
    };

    // ─── Auto-scroll messages ───
    useEffect(() => {
        const box = document.querySelector('.mgr-conversation-box');
        if (box) box.scrollTop = box.scrollHeight;
    }, [selectedTicket?.messages]);

    /* ══════════════════ RENDER ══════════════════ */
    return (
        <>
            <Header />
            <div className="mgr-support-container">
                {/* ── Manager Profile Banner ── */}
                {managerProfile && (
                    <div className="mgr-profile-banner">
                        <div className="mgr-profile-info">
                            <span className="mgr-profile-name">👤 {managerProfile.name}</span>
                            <span className="mgr-profile-email">{managerProfile.email}</span>
                            {managerProfile.categories && (
                                <div className="mgr-profile-categories">
                                    {managerProfile.categories.map(c => (
                                        <span key={c} className="mgr-cat-chip">{c.replace(/_/g, ' ')}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Stats Cards ── */}
                {stats && (
                    <div className="mgr-stats-row">
                        <div className="mgr-stat-card stat-total">
                            <span className="stat-number">{stats.total}</span>
                            <span className="stat-label">Total</span>
                        </div>
                        <div className="mgr-stat-card stat-open">
                            <span className="stat-number">{stats.open}</span>
                            <span className="stat-label">Open</span>
                        </div>
                        <div className="mgr-stat-card stat-inprogress">
                            <span className="stat-number">{stats.in_progress ?? stats.inProgress ?? 0}</span>
                            <span className="stat-label">In Progress</span>
                        </div>
                        <div className="mgr-stat-card stat-closed">
                            <span className="stat-number">{stats.closed}</span>
                            <span className="stat-label">Closed</span>
                        </div>
                    </div>
                )}

                <div className="mgr-support-layout">
                    {/* ══════════ LEFT: Ticket list ══════════ */}
                    <div className="mgr-ticket-list-panel">
                        <h2 className="mgr-panel-title">Support Tickets</h2>

                        {/* Filters */}
                        <div className="mgr-filters">
                            <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
                                <option value="">All Statuses</option>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                            <select value={filters.userRole} onChange={(e) => setFilters(f => ({ ...f, userRole: e.target.value }))}>
                                <option value="">All Roles</option>
                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}>
                                <option value="">All Priorities</option>
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* List */}
                        {loading ? (
                            <p className="mgr-loading">Loading tickets...</p>
                        ) : tickets.length === 0 ? (
                            <p className="mgr-empty">No tickets found.</p>
                        ) : (
                            <div className="mgr-ticket-list">
                                {tickets.map((t) => {
                                    const sColor = badgeColor(t.status);
                                    const pColor = priorityColor(t.priority);
                                    const isActive = selectedTicket?._id === t._id;
                                    return (
                                        <div
                                            key={t._id}
                                            className={`mgr-ticket-item ${isActive ? 'active' : ''}`}
                                            onClick={() => openTicket(t._id)}
                                        >
                                            <div className="mgr-ticket-item-top">
                                                <span className="mgr-ticket-id">{t.ticketId}</span>
                                                <div className="mgr-ticket-item-badges">
                                                    <span className="mgr-badge" style={{ background: sColor.bg, color: sColor.color }}>
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="mgr-badge" style={{ background: pColor.bg, color: pColor.color }}>
                                                        {t.priority}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="mgr-ticket-subject">{t.subject}</p>
                                            <div className="mgr-ticket-item-meta">
                                                <span>{t.userName} ({t.userRole})</span>
                                                <span>{t.category}</span>
                                            </div>
                                            <span className="mgr-ticket-date">{formatDate(t.createdAt)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && pagination && pagination.totalPages > 1 && (
                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                <button
                                    className="mgr-send-btn"
                                    style={{ width: 'auto', padding: '8px 12px' }}
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </button>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    className="mgr-send-btn"
                                    style={{ width: 'auto', padding: '8px 12px' }}
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ══════════ RIGHT: Ticket detail ══════════ */}
                    <div className="mgr-ticket-detail-panel">
                        {detailLoading ? (
                            <p className="mgr-loading">Loading ticket...</p>
                        ) : !selectedTicket ? (
                            <div className="mgr-detail-empty">
                                <div className="empty-icon" aria-hidden="true">
                                    <Mail size={44} />
                                </div>
                                <p>Select a ticket from the list to view details</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="mgr-detail-header">
                                    <div>
                                        <span className="mgr-detail-ticket-id">{selectedTicket.ticketId}</span>
                                        <h3 className="mgr-detail-subject">{selectedTicket.subject}</h3>
                                        <div className="mgr-detail-meta">
                                            <span className="mgr-meta-chip">{selectedTicket.userName}</span>
                                            <span className="mgr-meta-chip">{selectedTicket.userRole}</span>
                                            {selectedTicket.userEmail && <span className="mgr-meta-chip">{selectedTicket.userEmail}</span>}
                                            <span className="mgr-meta-chip">{selectedTicket.category}</span>
                                        </div>
                                    </div>
                                    <div className="mgr-detail-actions">
                                        {selectedTicket.status === 'closed' ? (
                                            <span className="mgr-closed-badge">Closed</span>
                                        ) : (
                                            <select
                                                className="mgr-status-select"
                                                value={selectedTicket.status}
                                                onChange={(e) => handleStatusChange(e.target.value)}
                                                disabled={statusUpdating}
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Order Details Card */}
                                {selectedTicket.orderDetails && (
                                    <div className="mgr-order-card">
                                        <h4 className="mgr-order-card-title">
                                            <Package size={16} aria-hidden="true" />
                                            <span>Related Order</span>
                                        </h4>
                                        <div className="mgr-order-grid">
                                            <div className="mgr-order-field">
                                                <span className="mgr-order-label">Route</span>
                                                <span className="mgr-order-value">{selectedTicket.orderDetails.pickup?.city} → {selectedTicket.orderDetails.delivery?.city}</span>
                                            </div>
                                            <div className="mgr-order-field">
                                                <span className="mgr-order-label">Status</span>
                                                <span className="mgr-order-value">{selectedTicket.orderDetails.status}</span>
                                            </div>
                                            <div className="mgr-order-field">
                                                <span className="mgr-order-label">Goods</span>
                                                <span className="mgr-order-value">{selectedTicket.orderDetails.goods_type} — {selectedTicket.orderDetails.weight} kg</span>
                                            </div>
                                            <div className="mgr-order-field">
                                                <span className="mgr-order-label">Price</span>
                                                <span className="mgr-order-value">₹{selectedTicket.orderDetails.final_price || selectedTicket.orderDetails.max_price}</span>
                                            </div>
                                            {selectedTicket.orderDetails.customer && (
                                                <div className="mgr-order-field">
                                                    <span className="mgr-order-label">Customer</span>
                                                    <span className="mgr-order-value">{selectedTicket.orderDetails.customer.name} — {selectedTicket.orderDetails.customer.email}</span>
                                                </div>
                                            )}
                                            {selectedTicket.orderDetails.transporter && (
                                                <div className="mgr-order-field">
                                                    <span className="mgr-order-label">Transporter</span>
                                                    <span className="mgr-order-value">{selectedTicket.orderDetails.transporter.name} — {selectedTicket.orderDetails.transporter.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Conversation */}
                                <div className="mgr-conversation-box">
                                    {selectedTicket.messages?.map((msg, i) => {
                                        const isManager = msg.sender === 'manager';
                                        return (
                                            <div key={i} className={`mgr-msg ${isManager ? 'mgr-msg-manager' : 'mgr-msg-user'}`}>
                                                <span className="mgr-msg-sender">{msg.senderName || msg.sender}</span>
                                                <div className="mgr-msg-text">{msg.text}</div>
                                                {msg.attachment && (
                                                    <a href={`${API_BASE}${msg.attachment}`} target="_blank" rel="noreferrer" className="mgr-msg-photo">
                                                        <img src={`${API_BASE}${msg.attachment}`} alt="Attachment" />
                                                    </a>
                                                )}
                                                <span className="mgr-msg-time">{formatDate(msg.createdAt)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reply */}
                                {selectedTicket.status !== 'closed' ? (
                                    <div className="mgr-reply-box">
                                        <textarea
                                            rows={3}
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                                        />
                                        <button
                                            className="mgr-send-btn"
                                            onClick={handleReply}
                                            disabled={sending || !replyText.trim()}
                                        >
                                            {sending ? 'Sending...' : 'Send'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mgr-closed-notice">This ticket is closed.</div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
