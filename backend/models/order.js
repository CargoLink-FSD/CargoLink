import mongoose from "mongoose";

const ShipmentItemSchema = new mongoose.Schema(
  {
    item_name: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    delivery_status: { type: String, enum: ["Delivered", "Damaged"] },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // Pickup & Delivery info
    pickup: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
    },
    delivery: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
    },

    scheduled_at: { type: Date, required: true },
    distance: { type: Number, required: true, min: 0 },
    order_date: { type: Date, default: Date.now },
    max_price: { type: Number, required: true, min: 2000 },

    goods_type: { type: String, required: true },
    weight: { type: Number, required: true },
    truck_type: { type: String, required: true },
    description: { type: String, required: true },
    special_instructions: String,

    status: {
      type: String,
      enum: ["Placed", "Assigned", "In Transit", "Completed", "Cancelled"],
      default: "Placed",
    },

    assigned_transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
    },
    final_price: Number, // used in 'Assigned'

    shipments: [ShipmentItemSchema], // visible always
  },
  { timestamps: true },
);

OrderSchema.virtual("bid_by_transporter", {
  ref: "Bid",
  localField: "_id",
  foreignField: "order_id",
  justOne: true,
});

const orderModel = mongoose.model("Order", OrderSchema);
export default orderModel;
