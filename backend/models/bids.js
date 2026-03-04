import mongoose from "mongoose";

const CustomChargeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuoteBreakdownSchema = new mongoose.Schema(
  {
    transportation_charges: { type: Number, required: true, min: 0 },
    packing_cost: { type: Number, default: 0, min: 0 },
    loading_charges: { type: Number, default: 0, min: 0 },
    car_transportation: { type: Number, default: 0, min: 0 },
    octroi_entry_tax: { type: Number, default: 0, min: 0 },
    risk_coverage: {
      rate_percent: { type: Number, default: 0, min: 0, max: 100 },
      on_declared_value: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 },
    },
    gst: {
      rate_percent: { type: Number, default: 18, enum: [0, 5, 12, 18, 28] },
      amount: { type: Number, default: 0, min: 0 },
    },
    toll_cost: { type: Number, default: 0, min: 0 },
    storage_charges: { type: Number, default: 0, min: 0 },
    custom_items: {
      type: [CustomChargeSchema],
      validate: [arr => arr.length <= 5, "Maximum 5 custom charges allowed"],
    },

    // Flags for "Included" display — when true the charge is bundled into transportation
    packing_included: { type: Boolean, default: false },
    loading_included: { type: Boolean, default: false },
  },
  { _id: false }
);

const BidSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: true,
    },
    bid_amount: {
      type: Number,
      required: true,
    },
    quote_breakdown: {
      type: QuoteBreakdownSchema,
      default: null,
    },
    notes: String,
  },
  { timestamps: true },
);

BidSchema.index({ order_id: 1, transporter_id: 1 }, { unique: true });

const bidModel = mongoose.model("Bid", BidSchema);
export default bidModel;

