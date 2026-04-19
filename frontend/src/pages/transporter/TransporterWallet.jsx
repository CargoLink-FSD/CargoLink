import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWallet,
  fetchTransactions,
  fetchCashoutHistory,
  submitCashoutRequest,
  saveBankDetails,
  clearCashoutState,
  clearBankDetailsSuccess,
} from '../../store/slices/walletSlice';
import Header from '../../components/common/Header';
import './TransporterWallet.css';

const COMMISSION = 0.10;

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const StatusBadge = ({ status }) => {
  const map = {
    Processing: 'badge-orange',
    Processed:  'badge-green',
    Rejected:   'badge-red',
    Pending:    'badge-blue',
  };
  return <span className={`status-badge ${map[status] || 'badge-blue'}`}>{status}</span>;
};

export default function TransporterWallet() {
  const dispatch = useDispatch();
  const listStartRef = useRef(null);
  const {
    wallet, bankDetails,
    transactions, transactionsMeta, txLoading,
    cashouts, cashoutsMeta, cashoutLoading,
    loading, cashoutSubmitting, cashoutError, cashoutSuccess,
    bankDetailsLoading, bankDetailsSuccess,
  } = useSelector((s) => s.wallet);

  const [activeTab, setActiveTab] = useState('overview');
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ accountNumber: '', ifsc: '', upiId: '', beneficiaryName: '' });
  const [txPage, setTxPage] = useState(1);
  const [coPage, setCoPage] = useState(1);
  const [customCashoutAmount, setCustomCashoutAmount] = useState('');

  useEffect(() => {
    dispatch(fetchWallet());
    dispatch(fetchTransactions({ page: txPage }));
    dispatch(fetchCashoutHistory({ page: coPage }));
  }, [dispatch]);

  useEffect(() => {
    if (bankDetails) {
      setBankForm({
        accountNumber: bankDetails.accountNumber || '',
        ifsc: bankDetails.ifsc || '',
        upiId: bankDetails.upiId || '',
        beneficiaryName: bankDetails.beneficiaryName || '',
      });
    }
  }, [bankDetails]);

  useEffect(() => {
    if (cashoutSuccess) {
      setShowCashoutModal(false);
      dispatch(fetchWallet());
      dispatch(fetchTransactions({ page: 1 }));
      dispatch(fetchCashoutHistory({ page: 1 }));
    }
  }, [cashoutSuccess, dispatch]);

  useEffect(() => {
    if (bankDetailsSuccess) {
      setShowBankModal(false);
      dispatch(fetchWallet());
      setTimeout(() => dispatch(clearBankDetailsSuccess()), 2000);
    }
  }, [bankDetailsSuccess, dispatch]);

  const balance = wallet?.balance || 0;
  const commission = Math.round(balance * COMMISSION * 100) / 100;
  const payout = Math.round((balance - commission) * 100) / 100;

  useEffect(() => {
    if (showCashoutModal) {
      setCustomCashoutAmount(balance.toString());
    }
  }, [showCashoutModal, balance]);

  const requestAmt = Number(customCashoutAmount) || 0;
  const calcCommission = Math.round(requestAmt * COMMISSION * 100) / 100;
  const calcPayout = Math.round((requestAmt - calcCommission) * 100) / 100;

  const handleCashout = () => {
    dispatch(clearCashoutState());
    dispatch(submitCashoutRequest(requestAmt));
  };

  const handleBankSave = (e) => {
    e.preventDefault();
    dispatch(saveBankDetails(bankForm));
  };

  const scrollToListStart = () => {
    const anchor = listStartRef.current;
    if (!anchor) return;

    const y = anchor.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const changeTxPage = (p) => {
    if (p === txPage) return;
    setTxPage(p);
    dispatch(fetchTransactions({ page: p }));
    requestAnimationFrame(scrollToListStart);
  };

  const changeCoPage = (p) => {
    if (p === coPage) return;
    setCoPage(p);
    dispatch(fetchCashoutHistory({ page: p }));
    requestAnimationFrame(scrollToListStart);
  };

  if (loading && !wallet) {
    return (
      <>
        <Header />
        <div className="wallet-page">
          <div className="wallet-loading">
            <div className="wallet-spinner" />
            <p>Loading wallet…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div ref={listStartRef} className="wallet-page">
        {/* ── Header ── */}
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 14C16 14.5523 15.5523 15 15 15C14.4477 15 14 14.5523 14 14C14 13.4477 14.4477 13 15 13C15.5523 13 16 13.4477 16 14Z" fill="currentColor"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="wallet-title">My Wallet</h1>
            <p className="wallet-subtitle">Manage your earnings and cashouts</p>
          </div>
        </div>
        <button className="btn-bank" onClick={() => setShowBankModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="21" width="20" height="2"/><path d="M3 10V21"/><path d="M21 10V21"/><path d="M7 10V21"/><path d="M11 10V21"/><path d="M15 10V21"/><path d="M19 10V21"/><polygon points="2,10 12,2 22,10"/></svg> Bank Details
        </button>
      </div>

      {/* ── Balance Cards ── */}
      <div className="wallet-cards">
        <div className="balance-card balance-card--primary">
          <div className="balance-card-label">Available Balance</div>
          <div className="balance-card-amount">{formatCurrency(balance)}</div>
          <div className="balance-card-sub">Gross earnings (before commission)</div>
          <button
            className="btn-cashout"
            onClick={() => { dispatch(clearCashoutState()); setShowCashoutModal(true); }}
            disabled={balance < 100}
          >
            {balance < 100 ? `Need ₹${100 - balance} more` : 'Request Cashout'}
          </button>
        </div>

        <div className="balance-card balance-card--secondary">
          <div className="balance-card-label">Estimated Payout</div>
          <div className="balance-card-amount balance-card-amount--green">{formatCurrency(payout)}</div>
          <div className="balance-card-sub">After 10% CargoLink commission (₹{commission.toFixed(2)})</div>
        </div>

        <div className="balance-card balance-card--secondary">
          <div className="balance-card-label">Total Cashouts</div>
          <div className="balance-card-amount">{cashoutsMeta?.total ?? '--'}</div>
          <div className="balance-card-sub">Lifetime cashout requests</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="wallet-tabs">
        {['overview', 'transactions', 'cashouts'].map(tab => (
          <button
            key={tab}
            className={`wallet-tab${activeTab === tab ? ' wallet-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && <span className="tab-content"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Overview</span>}
            {tab === 'transactions' && <span className="tab-content"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Transactions</span>}
            {tab === 'cashouts' && <span className="tab-content"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> Cashout History</span>}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="wallet-section">
          <h2 className="section-title">Recent Transactions</h2>
          {txLoading ? <div className="wallet-spinner-sm" /> : (
            <div className="tx-list">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx._id} className={`tx-row tx-row--${tx.type}`}>
                  <div className="tx-icon">
                    {tx.type === 'credit' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    )}
                  </div>
                  <div className="tx-info">
                    <span className="tx-desc">{tx.description}</span>
                    <span className="tx-date">{formatDate(tx.createdAt)}</span>
                  </div>
                  <div className={`tx-amount tx-amount--${tx.type}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="wallet-empty">No transactions yet. Complete a trip to earn!</div>
              )}
            </div>
          )}

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Cashout History</h2>
          {cashoutLoading ? <div className="wallet-spinner-sm" /> : (
            <div className="tx-list">
              {cashouts.slice(0, 3).map(co => (
                <div key={co._id} className="cashout-row">
                  <div className="cashout-info">
                    <span className="cashout-amount">{formatCurrency(co.requested_amount)}</span>
                    <StatusBadge status={co.status} />
                  </div>
                  <div className="cashout-breakdown">
                    <span>Commission: {formatCurrency(co.commission_amount)}</span>
                    <span>Payout: <strong>{formatCurrency(co.payable_amount)}</strong></span>
                    <span className="tx-date">{formatDate(co.createdAt)}</span>
                  </div>
                </div>
              ))}
              {cashouts.length === 0 && <div className="wallet-empty">No cashouts yet.</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: All Transactions ── */}
      {activeTab === 'transactions' && (
        <div className="wallet-section">
          <h2 className="section-title">All Transactions</h2>
          {txLoading ? <div className="wallet-spinner-sm" /> : (
            <>
              <div className="tx-list">
                {transactions.map(tx => (
                  <div key={tx._id} className={`tx-row tx-row--${tx.type}`}>
                    <div className="tx-icon">
                      {tx.type === 'credit' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                      )}
                    </div>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-date">{formatDate(tx.createdAt)}</span>
                    </div>
                    <div className={`tx-amount tx-amount--${tx.type}`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <div className="wallet-empty">No transactions found.</div>}
              </div>
              {transactionsMeta.pages > 1 && (
                <div className="pagination">
                  {Array.from({ length: transactionsMeta.pages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-btn${txPage === p ? ' page-btn--active' : ''}`} onClick={() => changeTxPage(p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Cashout History ── */}
      {activeTab === 'cashouts' && (
        <div className="wallet-section">
          <h2 className="section-title">Cashout Requests</h2>
          {cashoutLoading ? <div className="wallet-spinner-sm" /> : (
            <>
              <div className="cashout-table-wrap">
                <table className="cashout-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Requested</th>
                      <th>Commission (10%)</th>
                      <th>Payout (90%)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashouts.map(co => (
                      <tr key={co._id}>
                        <td>{formatDate(co.createdAt)}</td>
                        <td>{formatCurrency(co.requested_amount)}</td>
                        <td className="text-red">{formatCurrency(co.commission_amount)}</td>
                        <td className="text-green">{formatCurrency(co.payable_amount)}</td>
                        <td><StatusBadge status={co.status} /></td>
                      </tr>
                    ))}
                    {cashouts.length === 0 && (
                      <tr><td colSpan="5" className="wallet-empty">No cashout requests yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {cashoutsMeta.pages > 1 && (
                <div className="pagination">
                  {Array.from({ length: cashoutsMeta.pages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-btn${coPage === p ? ' page-btn--active' : ''}`} onClick={() => changeCoPage(p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Cashout Confirm Modal ── */}
      {showCashoutModal && (
        <div className="modal-overlay" onClick={() => { setShowCashoutModal(false); dispatch(clearCashoutState()); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> Request Cashout</h2>
            <p className="modal-sub">
              Choose your cashout amount. CargoLink applies a <strong>10% commission</strong>.<br/>
              <span style={{ color: '#059669', fontSize: '0.9rem', display: 'inline-block', marginTop: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                Funds will automatically be debited to your bank account within 2 days.
              </span>
            </p>

            <div className="bank-form" style={{ marginBottom: '16px' }}>
              <label>Amount to Withdraw (Max {formatCurrency(balance)})
                <input 
                  type="number" 
                  step="0.01" 
                  min="100" 
                  max={balance} 
                  value={customCashoutAmount} 
                  onChange={e => setCustomCashoutAmount(e.target.value)} 
                />
              </label>
            </div>

            <div className="cashout-breakdown-card">
              <div className="breakdown-row">
                <span>Requested</span>
                <span>{formatCurrency(requestAmt)}</span>
              </div>
              <div className="breakdown-row breakdown-row--minus">
                <span>Commission (10%)</span>
                <span>- {formatCurrency(calcCommission)}</span>
              </div>
              <div className="breakdown-row breakdown-row--total">
                <span>You Receive</span>
                <span>{formatCurrency(calcPayout)}</span>
              </div>
            </div>

            {cashoutError && <div className="wallet-error">{cashoutError}</div>}
            {!bankDetails?.accountNumber && !bankDetails?.upiId && (
              <div className="wallet-warn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> No bank details on file. Add them for seamless payouts.</div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowCashoutModal(false); dispatch(clearCashoutState()); }}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleCashout} disabled={cashoutSubmitting}>
                {cashoutSubmitting ? 'Processing…' : 'Confirm Cashout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bank Details Modal ── */}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="21" width="20" height="2"/><path d="M3 10V21"/><path d="M21 10V21"/><path d="M7 10V21"/><path d="M11 10V21"/><path d="M15 10V21"/><path d="M19 10V21"/><polygon points="2,10 12,2 22,10"/></svg> Bank / UPI Details</h2>
            <p className="modal-sub">These details will be used for RazorpayX payouts.</p>
            <form onSubmit={handleBankSave} className="bank-form">
              <label>Beneficiary Name
                <input value={bankForm.beneficiaryName} onChange={e => setBankForm(p => ({ ...p, beneficiaryName: e.target.value }))} placeholder="Full name on account" />
              </label>
              <label>Account Number
                <input value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="e.g. 1234567890" />
              </label>
              <label>IFSC Code
                <input value={bankForm.ifsc} onChange={e => setBankForm(p => ({ ...p, ifsc: e.target.value.toUpperCase() }))} placeholder="e.g. HDFC0001234" />
              </label>
              <div className="bank-or">— OR —</div>
              <label>UPI ID
                <input value={bankForm.upiId} onChange={e => setBankForm(p => ({ ...p, upiId: e.target.value }))} placeholder="e.g. name@upi" />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowBankModal(false)}>Cancel</button>
                <button type="submit" className="btn-confirm" disabled={bankDetailsLoading}>
                  {bankDetailsLoading ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
