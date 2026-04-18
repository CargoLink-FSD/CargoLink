import mongoose from 'mongoose';

const CashoutRequestSchema = new mongoose.Schema(
  {
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transporter',
      required: true,
    },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    requested_amount: { type: Number, required: true, min: 100 },
    commission_amount: { type: Number, required: true }, // 10%
    payable_amount: { type: Number, required: true },    // 90%
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Processed', 'Rejected'],
      default: 'Pending',
    },
    // Populated when RazorpayX payout is initiated
    razorpay_payout_id: { type: String, default: null },
    // Snapshot of bank/UPI details used at request time
    bank_details_snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

CashoutRequestSchema.index({ transporter_id: 1, createdAt: -1 });
CashoutRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('CashoutRequest', CashoutRequestSchema);
