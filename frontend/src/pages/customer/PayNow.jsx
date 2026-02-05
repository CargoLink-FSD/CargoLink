import React, { useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/PayNow.css';
import { useNotification } from '../../context/NotificationContext';
import { paymentAPI } from '../../api/payment'; // Updated to use your new API service

const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

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
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [netBank, setNetBank] = useState('HDFC');
  const [upi, setUpi] = useState('');
  const [errors, setErrors] = useState({});

  const validate = useCallback(() => {
    const nextErrors = {};
    if (!orderId) {
      nextErrors.orderId = 'Missing order id';
    }
    if (method === 'card') {
      const digits = card.number.replace(/\D/g, '');
      if (digits.length !== 16) nextErrors.cardNumber = 'Card number must be 16 digits';
      if (!card.name.trim()) nextErrors.cardName = 'Name required';
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
        nextErrors.cardExpiry = 'Expiry must be MM/YY';
      }
      if (!/^\d{3,4}$/.test(card.cvv)) nextErrors.cardCvv = 'CVV must be 3-4 digits';
    }
    if (method === 'upi' && !/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      nextErrors.upi = 'Invalid UPI handle';
    }
    if (method === 'netbanking' && !netBank) {
      nextErrors.netBank = 'Select a bank';
    }
    setErrors(nextErrors);
    return nextErrors;
  }, [method, card, upi, netBank, orderId]);

  const hasErrors = Object.keys(errors).length > 0;
  const transactionId = useMemo(() => generateTransactionId(), []);

  const handlePaymentSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      // Integration with backend: Processes payment and updates order status to 'Assigned'
      await paymentAPI.processPayment(orderId, {
        transactionId: transactionId,
        method: method.toUpperCase(),
      });

      showNotification({ message: 'Payment Successful! Your order is now assigned.', type: 'success' });
      
      // Redirect to orders page where they can see the assigned transporter
      navigate('/customer/orders', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Unable to Process Payment';
      showNotification({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="paynow-container">
      <div className="payment-card">
        <div className="icon">✔</div>
        <h1>Payment Confirmation</h1>
        <div className="details">
          <p>Amount: <span className="amount">₹ {Number(amount || 0).toLocaleString('en-IN')}</span></p>
          <p>Order ID: <span>{orderId || '—'}</span></p>
          {errors.orderId && <p className="field-error">{errors.orderId}</p>}
          <p>Transaction ID: <span className="txid">{transactionId}</span></p>
        </div>

        <div className="pay-methods">
          <div className="method-switch">
            <label>
              <input type="radio" value="card" checked={method === 'card'} onChange={() => setMethod('card')} />
              Card
            </label>
            <label>
              <input type="radio" value="netbanking" checked={method === 'netbanking'} onChange={() => setMethod('netbanking')} />
              NetBanking
            </label>
            <label>
              <input type="radio" value="upi" checked={method === 'upi'} onChange={() => setMethod('upi')} />
              UPI
            </label>
          </div>

          {method === 'card' && (
            <div className="card-form">
              <input
                type="text"
                placeholder="Card Number"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                maxLength={16}
                className={errors.cardNumber ? 'is-invalid' : ''}
              />
              <input
                type="text"
                placeholder="Name on Card"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                className={errors.cardName ? 'is-invalid' : ''}
              />
              <div className="row">
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  maxLength={5}
                />
                <input
                  type="password"
                  placeholder="CVV"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  maxLength={3}
                />
              </div>
            </div>
          )}

          {method === 'netbanking' && (
            <div className="netbanking-form">
              <select value={netBank} onChange={(e) => setNetBank(e.target.value)}>
                <option value="HDFC">HDFC Bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="ICICI">ICICI Bank</option>
              </select>
            </div>
          )}

          {method === 'upi' && (
            <div className="upi-form">
              <input
                type="text"
                placeholder="yourname@upi"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="actions">
          <button 
            className="btn btn-primary" 
            onClick={handlePaymentSubmit} 
            disabled={loading || !orderId || hasErrors}
          >
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}