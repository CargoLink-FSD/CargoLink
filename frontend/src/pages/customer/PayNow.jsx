import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/PayNow.css';
import { useNotification } from '../../context/NotificationContext';
import { paymentAPI } from '../../api/payment';

/**
 * PayNow component — Razorpay integration, final payment only (no advance)
 * Props (optional):
 *  - orderId: string
 *  - amount: number
 * Precedence: props > navigation state > query params.
 */

export default function PayNow({ orderId: propOrderId, amount: propAmount }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Read from navigation state when available, else fall back to query params
  const stateOrderId = location.state?.orderId;
  const stateAmount = location.state?.amount;
  const qpOrderId = searchParams.get('orderId');
  const qpAmount = searchParams.get('amount');

  const orderId = propOrderId || stateOrderId || qpOrderId || '';
  const amount = useMemo(() => {
    const raw = propAmount ?? stateAmount ?? (qpAmount ? Number(qpAmount) : 0);
    return Number.isFinite(raw) ? raw : 0;
  }, [propAmount, stateAmount, qpAmount]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Razorpay checkout script
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePay = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order on backend
      const response = await paymentAPI.initiatePayment(orderId);
      const data = response.data;

      // 2. Open Razorpay checkout
      const options = {
        key: data.razorpay_key_id,
        amount: data.amount * 100,
        currency: data.currency || 'INR',
        name: 'CargoLink',
        description: `Payment for Order #${orderId}`,
        order_id: data.razorpay_order_id,
        handler: async (razorpayResponse) => {
          try {
            // 3. Verify payment on backend
            await paymentAPI.verifyPayment(orderId, {
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });
            showNotification({ message: 'Payment successful!', type: 'success' });
            navigate('/customer/orders', { replace: true });
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment verification failed');
            showNotification({ message: verifyErr.message || 'Payment verification failed', type: 'error' });
          }
        },
        prefill: {},
        theme: {
          color: '#2e7d32',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed');
        showNotification({ message: resp.error?.description || 'Payment failed', type: 'error' });
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Failed to initiate payment');
      showNotification({ message: err.message || 'Failed to initiate payment', type: 'error' });
      setLoading(false);
    }
  }, [orderId, navigate, showNotification]);

  return (
    <main className="paynow-container">
      <div className="payment-card">
        <div className="icon">💳</div>
        <h1>Payment</h1>
        <div className="details">
          <p>Amount: <span className="amount">₹ {Number(amount || 0).toLocaleString('en-IN')}</span></p>
          <p>Order ID: <span>{orderId || '—'}</span></p>
        </div>

        {error && (
          <div className="pay-methods">
            <div className="field-error">{error}</div>
          </div>
        )}

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={handlePay}
            disabled={loading || !orderId}
          >
            {loading ? 'Processing...' : `Pay ₹${Number(amount || 0).toLocaleString('en-IN')}`}
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}