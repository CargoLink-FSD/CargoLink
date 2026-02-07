import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  amount: { type: Number, required: true },
  transaction_id: { type: String, required: true, unique: true },
  method: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" }
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);