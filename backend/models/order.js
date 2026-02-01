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
      enum: ["Placed", "Assigned", "In Transit", "Completed", "Cancelled", "Expired", "Rejected"],
      default: "Placed",
    },

    // Expiry fields
    bidding_closes_at: { type: Date }, // When bidding window closes (2 days before scheduled_at)
    expires_at: { type: Date }, // When order expires if no action taken

    // Rental fields
    is_rental: { type: Boolean, default: false }, // Is this a rental order (time/day-based booking)?
    rental_start: { type: Date }, // Rental start date/time (for rental orders)
    rental_end: { type: Date }, // Rental end date/time (for rental orders)
    rental_duration_days: { type: Number }, // Duration in days (for rental orders)

    assigned_transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
    },

    final_price: Number, // used in 'Assigned'
    otp: String, // used in 'In Transit'

    // Vehicle Assignment (embedded for quick access)
    assignment: {
      vehicle_id: { type: mongoose.Schema.Types.ObjectId },
      vehicle_number: String,
      vehicle_type: String,
      assigned_at: Date
    },

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

// Pre-save hook to set bidding_closes_at and expires_at
OrderSchema.pre('save', function(next) {
  if (this.isNew && this.scheduled_at) {
    // Bidding closes 2 days before scheduled pickup
    this.bidding_closes_at = new Date(this.scheduled_at.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    // Order expires 1 day after bidding closes if no bids are accepted
    this.expires_at = new Date(this.bidding_closes_at.getTime() + 24 * 60 * 60 * 1000);
  }
  next();
});

const orderModel = mongoose.model("Order", OrderSchema);
export default orderModel;
