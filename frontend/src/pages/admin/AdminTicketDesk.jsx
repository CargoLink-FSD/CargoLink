import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import http from '../../api/http';
import { useNotification } from '../../context/NotificationContext';
import {
  getAdminTicketDetail,
  replyAdminTicket,
  updateAdminTicketStatus,
} from '../../api/adminOps';
import { toApiUrl } from '../../utils/apiBase';
import './AdminStyles.css';
import './AdminTicketDesk.css';

const STATUS_OPTIONS = ['open', 'in_progress', 'closed'];

export default function AdminTicketDesk() {
  const { showNotification } = useNotification();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await http.get('/api/admin/tickets');
      const payload = res.data || {};
      setTickets(payload.tickets || []);
      setStats(payload.stats || { total: 0, open: 0, in_progress: 0, closed: 0 });
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load tickets', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter && ticket.status !== statusFilter) return false;
      if (!q) return true;
      const line = `${ticket.ticketId || ''} ${ticket.subject || ''} ${ticket.userName || ''} ${ticket.userEmail || ''} ${ticket.category || ''}`.toLowerCase();
      return line.includes(q);
    });
  }, [tickets, search, statusFilter]);

  const openTicket = useCallback(async (ticketId) => {
    try {
      setSelectedId(ticketId);
      setDetailLoading(true);
      const detail = await getAdminTicketDetail(ticketId);
      setSelectedTicket(detail);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load ticket detail', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  }, [showNotification]);

  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    try {
      setSending(true);
      await replyAdminTicket(selectedId, replyText.trim());
      setReplyText('');
      showNotification({ message: 'Reply sent', type: 'success' });
      await Promise.all([openTicket(selectedId), loadTickets()]);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to send reply', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedId) return;
    try {
      setStatusSaving(true);
      await updateAdminTicketStatus(selectedId, status);
      showNotification({ message: `Status updated to ${status.replace('_', ' ')}`, type: 'success' });
      await Promise.all([openTicket(selectedId), loadTickets()]);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to update status', type: 'error' });
    } finally {
      setStatusSaving(false);
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
          <h1 className="adm-page-title">Ticket Desk</h1>
          <p className="adm-page-subtitle">Admin support operations with status control and replies</p>
        </div>

        <div className="admxt-stats">
          <div className="admxt-stat"><span>Total</span><strong>{stats.total || 0}</strong></div>
          <div className="admxt-stat"><span>Open</span><strong>{stats.open || 0}</strong></div>
          <div className="admxt-stat"><span>In Progress</span><strong>{stats.in_progress || 0}</strong></div>
          <div className="admxt-stat"><span>Closed</span><strong>{stats.closed || 0}</strong></div>
        </div>

        <div className="admxt-filters">
          <input
            className="admxt-search"
            placeholder="Search by ticket, user, category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="admxt-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button className="admxt-refresh" onClick={loadTickets} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="admxt-layout">
          <section className="admxt-list-panel">
            {loading ? (
              <div className="admxt-empty">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="admxt-empty">No tickets found.</div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket._id}
                  className={`admxt-ticket-item ${selectedId === ticket._id ? 'active' : ''}`}
                  onClick={() => openTicket(ticket._id)}
                >
                  <div className="admxt-ticket-top">
                    <span className="admxt-ticket-id">{ticket.ticketId}</span>
                    <span className={`admxt-ticket-status admxt-ticket-status-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
                  </div>
                  <div className="admxt-ticket-subject">{ticket.subject}</div>
                  <div className="admxt-ticket-meta">{ticket.userName} • {ticket.userRole} • {ticket.category}</div>
                  <div className="admxt-ticket-time">{formatDate(ticket.createdAt)}</div>
                </button>
              ))
            )}
          </section>

          <section className="admxt-detail-panel">
            {!selectedId && <div className="admxt-empty">Select a ticket to view details.</div>}
            {selectedId && detailLoading && <div className="admxt-empty">Loading ticket detail...</div>}
            {selectedId && !detailLoading && selectedTicket && (
              <>
                <div className="admxt-detail-header">
                  <div>
                    <div className="admxt-detail-id">{selectedTicket.ticketId}</div>
                    <h3 className="admxt-detail-title">{selectedTicket.subject}</h3>
                    <div className="admxt-detail-user">{selectedTicket.userName} • {selectedTicket.userEmail}</div>
                  </div>
                  <div className="admxt-detail-actions">
                    <select
                      className="admxt-select"
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusSaving}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedTicket.orderDetails && (
                  <div className="admxt-order-card">
                    <div className="admxt-order-row"><span>Route</span><strong>{selectedTicket.orderDetails.pickup?.city}{' -> '}{selectedTicket.orderDetails.delivery?.city}</strong></div>
                    <div className="admxt-order-row"><span>Status</span><strong>{selectedTicket.orderDetails.status}</strong></div>
                    <div className="admxt-order-row"><span>Goods</span><strong>{selectedTicket.orderDetails.goods_type || 'N/A'}</strong></div>
                    <div className="admxt-order-row"><span>Price</span><strong>Rs {selectedTicket.orderDetails.final_price || selectedTicket.orderDetails.max_price || 0}</strong></div>
                  </div>
                )}

                <div className="admxt-messages">
                  {(selectedTicket.messages || []).map((message, index) => (
                    <div key={`${message.createdAt}-${index}`} className={`admxt-message ${message.sender === 'manager' ? 'admxt-message-admin' : 'admxt-message-user'}`}>
                      <div className="admxt-message-sender">{message.senderName || message.sender}</div>
                      <div className="admxt-message-text">{message.text}</div>
                      {message.attachment && (
                        <a href={toApiUrl(message.attachment)} target="_blank" rel="noreferrer" className="admxt-message-attachment">
                          View attachment
                        </a>
                      )}
                      <div className="admxt-message-time">{formatDate(message.createdAt)}</div>
                    </div>
                  ))}
                </div>

                <div className="admxt-reply-box">
                  <textarea
                    className="admxt-reply-input"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write a reply as Admin"
                  />
                  <button className="admxt-send" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
