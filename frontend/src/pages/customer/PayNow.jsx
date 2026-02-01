import React, { useMemo, useState, useCallback } from 'react';
import { replace, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/PayNow.css';
import { useDispatch } from 'react-redux';
import { confirmDelivery } from '../../store/slices/ordersSlice';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../utils/currency';

const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

/**
 * PayNow component contract
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
  const dispatch = useDispatch();

  // Read from navigation state when available, else fall back to query params
  const stateOrderId = location.state?.orderId;
  const stateAmount = location.state?.amount;
  const qpOrderId = searchParams.get('orderId');
  const qpAmount = searchParams.get('amount');

  const orderId = propOrderId || stateOrderId || qpOrderId || '';
  const amount = useMemo(() => {
    // Prefer amount from props > state > query param; default 0
    const raw = propAmount ?? stateAmount ?? (qpAmount ? Number(qpAmount) : 0);
    return Number.isFinite(raw) ? raw : 0;
  }, [propAmount, stateAmount, qpAmount]);

  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [netBank, setNetBank] = useState('HDFC');
  const [upi, setUpi] = useState('');
  const [errors, setErrors] = useState({}); // field -> message

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
      } else {
        const [mmStr, yyStr] = card.expiry.split('/');
        const mm = Number(mmStr);
        const yy = Number(yyStr);
        if (mm < 1 || mm > 12) {
          nextErrors.cardExpiry = 'Invalid month';
        } else {
          const now = new Date();
          const currentYY = Number(String(now.getFullYear()).slice(-2));
          const currentMM = now.getMonth() + 1;
          if (yy < currentYY || (yy === currentYY && mm < currentMM)) {
            nextErrors.cardExpiry = 'Card expired';
          }
        }
      }
      if (!/^\d{3,4}$/.test(card.cvv)) nextErrors.cardCvv = 'CVV must be 3-4 digits';
    }
    if (method === 'upi') {
      if (!/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
        nextErrors.upi = 'Invalid UPI handle';
      }
    }
    // Netbanking: ensure selection exists
    if (method === 'netbanking' && !netBank) {
      nextErrors.netBank = 'Select a bank';
    }
    setErrors(nextErrors);
    return nextErrors;
  }, [method, card, upi, netBank, orderId]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleConfirmDelivery = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    try {
      await dispatch(confirmDelivery({ orderId })).unwrap();
      showNotification({ message: 'Delivery Confirmed', type: 'success' });
      navigate('/customer/orders', { replace: true });
    } catch (err) {
      showNotification({ message: 'Unable to Process Payment', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const transactionId = useMemo(() => generateTransactionId(), []);

  return (
    <main className="paynow-container">
      <div className="payment-card">
        <div className="icon">✔</div>
        <h1>Payment Confirmation</h1>
        <div className="details">
          <p>Amount: <span className="amount">{formatCurrency(amount || 0)}</span></p>
          <p>Order ID: <span>{orderId || '—'}</span></p>
          {errors.orderId && <p className="field-error">{errors.orderId}</p>}
          <p>Transaction ID: <span className="txid">{transactionId}</span></p>
        </div>

        {/* Dummy payment flow */}
        <div className="pay-methods">
          <div className="method-switch">
            <label>
              <input type="radio" name="paymethod" value="card" checked={method === 'card'} onChange={() => setMethod('card')} />
              Card
            </label>
            <label>
              <input type="radio" name="paymethod" value="netbanking" checked={method === 'netbanking'} onChange={() => setMethod('netbanking')} />
              NetBanking
            </label>
            <label>
              <input type="radio" name="paymethod" value="upi" checked={method === 'upi'} onChange={() => setMethod('upi')} />
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
                maxLength={19}
                className={errors.cardNumber ? 'is-invalid' : ''}
                onBlur={validate}
              />
              {errors.cardNumber && <div className="field-error">{errors.cardNumber}</div>}
              <input
                type="text"
                placeholder="Name on Card"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                className={errors.cardName ? 'is-invalid' : ''}
                onBlur={validate}
              />
              {errors.cardName && <div className="field-error">{errors.cardName}</div>}
              <div className="row">
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  maxLength={5}
                  className={errors.cardExpiry ? 'is-invalid' : ''}
                  onBlur={validate}
                />
                <input
                  type="password"
                  placeholder="CVV"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  maxLength={4}
                  className={errors.cardCvv ? 'is-invalid' : ''}
                  onBlur={validate}
                />
              </div>
              {(errors.cardExpiry || errors.cardCvv) && (
                <div className="field-error">
                  {errors.cardExpiry || errors.cardCvv}
                </div>
              )}
            </div>
          )}

          {method === 'netbanking' && (
            <div className="netbanking-form">
              <select
                value={netBank}
                onChange={(e) => setNetBank(e.target.value)}
                className={errors.netBank ? 'is-invalid' : ''}
                onBlur={validate}
              >
                <option value="">Select Bank</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="AXIS">Axis Bank</option>
                <option value="KOTAK">Kotak Mahindra Bank</option>
              </select>
              {errors.netBank && <div className="field-error">{errors.netBank}</div>}
            </div>
          )}

          {method === 'upi' && (
            <div className="upi-form">
              <input
                type="text"
                placeholder="yourname@upi"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                className={errors.upi ? 'is-invalid' : ''}
                onBlur={validate}
              />
              {errors.upi && <div className="field-error">{errors.upi}</div>}
            </div>
          )}
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={handleConfirmDelivery} disabled={loading || !orderId || hasErrors}>
            {loading ? 'Confirming...' : 'Confirm Payment'}
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)} disabled={loading}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
