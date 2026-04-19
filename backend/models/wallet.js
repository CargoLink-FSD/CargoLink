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

// NOTE: transporter_id has unique: true in the field definition, which already
// creates a single-field index. Do NOT add a redundant schema.index() here.

export default mongoose.model('Wallet', WalletSchema);
