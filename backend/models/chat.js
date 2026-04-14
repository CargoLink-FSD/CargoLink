import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  senderType: { type: String, enum: ['customer', 'transporter', 'driver'], required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
});

chatSchema.index({ order: 1, createdAt: -1 });
chatSchema.index({ customer: 1, transporter: 1 });

export default mongoose.model('Chat', chatSchema);