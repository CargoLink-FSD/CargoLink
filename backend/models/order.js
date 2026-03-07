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
    pickup: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    delivery: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    pickup_coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    delivery_coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    scheduled_at: { type: Date, required: true },
    distance: { type: Number, required: true, min: 0 },
    order_date: { type: Date, default: Date.now },
    max_price: { type: Number, required: true, min: 2000 },
    goods_type: { type: String, required: true },
    weight: { type: Number, required: true },
    volume: { type: Number, min: 0 },
    cargo_value: { type: Number, min: 0 },
    toll_cost: { type: Number, min: 0 },
    truck_type: { type: String, required: true },
    description: { type: String, required: true },
    special_instructions: String,
    cargo_photo: { type: String }, // Path to uploaded cargo photo

    pickup_otp: { type: String },    // OTP for pickup confirmation (driver enters when customer shows it)
    delivery_otp: { type: String },  // OTP for delivery confirmation (receiver shows to driver)

    status: {
      type: String,
      enum: ["Placed", "Assigned", "Scheduled", "Started", "In Transit", "Completed", "Cancelled"],
      default: "Placed",
    },
    assigned_transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
    },
    // This field prevents multiple reviews
    is_reviewed: {
      type: Boolean,
      default: false
    },
    final_price: Number,
    accepted_quote_breakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    payment_status: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
    otp: String,
    assignment: {
      vehicle_id: { type: mongoose.Schema.Types.ObjectId },
      vehicle_number: String,
      vehicle_type: String,
      assigned_at: Date
    },
    shipments: [ShipmentItemSchema],
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