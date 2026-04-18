import mongoose from 'mongoose';

const WalletTransactionSchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transporter',
      required: true,
    },
    // Used for idempotency on order-credit transactions.
    // Sparse so non-credit transactions don't conflict on null.
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    description: { type: String, default: '' },
    // cashout request id for debit transactions
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

// Prevent double-credit for the same order
WalletTransactionSchema.index(
  { wallet_id: 1, order_id: 1 },
  { unique: true, sparse: true, partialFilterExpression: { type: 'credit', order_id: { $ne: null } } },
);

WalletTransactionSchema.index({ wallet_id: 1, createdAt: -1 });
WalletTransactionSchema.index({ transporter_id: 1, createdAt: -1 });

export default mongoose.model('WalletTransaction', WalletTransactionSchema);
