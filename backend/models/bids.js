const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  transporter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transporter',
    required: true
  },
  bid_amount: {
    type: Number,
    required: true
  },
  notes: String
}, { timestamps: true });


BidSchema.index({ order_id: 1, transporter_id: 1 }, { unique: true });

module.exports = mongoose.model('Bid', BidSchema);
