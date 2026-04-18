import walletService from '../services/walletService.js';
import cashoutRepo from '../repositories/cashoutRepo.js';
import { AppError } from '../utils/misc.js';

// ── Transporter ────────────────────────────────────────────────────────────────

export async function getWallet(req, res, next) {
  try {
    const data = await walletService.getWallet(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getTransactions(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await walletService.getTransactions(req.user.id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function requestCashout(req, res, next) {
  try {
    const data = await walletService.requestCashout(req.user.id, req.body.amount);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateBankDetails(req, res, next) {
  try {
    const data = await walletService.updateBankDetails(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getCashoutHistory(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await cashoutRepo.listCashouts(req.user.id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ── RazorpayX webhook (future) ─────────────────────────────────────────────────

export async function razorpayxWebhook(req, res, next) {
  try {
    // TODO: verify webhook signature using X-Razorpay-Signature header
    const { payload } = req.body;
    const payout = payload?.payout?.entity;
    if (!payout) return res.json({ received: true });

    if (payout.status === 'processed') {
      // Find CashoutRequest by razorpay_payout_id (stored during requestCashout)
      const CashoutRequest = (await import('../models/cashoutRequest.js')).default;
      const cashout = await CashoutRequest.findOne({ razorpay_payout_id: payout.id });
      if (cashout && cashout.status === 'Processing') {
        await walletService.markCashoutProcessed(cashout._id, payout.id);
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
}
