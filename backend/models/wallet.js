import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema(
  {
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transporter',
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

WalletSchema.index({ transporter_id: 1 });

export default mongoose.model('Wallet', WalletSchema);
