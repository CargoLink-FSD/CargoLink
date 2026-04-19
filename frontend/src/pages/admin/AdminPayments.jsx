import React, { useCallback, useEffect, useState } from 'react';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import { useNotification } from '../../context/NotificationContext';
import { getAdminPaymentDetail, getAdminPayments } from '../../api/adminOps';
import './AdminStyles.css';
import './AdminPayments.css';

const STATUS_OPTIONS = ['Created', 'Pending', 'Completed', 'Failed', 'Refunded'];
const TYPE_OPTIONS = ['final', 'cancellation_due'];

export default function AdminPayments() {
  const { showNotification } = useNotification();
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, completed: 0, pending: 0, failed: 0, refunded: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getAdminPayments({
        status,
        paymentType,
        search: search.trim(),
        page,
        limit: 20,
        sort,
      });
      setPayments(payload.payments || []);
      setPagination(payload.pagination || null);
      setStats(payload.stats || { total: 0, totalAmount: 0, completed: 0, pending: 0, failed: 0, refunded: 0 });
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showNotification, status, paymentType, search, page, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayments();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadPayments]);

  const openDetail = async (paymentId) => {
    try {
      setDetailLoading(true);
      const detail = await getAdminPaymentDetail(paymentId);
      setSelectedPayment(detail);
    } catch (err) {
      showNotification({ message: err?.message || 'Failed to load payment detail', type: 'error' });
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

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Payment Ledger</h1>
          <p className="adm-page-subtitle">Monitor final and cancellation dues payment records</p>
        </div>

        <div className="admxp-stats">
          <div className="admxp-stat"><span>Total Payments</span><strong>{stats.total}</strong></div>
          <div className="admxp-stat"><span>Total Amount</span><strong>{formatCurrency(stats.totalAmount)}</strong></div>
          <div className="admxp-stat"><span>Completed</span><strong>{stats.completed}</strong></div>
          <div className="admxp-stat"><span>Pending</span><strong>{stats.pending}</strong></div>
        </div>

        <div className="admxp-filters">
          <input
            className="admxp-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by payment/order/customer/razorpay IDs"
          />
          <select className="admxp-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="admxp-select" value={paymentType} onChange={(e) => { setPaymentType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="admxp-select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="date">Newest</option>
            <option value="amount_desc">Amount High to Low</option>
            <option value="amount_asc">Amount Low to High</option>
          </select>
          <button className="admxp-refresh" onClick={loadPayments} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div className="admxp-table-wrap">
          <table className="admxp-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="admxp-empty">Loading payments...</td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={8} className="admxp-empty">No payments found.</td></tr>}
              {!loading && payments.map((payment) => (
                <tr key={payment._id}>
                  <td className="admxp-id">{payment._id}</td>
                  <td>{payment.order_id?._id || 'N/A'}</td>
                  <td>{payment.customer_id ? `${payment.customer_id.firstName || ''} ${payment.customer_id.lastName || ''}`.trim() : 'N/A'}</td>
                  <td><span className={`admxp-type admxp-type-${payment.payment_type}`}>{payment.payment_type}</span></td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td><span className={`admxp-status admxp-status-${String(payment.status || '').toLowerCase()}`}>{payment.status}</span></td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td><button className="admxp-view" onClick={() => openDetail(payment._id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && pagination?.totalPages > 1 && (
          <div className="admxp-pagination">
            <button className="admxp-page-btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>Previous</button>
            <span className="admxp-page-label">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="admxp-page-btn" onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))} disabled={page >= pagination.totalPages}>Next</button>
          </div>
        )}
      </div>

      {selectedPayment && (
        <div className="admxp-modal-backdrop" onClick={() => setSelectedPayment(null)}>
          <div className="admxp-modal" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="admxp-empty">Loading payment detail...</div>
            ) : (
              <>
                <div className="admxp-modal-header">
                  <h3 className="admxp-modal-title">Payment Detail</h3>
                  <button className="admxp-close" onClick={() => setSelectedPayment(null)}>Close</button>
                </div>
                <div className="admxp-detail-grid">
                  <div><span>Payment ID</span><strong>{selectedPayment._id}</strong></div>
                  <div><span>Status</span><strong>{selectedPayment.status}</strong></div>
                  <div><span>Type</span><strong>{selectedPayment.payment_type}</strong></div>
                  <div><span>Amount</span><strong>{formatCurrency(selectedPayment.amount)}</strong></div>
                  <div><span>Razorpay Order</span><strong>{selectedPayment.razorpay_order_id || 'N/A'}</strong></div>
                  <div><span>Razorpay Payment</span><strong>{selectedPayment.razorpay_payment_id || 'N/A'}</strong></div>
                </div>
                {selectedPayment.order_id && (
                  <div className="admxp-order-card">
                    <div className="admxp-order-line"><span>Order</span><strong>{selectedPayment.order_id._id}</strong></div>
                    <div className="admxp-order-line"><span>Order Status</span><strong>{selectedPayment.order_id.status}</strong></div>
                    <div className="admxp-order-line"><span>Route</span><strong>{selectedPayment.order_id.pickup?.city || 'N/A'}{' -> '}{selectedPayment.order_id.delivery?.city || 'N/A'}</strong></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
