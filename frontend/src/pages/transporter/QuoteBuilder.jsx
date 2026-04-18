import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useQuoteBuilder } from '../../hooks/useQuoteBuilder';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/QuoteBuilder.css';

export default function QuoteBuilder() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  // If user navigated here without passing order data, redirect back
  if (!order) {
    return (
      <>
        <Header />
        <div className="qb-wrapper">
          <div className="qb-container">
            <div className="qb-empty">
              <h2>Order data not found</h2>
              <p>Please go back to the Available Orders page and click "Create Quote" on an order.</p>
              <button className="qb-btn qb-btn--primary" onClick={() => navigate('/transporter/bid')}>
                Back to Available Orders
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return <QuoteForm order={order} navigate={navigate} />;
}

function QuoteForm({ order, navigate }) {
  const {
    form,
    customItems,
    handleChange,
    toggleIncluded,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
    subtotal,
    gstAmount,
    grandTotal,
    riskAmount,
    submitting,
    submitQuote,
  } = useQuoteBuilder(order);

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const truckTypeLabel = (t) => {
    const map = {
      van: 'Van',
      'truck-small': 'Small Truck',
      'truck-medium': 'Medium Truck',
      'truck-large': 'Large Truck',
      refrigerated: 'Refrigerated Truck',
      flatbed: 'Flatbed Truck',
      container: 'Container Truck',
      any: 'Any',
    };
    return map[t] || t || '—';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await submitQuote();
    if (ok) {
      navigate('/transporter/my-bids');
    }
  };

  let serialNo = 0;

  return (
    <>
      <Header />
      <div className="qb-wrapper">
        <div className="qb-container">
          {/* Back button + Title */}
          <div className="qb-header">
            <button className="qb-back-btn" onClick={() => navigate('/transporter/bid')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div>
              <h1 className="qb-title">Create Quotation</h1>
              <p className="qb-subtitle">Order #{order._id?.slice(-8)}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="qb-order-summary">
            <h3>Order Details</h3>
            <div className="qb-order-grid">
              <div><span className="qb-label">From</span><span>{order.pickup?.city}, {order.pickup?.state}</span></div>
              <div><span className="qb-label">To</span><span>{order.delivery?.city}, {order.delivery?.state}</span></div>
              <div><span className="qb-label">Distance</span><span>{order.distance} km</span></div>
              <div><span className="qb-label">Weight</span><span>{order.weight} kg</span></div>
              <div><span className="qb-label">Truck Type</span><span>{truckTypeLabel(order.truck_type)}</span></div>
              <div><span className="qb-label">Goods Type</span><span>{order.goods_type}</span></div>
              {order.cargo_value > 0 && (
                <div><span className="qb-label">Declared Value</span><span>{formatINR(order.cargo_value)}</span></div>
              )}
              {order.toll_cost > 0 && (
                <div><span className="qb-label">Est. Toll Cost</span><span>{formatINR(order.toll_cost)}</span></div>
              )}
              <div><span className="qb-label">Max Price (Ceiling)</span><span className="qb-max-price">{formatINR(order.max_price)}</span></div>
            </div>
          </div>

          {/* Quote Form */}
          <form className="qb-form" onSubmit={handleSubmit}>
            <table className="qb-table">
              <thead>
                <tr>
                  <th className="qb-col-sno">S.No</th>
                  <th className="qb-col-particular">Particular</th>
                  <th className="qb-col-charges">Charges (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Transportation Charges */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Transportation Charges <span className="qb-required">*</span></div>
                    <div className="qb-item-hint">Core freight cost for the shipment</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="qb-input"
                      placeholder="e.g. 15000"
                      value={form.transportation_charges}
                      onChange={(e) => handleChange('transportation_charges', e.target.value)}
                      min="0"
                      required
                    />
                  </td>
                </tr>

                {/* 2. Packing Cost */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Packing Cost</div>
                    <div className="qb-item-hint">Wrapping, boxing, and protective materials</div>
                  </td>
                  <td>
                    <div className="qb-input-group">
                      {form.packing_included ? (
                        <span className="qb-included-badge">Included</span>
                      ) : (
                        <input
                          type="number"
                          className="qb-input"
                          placeholder="0"
                          value={form.packing_cost}
                          onChange={(e) => handleChange('packing_cost', e.target.value)}
                          min="0"
                        />
                      )}
                      <label className="qb-toggle">
                        <input
                          type="checkbox"
                          checked={form.packing_included}
                          onChange={() => toggleIncluded('packing_included')}
                        />
                        <span className="qb-toggle-text">Included</span>
                      </label>
                    </div>
                  </td>
                </tr>

                {/* 3. Loading Charges */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Loading Charges</div>
                    <div className="qb-item-hint">Labor for loading at pickup point</div>
                  </td>
                  <td>
                    <div className="qb-input-group">
                      {form.loading_included ? (
                        <span className="qb-included-badge">Included</span>
                      ) : (
                        <input
                          type="number"
                          className="qb-input"
                          placeholder="0"
                          value={form.loading_charges}
                          onChange={(e) => handleChange('loading_charges', e.target.value)}
                          min="0"
                        />
                      )}
                      <label className="qb-toggle">
                        <input
                          type="checkbox"
                          checked={form.loading_included}
                          onChange={() => toggleIncluded('loading_included')}
                        />
                        <span className="qb-toggle-text">Included</span>
                      </label>
                    </div>
                  </td>
                </tr>

                {/* 4. Toll Cost */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Toll Cost</div>
                    <div className="qb-item-hint">
                      Toll charges along the route
                      {order.toll_cost > 0 && (
                        <span className="qb-hint-ref"> (est. {formatINR(order.toll_cost)})</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="qb-input"
                      placeholder={order.toll_cost > 0 ? String(order.toll_cost) : '0'}
                      value={form.toll_cost}
                      onChange={(e) => handleChange('toll_cost', e.target.value)}
                      min="0"
                    />
                  </td>
                </tr>

                {/* 5. Octroi / Entry Tax */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Octroi / Entry Tax</div>
                    <div className="qb-item-hint">State entry taxes as applicable</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="qb-input"
                      placeholder="As actual"
                      value={form.octroi_entry_tax}
                      onChange={(e) => handleChange('octroi_entry_tax', e.target.value)}
                      min="0"
                    />
                  </td>
                </tr>

                {/* 8. Risk / Transit Insurance */}
                <tr className="qb-row-risk">
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Transit Risk / Insurance</div>
                    <div className="qb-item-hint">Coverage against loss or damage during transit</div>
                  </td>
                  <td>
                    <div className="qb-risk-inputs">
                      <div className="qb-risk-row">
                        <label>Rate %</label>
                        <input
                          type="number"
                          className="qb-input qb-input--small"
                          placeholder="e.g. 1.5"
                          value={form.risk_rate_percent}
                          onChange={(e) => handleChange('risk_rate_percent', e.target.value)}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div className="qb-risk-row">
                        <label>On Declared Value</label>
                        <input
                          type="number"
                          className="qb-input qb-input--small"
                          value={order?.cargo_value || 0}
                          min="0"
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="qb-risk-result">
                        = {formatINR(riskAmount)}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 9. GST */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">GST</div>
                    <div className="qb-item-hint">Goods and Services Tax on subtotal</div>
                  </td>
                  <td>
                    <div className="qb-gst-inputs">
                      <select
                        className="qb-select"
                        value={form.gst_rate_percent}
                        onChange={(e) => handleChange('gst_rate_percent', Number(e.target.value))}
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                      <span className="qb-gst-computed">= {formatINR(gstAmount)}</span>
                    </div>
                  </td>
                </tr>

                {/* 10. Storage Charges */}
                <tr>
                  <td>{++serialNo}.</td>
                  <td>
                    <div className="qb-item-label">Storage Charges</div>
                    <div className="qb-item-hint">Temporary warehousing / storage if needed</div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="qb-input"
                      placeholder="0 or N/A"
                      value={form.storage_charges}
                      onChange={(e) => handleChange('storage_charges', e.target.value)}
                      min="0"
                    />
                  </td>
                </tr>

                {/* Custom Items */}
                {customItems.map((ci, idx) => (
                  <tr key={`custom-${idx}`} className="qb-row-custom">
                    <td>{++serialNo}.</td>
                    <td>
                      <input
                        type="text"
                        className="qb-input qb-input--label"
                        placeholder="Custom charge name"
                        value={ci.label}
                        onChange={(e) => updateCustomItem(idx, 'label', e.target.value)}
                        maxLength={60}
                      />
                    </td>
                    <td>
                      <div className="qb-input-group">
                        <input
                          type="number"
                          className="qb-input"
                          placeholder="0"
                          value={ci.amount}
                          onChange={(e) => updateCustomItem(idx, 'amount', e.target.value)}
                          min="0"
                        />
                        <button
                          type="button"
                          className="qb-btn-remove"
                          onClick={() => removeCustomItem(idx)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Add Custom Row Button */}
                {customItems.length < 5 && (
                  <tr className="qb-row-add">
                    <td></td>
                    <td colSpan={2}>
                      <button type="button" className="qb-btn-add" onClick={addCustomItem}>
                        + Add Custom Charge
                      </button>
                    </td>
                  </tr>
                )}

                {/* Subtotal */}
                <tr className="qb-row-subtotal">
                  <td></td>
                  <td><strong>Subtotal (before GST)</strong></td>
                  <td><strong>{formatINR(subtotal)}</strong></td>
                </tr>

                {/* GST Amount */}
                <tr className="qb-row-gst-total">
                  <td></td>
                  <td>GST @ {form.gst_rate_percent}%</td>
                  <td>{formatINR(gstAmount)}</td>
                </tr>

                {/* Grand Total */}
                <tr className="qb-row-total">
                  <td></td>
                  <td><strong>Total Quote</strong></td>
                  <td>
                    <strong className={`qb-grand-total ${grandTotal >= (order?.max_price || Infinity) ? 'qb-grand-total--over' : ''}`}>
                      {formatINR(grandTotal)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Price Validation Warning */}
            {order?.max_price && grandTotal >= order.max_price && (
              <div className="qb-warning">
                <TriangleAlert size={18} aria-hidden="true" />
                <span>
                  Your total ({formatINR(grandTotal)}) exceeds the maximum price ceiling ({formatINR(order.max_price)}). Please reduce your charges.
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="qb-notes-section">
              <label className="qb-notes-label">Additional Notes / Remarks</label>
              <textarea
                className="qb-textarea"
                rows={3}
                placeholder="Any additional information about your quotation..."
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="qb-actions">
              <button
                type="button"
                className="qb-btn qb-btn--secondary"
                onClick={() => navigate('/transporter/bid')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="qb-btn qb-btn--primary"
                disabled={submitting || (order?.max_price && grandTotal >= order.max_price)}
              >
                {submitting ? 'Submitting...' : `Submit Quote — ${formatINR(grandTotal)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
