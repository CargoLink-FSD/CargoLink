const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderType: { type: String, enum: ['Customer', 'Transporter'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter', required: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);