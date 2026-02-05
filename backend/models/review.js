import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  transporter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Transporter", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Review", ReviewSchema);