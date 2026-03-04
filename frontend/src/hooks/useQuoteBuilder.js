import { useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { submitBid } from '../store/slices/bidsSlice';
import { useNotification } from '../context/NotificationContext';

const EMPTY_QUOTE = {
  transportation_charges: '',
  packing_cost: '',
  loading_charges: '',
  toll_cost: '',
  octroi_entry_tax: '',
  risk_rate_percent: '',
  risk_on_declared_value: '',
  gst_rate_percent: 18,
  storage_charges: '',
  notes: '',
  // "Included" flags — when true, the charge is bundled into transportation
  packing_included: false,
  loading_included: false,
};

export function useQuoteBuilder(order) {
  const dispatch = useDispatch();
  const { submitting } = useSelector((s) => s.bids);
  const { showSuccess, showError } = useNotification();

  const [form, setForm] = useState({ ...EMPTY_QUOTE });
  const [customItems, setCustomItems] = useState([]); // { label, amount }

  // ── helpers ──
  const num = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  // ── computed values ──
  const riskAmount = useMemo(() => {
    const rate = num(form.risk_rate_percent) / 100;
    const declared = num(form.risk_on_declared_value) || num(order?.cargo_value);
    return Math.round(rate * declared);
  }, [form.risk_rate_percent, form.risk_on_declared_value, order?.cargo_value]);

  const subtotal = useMemo(() => {
    let total = 0;
    total += num(form.transportation_charges);
    if (!form.packing_included) total += num(form.packing_cost);
    if (!form.loading_included) total += num(form.loading_charges);
    total += num(form.toll_cost);
    total += num(form.octroi_entry_tax);
    total += riskAmount;
    total += num(form.storage_charges);
    customItems.forEach((ci) => (total += num(ci.amount)));
    return Math.round(total);
  }, [form, customItems, riskAmount]);

  const gstAmount = useMemo(() => {
    const rate = num(form.gst_rate_percent) / 100;
    return Math.round(subtotal * rate);
  }, [subtotal, form.gst_rate_percent]);

  const grandTotal = useMemo(() => subtotal + gstAmount, [subtotal, gstAmount]);

  // ── event handlers ──
  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleIncluded = useCallback((field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const addCustomItem = useCallback(() => {
    if (customItems.length >= 5) {
      showError('Maximum 5 custom charges allowed');
      return;
    }
    setCustomItems((prev) => [...prev, { label: '', amount: '' }]);
  }, [customItems.length, showError]);

  const updateCustomItem = useCallback((index, field, value) => {
    setCustomItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const removeCustomItem = useCallback((index) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── validation ──
  const validate = useCallback(() => {
    if (!num(form.transportation_charges)) {
      showError('Transportation charges are required');
      return false;
    }
    if (order?.max_price && grandTotal >= order.max_price) {
      showError(`Total quote (₹${grandTotal.toLocaleString('en-IN')}) must be less than max price (₹${order.max_price.toLocaleString('en-IN')})`);
      return false;
    }
    if (grandTotal <= 0) {
      showError('Total quote must be greater than ₹0');
      return false;
    }
    for (const ci of customItems) {
      if (!ci.label.trim()) {
        showError('All custom charge items must have a label');
        return false;
      }
    }
    return true;
  }, [form, grandTotal, order, customItems, showError]);

  // ── submit ──
  const submitQuote = useCallback(async () => {
    if (!validate()) return false;

    const quoteBreakdown = {
      transportation_charges: num(form.transportation_charges),
      packing_cost: form.packing_included ? 0 : num(form.packing_cost),
      loading_charges: form.loading_included ? 0 : num(form.loading_charges),
      toll_cost: num(form.toll_cost),
      octroi_entry_tax: num(form.octroi_entry_tax),
      risk_coverage: {
        rate_percent: num(form.risk_rate_percent),
        on_declared_value: num(form.risk_on_declared_value) || num(order?.cargo_value),
        amount: riskAmount,
      },
      gst: {
        rate_percent: num(form.gst_rate_percent),
        amount: gstAmount,
      },
      storage_charges: num(form.storage_charges),
      custom_items: customItems
        .filter((ci) => ci.label.trim() && num(ci.amount) > 0)
        .map((ci) => ({ label: ci.label.trim(), amount: num(ci.amount) })),
      packing_included: form.packing_included,
      loading_included: form.loading_included,
    };

    try {
      await dispatch(
        submitBid({
          orderId: order._id,
          bidAmount: grandTotal,
          notes: form.notes || '',
          quoteBreakdown,
        })
      ).unwrap();

      showSuccess('Quote submitted successfully!');
      return true;
    } catch (err) {
      showError(err || 'Failed to submit quote');
      return false;
    }
  }, [validate, form, customItems, riskAmount, gstAmount, grandTotal, order, dispatch, showSuccess, showError]);

  return {
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
  };
}
