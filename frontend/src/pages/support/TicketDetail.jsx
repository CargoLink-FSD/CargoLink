import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getTicketDetail, addReply } from '../../api/tickets';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './SupportTickets.css';

const API_BASE = 'http://localhost:3000';

export default function TicketDetail() {
    const { id } = useParams();
    const { user } = useSelector((state) => state.auth);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    const loadTicket = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getTicketDetail(id);
            setTicket(data);
        } catch (err) {
            setError(err.message || 'Failed to load ticket');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadTicket(); }, [loadTicket]);

    useEffect(() => {
        const handleRealtimeNotification = (event) => {
            const notification = event?.detail;
            const type = notification?.type || '';
            const ticketId = notification?.meta?.ticketId;
            if (!type.startsWith('ticket.')) return;
            if (!ticketId || ticketId !== id) return;
            loadTicket();
        };

        window.addEventListener('cargolink:notification', handleRealtimeNotification);
        return () => {
            window.removeEventListener('cargolink:notification', handleRealtimeNotification);
        };
    }, [id, loadTicket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    const handleSend = async () => {
        if (!replyText.trim()) return;
        setSending(true);
        try {
            const updated = await addReply(id, replyText.trim());
            setTicket(updated);
            setReplyText('');
        } catch (err) {
            setError(err.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const statusStyle = (status) => {
        const map = {
            open: { bg: '#fef3c7', color: '#92400e', label: 'Open' },
            in_progress: { bg: '#cce5ff', color: '#004085', label: 'In Progress' },

            closed: { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
        };
        return map[status] || map.open;
    };

    if (loading) return (<><Header /><div className="support-container"><p className="support-loading">Loading ticket...</p></div></>);
    if (error && !ticket) return (<><Header /><div className="support-container"><div className="support-error">{error}</div><Link to="/support/tickets" className="back-link">← Back to tickets</Link></div></>);
    if (!ticket) return null;

    const st = statusStyle(ticket.status);

    return (
        <>
            <Header />
            <div className="support-container">
                <Link to="/support/tickets" className="back-link">← Back to tickets</Link>

                <div className="ticket-detail-header">
                    <div>
                        <div className="ticket-detail-id">{ticket.ticketId}</div>
                        <h1 className="ticket-detail-subject">{ticket.subject}</h1>
                        <div className="ticket-detail-meta">
                            <span>{ticket.category}</span>
                            <span>•</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                    <span className="ticket-status-big" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                    </span>
                </div>

                {/* Conversation */}
                <div className="conversation-box">
                    {ticket.messages?.map((msg, idx) => {
                        const isUser = msg.sender === (user?.role || user?.type);
                        const isManager = msg.sender === 'manager';
                        return (
                            <div key={idx} className={`message-bubble ${isUser ? 'msg-user' : 'msg-other'} ${isManager ? 'msg-manager' : ''}`}>
                                <div className="msg-sender">{msg.senderName || msg.sender}</div>
                                <div className="msg-text">{msg.text}</div>
                                {msg.attachment && (
                                    <a href={`${API_BASE}${msg.attachment}`} target="_blank" rel="noreferrer" className="msg-photo-link">
                                        <img src={`${API_BASE}${msg.attachment}`} alt="Attachment" className="msg-photo" />
                                    </a>
                                )}
                                <div className="msg-time">
                                    {new Date(msg.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                {ticket.status !== 'closed' ? (
                    <div className="reply-box">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                            rows={3}
                        />
                        <button onClick={handleSend} disabled={sending || !replyText.trim()} className="send-btn">
                            {sending ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                ) : (
                    <div className="ticket-closed-notice">
                        <p>This ticket has been closed by the manager.</p>
                        <p className="reopen-hint">If you still have an issue, please raise a new ticket.</p>
                    </div>
                )}

                {error && <div className="support-error" style={{ marginTop: '12px' }}>{error}</div>}
            </div>
            <Footer />
        </>
    );
}
