import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Camera, ClipboardList, X } from 'lucide-react';
import { getMyTickets, createTicket } from '../../api/tickets';
import { getCustomerOrders } from '../../api/orders';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './SupportTickets.css';

const ALL_CATEGORIES = [
    'Shipment Issue',
    'Payment Issue',
    'Transporter Complaint',
    'Customer Complaint',
    'Driver Complaint',
    'Technical Issue',
    'Account Issue',
    'Other',
];

// Categories that should show the order dropdown
const ORDER_CATEGORIES = ['Shipment Issue', 'Payment Issue', 'Transporter Complaint', 'Customer Complaint', 'Driver Complaint'];

export default function SupportTickets() {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    // Filter out self-referencing complaint categories
    const CATEGORIES = ALL_CATEGORIES.filter((c) => {
        if (user?.role === 'transporter' && c === 'Transporter Complaint') return false;
        if (user?.role === 'customer' && c === 'Customer Complaint') return false;
        if (user?.role === 'driver' && c === 'Driver Complaint') return false;
        return true;
    });
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ category: '', subject: '', message: '', priority: 'medium', orderId: '' });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const userRole = user?.role || user?.type;

    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getMyTickets({ page, limit });
            setTickets(response?.items || []);
            setPagination(response?.pagination || null);
        } catch (err) {
            setError(err.message || 'Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    useEffect(() => {
        const handleRealtimeNotification = (event) => {
            const notification = event?.detail;
            const type = notification?.type || '';
            if (!type.startsWith('ticket.')) return;
            loadTickets();
        };

        window.addEventListener('cargolink:notification', handleRealtimeNotification);
        return () => {
            window.removeEventListener('cargolink:notification', handleRealtimeNotification);
        };
    }, [loadTickets]);

    // Fetch user's orders when an order-related category is selected
    const showOrderField = ORDER_CATEGORIES.includes(form.category);
    useEffect(() => {
        if (!showOrderField) {
            setOrders([]);
            setForm(f => ({ ...f, orderId: '' }));
            return;
        }
        const fetchOrders = async () => {
            setOrdersLoading(true);
            try {
                const res = await http.get('/api/orders/my-orders');
                setOrders(res.data || []);
            } catch { setOrders([]); }
            finally { setOrdersLoading(false); }
        };
        fetchOrders();
    }, [showOrderField]);

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Photo must be under 5MB');
                return;
            }
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const removePhoto = () => {
        setPhoto(null);
        setPhotoPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category || !form.subject || !form.message) {
            setError('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...form };
            if (photo) payload.photo = photo;
            if (!payload.orderId) delete payload.orderId;
            await createTicket(payload);
            setShowForm(false);
            setForm({ category: '', subject: '', message: '', priority: 'medium', orderId: '' });
            setPhoto(null);
            setPhotoPreview(null);
            setPage(1);
            await loadTickets();
        } catch (err) {
            setError(err.message || 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const statusStyle = (status) => {
        const map = {
            open: { bg: '#fef3c7', color: '#92400e' },
            in_progress: { bg: '#cce5ff', color: '#004085' },

            closed: { bg: '#f3f4f6', color: '#6b7280' },
        };
        return map[status] || map.open;
    };

    const priorityStyle = (p) => {
        const map = {
            low: { bg: '#e0f2fe', color: '#0369a1' },
            medium: { bg: '#fef3c7', color: '#92400e' },
            high: { bg: '#fee2e2', color: '#991b1b' },
        };
        return map[p] || map.medium;
    };

    return (
        <>
            <Header />
            <div className="support-container">
                <div className="support-header">
                    <div>
                        <h1>Support Tickets</h1>
                        <p className="support-subtitle">Need help? Raise a ticket and our team will get back to you.</p>
                    </div>
                    <button className="raise-ticket-btn" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : '+ Raise a Ticket'}
                    </button>
                </div>

                {error && <div className="support-error">{error}</div>}

                {/* New Ticket Form */}
                {showForm && (
                    <div className="ticket-form-card">
                        <h2>Raise a New Ticket</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        <option value="">Select category</option>
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Subject *</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    placeholder="Brief summary of your issue"
                                />
                            </div>
                            <div className="form-group">
                                <label>Describe your issue *</label>
                                <textarea
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    placeholder="Tell us what happened in detail..."
                                />
                            </div>

                            {/* Order dropdown — shown for order-related categories */}
                            {showOrderField && (
                                <div className="form-group">
                                    <label>Related Order (optional)</label>
                                    {ordersLoading ? (
                                        <p className="field-hint">Loading your orders...</p>
                                    ) : orders.length === 0 ? (
                                        <p className="field-hint">No orders found for your account.</p>
                                    ) : (
                                        <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
                                            <option value="">— Select an order —</option>
                                            {orders.map((o) => (
                                                <option key={o._id} value={o._id}>
                                                    {o.pickup?.city} → {o.delivery?.city} — {o.goods_type} — ₹{o.final_price || o.max_price} ({o.status})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Photo attachment */}
                            <div className="form-group">
                                <label>Attach Photo (optional)</label>
                                {!photo ? (
                                    <div className="photo-upload-area">
                                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} id="ticket-photo" hidden />
                                        <label htmlFor="ticket-photo" className="photo-upload-btn">
                                            <Camera size={16} aria-hidden="true" />
                                            <span>Choose Photo</span>
                                        </label>
                                        <span className="field-hint">JPEG, PNG, or WEBP — max 5MB</span>
                                    </div>
                                ) : (
                                    <div className="photo-preview">
                                        <img src={photoPreview} alt="Preview" />
                                        <button type="button" className="remove-photo-btn" onClick={removePhoto}>
                                            <X size={16} aria-hidden="true" />
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="submit-ticket-btn" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Ticket'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Ticket List */}
                {loading && <p className="support-loading">Loading your tickets...</p>}

                {!loading && tickets.length === 0 && !showForm && (
                    <div className="support-empty">
                        <div className="empty-icon" aria-hidden="true">
                            <ClipboardList size={44} />
                        </div>
                        <h3>No tickets yet</h3>
                        <p>You haven't raised any support tickets. Click "Raise a Ticket" if you need help.</p>
                    </div>
                )}

                {!loading && tickets.length > 0 && (
                    <div className="tickets-list">
                        {tickets.map((t) => (
                            <div
                                key={t._id}
                                className="ticket-card"
                                onClick={() => navigate(`/support/tickets/${t._id}`)}
                            >
                                <div className="ticket-card-top">
                                    <span className="ticket-id">{t.ticketId}</span>
                                    <div className="ticket-badges">
                                        <span className="ticket-badge" style={{ background: priorityStyle(t.priority).bg, color: priorityStyle(t.priority).color }}>
                                            {t.priority}
                                        </span>
                                        <span className="ticket-badge" style={{ background: statusStyle(t.status).bg, color: statusStyle(t.status).color }}>
                                            {t.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="ticket-subject">{t.subject}</h3>
                                <div className="ticket-meta">
                                    <span className="ticket-category">{t.category}</span>
                                    <span className="ticket-date">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <p className="ticket-preview">{t.messages?.[0]?.text?.substring(0, 120)}{(t.messages?.[0]?.text?.length > 120) ? '...' : ''}</p>
                                <div className="ticket-card-footer">
                                    <span>{t.messages?.length || 0} message{t.messages?.length !== 1 ? 's' : ''}</span>
                                    <span className="view-link">View →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && pagination && pagination.totalPages > 1 && (
                    <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <button
                            className="raise-ticket-btn"
                            style={{ padding: '8px 14px' }}
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            className="raise-ticket-btn"
                            style={{ padding: '8px 14px' }}
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
