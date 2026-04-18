import walletRepo from '../repositories/walletRepo.js';
import cashoutRepo from '../repositories/cashoutRepo.js';
import Transporter from '../models/transporter.js';
import { AppError } from '../utils/misc.js';

const COMMISSION_RATE = 0.10; // 10%
const MIN_CASHOUT = 100;      // ₹100 minimum

/**
 * Credit a transporter's wallet when an order is completed.
 * Idempotent — safe to call multiple times with same orderId.
 */
const creditOrderEarnings = async (transporterId, orderId, amount) => {
  if (!amount || amount <= 0) return;
  return walletRepo.creditOrderEarnings(transporterId, orderId, amount);
};

/**
 * Get the transporter's wallet summary (balance + bank details).
 */
const getWallet = async (transporterId) => {
  const [wallet, transporter] = await Promise.all([
    walletRepo.findOrCreateWallet(transporterId),
    Transporter.findById(transporterId).select('name email bankDetails').lean(),
  ]);
  return { wallet, bankDetails: transporter?.bankDetails || null };
};

/**
 * Paginated transaction list for the transporter.
 */
const getTransactions = async (transporterId, queryParams) => {
  return walletRepo.getTransactions(transporterId, queryParams);
};

/**
 * Transporter requests a cashout.
 *
 * Rules:
 *  - Can request partial amount or full balance.
 *  - Minimum ₹100.
 *  - 10% commission deducted at cashout time.
 *  - Wallet is debited immediately; CashoutRequest starts in "Processing".
 *  - A pending cashout blocks further requests.
 */
const requestCashout = async (transporterId, requestedAmount) => {
  const wallet = await walletRepo.findOrCreateWallet(transporterId);
  const balance = wallet.balance;

  const requestValue = Number(requestedAmount);
  if (!requestValue || requestValue < MIN_CASHOUT) {
    throw new AppError(
      400, 'InvalidOperation',
      `Minimum cashout amount is ₹${MIN_CASHOUT}.`,
      'ERR_MIN_CASHOUT',
    );
  }

  if (requestValue > balance) {
    throw new AppError(
      400, 'InvalidOperation',
      `Insufficient wallet balance. You requested ₹${requestValue} but have ₹${balance}.`,
      'ERR_INSUFFICIENT_BALANCE',
    );
  }

  // Block if there is already an in-flight cashout
  const { items: pending } = await cashoutRepo.listCashouts(transporterId, { page: 1, limit: 1 });
  const hasInflight = pending.some(r => ['Pending', 'Processing'].includes(r.status));
  if (hasInflight) {
    throw new AppError(
      409, 'ConflictError',
      'You already have a cashout in progress. Please wait for it to be processed.',
      'ERR_CASHOUT_IN_PROGRESS',
    );
  }

  const commissionAmount = Math.round(requestValue * COMMISSION_RATE * 100) / 100;
  const payableAmount = Math.round((requestValue - commissionAmount) * 100) / 100;

  // Snapshot bank details at request time
  const transporter = await Transporter.findById(transporterId).select('bankDetails').lean();
  const bankDetailsSnapshot = transporter?.bankDetails || null;

  // Create the cashout record first (Processing since we auto-deduct)
  const cashout = await cashoutRepo.createCashout({
    transporter_id: transporterId,
    wallet_id: wallet._id,
    requested_amount: requestValue,
    commission_amount: commissionAmount,
    payable_amount: payableAmount,
    status: 'Processing',
    bank_details_snapshot: bankDetailsSnapshot,
  });

  // Debit the wallet immediately
  await walletRepo.debitWallet(
    wallet._id,
    requestValue,
    cashout._id,
    `Cashout request #${cashout._id} — commission ₹${commissionAmount} applied`,
  );

  // TODO: Initiate RazorpayX payout here when credentials are available.
  // On RazorpayX webhook success → call walletService.markCashoutProcessed(cashout._id, razorpayPayoutId)
  // For now the cashout stays in "Processing" until manually/webhook driven.

  return { cashout, commissionAmount, payableAmount };
};

/**
 * Called by RazorpayX webhook (or manually during testing) to mark a cashout as Processed.
 */
const markCashoutProcessed = async (cashoutId, razorpayPayoutId = null) => {
  const cashout = await cashoutRepo.findCashoutById(cashoutId);
  if (!cashout) throw new AppError(404, 'NotFound', 'Cashout not found', 'ERR_NOT_FOUND');
  if (cashout.status !== 'Processing') {
    throw new AppError(400, 'InvalidOperation', 'Cashout is not in Processing state', 'ERR_INVALID_OPERATION');
  }
  return cashoutRepo.updateCashoutStatus(cashoutId, 'Processed', {
    razorpay_payout_id: razorpayPayoutId,
  });
};

/**
 * Update transporter bank details.
 */
const updateBankDetails = async (transporterId, bankDetails) => {
  const { accountNumber, ifsc, upiId, beneficiaryName } = bankDetails;
  await Transporter.findByIdAndUpdate(transporterId, {
    bankDetails: { accountNumber, ifsc, upiId, beneficiaryName },
  });
  return { message: 'Bank details updated' };
};

export default {
  creditOrderEarnings,
  getWallet,
  getTransactions,
  requestCashout,
  markCashoutProcessed,
  updateBankDetails,
};
