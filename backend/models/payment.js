import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  amount: { type: Number, required: true },
  payment_type: {
    type: String,
    enum: ["final"],
    default: "final",
  },
  razorpay_order_id: { type: String, required: true },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  method: { type: String },                      
  status: {
    type: String,
    enum: ["Created", "Pending", "Completed", "Failed", "Refunded"],
    default: "Created",
  },
}, { timestamps: true });

PaymentSchema.index({ order_id: 1, payment_type: 1 });
PaymentSchema.index({ razorpay_order_id: 1 });

export default mongoose.model("Payment", PaymentSchema);