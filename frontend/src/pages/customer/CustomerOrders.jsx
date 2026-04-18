import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomerOrders,
  deleteCustomerOrder,
  selectAllOrders,
  selectOrdersLoading,
  selectOrdersError,
} from "../../store/slices/ordersSlice";
import { useNotification } from "../../context/NotificationContext";
import OrderCard from "../../components/common/OrderCard";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import { getCancellationDues } from "../../api/orders";
import { paymentAPI } from "../../api/payment";
import "./CustomerOrders.css";

export default function CustomerOrders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const orders = useSelector(selectAllOrders);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [duesSummary, setDuesSummary] = useState(null);
  const [duesLoading, setDuesLoading] = useState(false);
  const debounceRef = useRef(null);

  const loadCancellationDues = useCallback(async () => {
    try {
      setDuesLoading(true);
      const summary = await getCancellationDues();
      setDuesSummary(summary);
    } catch (err) {
      setDuesSummary(null);
    } finally {
      setDuesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    dispatch(fetchCustomerOrders({ search: "", status: "all" }));
    loadCancellationDues();
  }, [dispatch, loadCancellationDues]);

  useEffect(() => {
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Debounced search — fires API call 400 ms after user stops typing
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        dispatch(fetchCustomerOrders({ search: value, status: statusFilter }));
      }, 400);
    },
    [dispatch, statusFilter]
  );

  // Status filter — immediate API call
  const handleStatusChange = useCallback(
    (e) => {
      const value = e.target.value;
      setStatusFilter(value);
      dispatch(fetchCustomerOrders({ search: searchInput, status: value }));
    },
    [dispatch, searchInput]
  );

  // Rating/review is handled in Order Details after final payment

  const handleCancelOrder = useCallback(async (orderId) => {
    const promptValue = window.prompt('Reason for cancellation (optional):');
    if (promptValue === null) return;
    const reasonText = promptValue ?? '';

    try {
      const result = await dispatch(deleteCustomerOrder({
        orderId,
        reasonCode: 'customer_requested',
        reasonText: reasonText.trim(),
      })).unwrap();

      const feeAmount = result?.cancellation?.feeAmount || 0;
      showNotification({
        type: 'success',
        message: feeAmount > 0
          ? `Order cancelled. INR ${feeAmount} added to your cancellation dues.`
          : 'Order cancelled successfully.',
      });

      loadCancellationDues();
    } catch (err) {
      showNotification({
        type: 'error',
        message: err?.message || 'Failed to cancel order',
      });
      loadCancellationDues();
    }
  }, [dispatch, showNotification, loadCancellationDues]);

  const handleSettleDues = useCallback(async () => {
    const outstanding = Number(duesSummary?.outstandingCancellationDues || 0);
    if (outstanding <= 0) return;

    if (!window.Razorpay) {
      showNotification({ type: 'error', message: 'Payment SDK is not loaded. Please refresh and try again.' });
      return;
    }

    try {
      setDuesLoading(true);
      const initiateResponse = await paymentAPI.initiateCancellationDuesPayment();
      const paymentData = initiateResponse.data;

      const options = {
        key: paymentData.razorpay_key_id,
        amount: Math.round(Number(paymentData.amount || 0) * 100),
        currency: paymentData.currency || 'INR',
        name: 'CargoLink',
        description: 'Cancellation dues settlement',
        order_id: paymentData.razorpay_order_id,
        handler: async (razorpayResponse) => {
          try {
            await paymentAPI.verifyCancellationDuesPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });
            showNotification({ type: 'success', message: 'Cancellation dues settled successfully.' });
            await loadCancellationDues();
          } catch (verifyErr) {
            showNotification({ type: 'error', message: verifyErr?.message || 'Payment verification failed' });
          } finally {
            setDuesLoading(false);
          }
        },
        theme: { color: '#2e7d32' },
        modal: {
          ondismiss: () => {
            setDuesLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        showNotification({ type: 'error', message: resp.error?.description || 'Payment failed' });
        setDuesLoading(false);
      });
      rzp.open();
    } catch (err) {
      showNotification({ type: 'error', message: err?.message || 'Failed to settle cancellation dues' });
      setDuesLoading(false);
    }
  }, [duesSummary, showNotification, loadCancellationDues]);

  const handleCompletePayment = useCallback((order) => {
    const amount = Number(order?.final_price || order?.max_price || 0);
    navigate(`/customer/paynow?orderId=${order?._id}&amount=${amount}`);
  }, [navigate]);

  return (
    <>
      <Header />
      <div className="customerOrders-container co-page">
        {/* ── Header ── */}
        <div className="co-header">
          <h1>My Orders</h1>
        </div>

        {Number(duesSummary?.outstandingCancellationDues || 0) > 0 && (
          <div className="co-empty" style={{ marginBottom: 16, textAlign: 'left' }}>
            <h3 style={{ marginBottom: 8 }}>Pending Cancellation Dues</h3>
            <p style={{ marginBottom: 8 }}>
              Outstanding: INR {Number(duesSummary.outstandingCancellationDues).toFixed(2)}
              {duesSummary?.gateMode ? ` | Gate: ${duesSummary.gateMode}` : ''}
            </p>
            <button className="btn btn-primary" onClick={handleSettleDues} disabled={duesLoading}>
              {duesLoading ? 'Processing...' : 'Settle Dues'}
            </button>
          </div>
        )}

        {/* ── Controls bar ── */}
        <div className="co-controls">
          <input
            className="co-search-input"
            type="text"
            placeholder="Search by city..."
            value={searchInput}
            onChange={handleSearchChange}
          />
          <select
            className="co-status-select"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="assigned">Assigned</option>
            <option value="scheduled">Scheduled</option>
            <option value="started">Started</option>
            <option value="in transit">In Transit</option>
            <option value="payment pending">Payment Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="co-loading">
            <div className="co-spinner" />
            <p>Loading orders…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="co-empty">
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && orders.length === 0 && (
          <div className="co-empty">
            <h3>No orders found</h3>
            <p>
              {searchInput || statusFilter !== "all"
                ? "Try a different search or filter."
                : "You haven't placed any orders yet."}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && orders.length > 0 && (
          <div className="co-grid">
            {orders.map((order) => (
              <div key={order._id} className="co-card-wrap">
                <OrderCard
                  order={order}
                  variant="customer"
                  onCancelOrder={handleCancelOrder}
                  onCompletePayment={handleCompletePayment}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
