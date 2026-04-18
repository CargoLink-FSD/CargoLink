import Wallet from '../models/wallet.js';
import WalletTransaction from '../models/walletTransaction.js';

/**
 * Find a transporter's wallet, creating one with zero balance if it doesn't exist.
 */
const findOrCreateWallet = async (transporterId) => {
  let wallet = await Wallet.findOne({ transporter_id: transporterId });
  if (!wallet) {
    wallet = await Wallet.create({ transporter_id: transporterId, balance: 0 });
  }
  return wallet;
};

/**
 * Credit a wallet for a completed order.
 * Idempotent — duplicate calls for the same orderId are silently ignored.
 * Returns { credited: boolean, transaction }
 */
const creditOrderEarnings = async (transporterId, orderId, amount) => {
  const wallet = await findOrCreateWallet(transporterId);

  // Attempt to create the transaction; unique index on (wallet_id, order_id) blocks duplicates.
  let transaction;
  try {
    transaction = await WalletTransaction.create({
      wallet_id: wallet._id,
      transporter_id: transporterId,
      order_id: orderId,
      amount,
      type: 'credit',
      description: `Earnings for order #${orderId}`,
    });
  } catch (err) {
    // Duplicate key → already credited, silently skip
    if (err.code === 11000) return { credited: false, transaction: null };
    throw err;
  }

  await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: amount } });
  return { credited: true, transaction };
};

/**
 * Debit a wallet (used when a cashout request is raised).
 */
const debitWallet = async (walletId, amount, referenceId, description) => {
  const transaction = await WalletTransaction.create({
    wallet_id: walletId,
    transporter_id: (await Wallet.findById(walletId)).transporter_id,
    amount,
    type: 'debit',
    description,
    reference_id: referenceId,
  });
  await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -amount } });
  return transaction;
};

/**
 * Paginated transaction list for a wallet.
 */
const getTransactions = async (transporterId, { page = 1, limit = 20 } = {}) => {
  const wallet = await findOrCreateWallet(transporterId);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    WalletTransaction.find({ wallet_id: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments({ wallet_id: wallet._id }),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
};

export default { findOrCreateWallet, creditOrderEarnings, debitWallet, getTransactions };
