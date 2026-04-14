import mongoose from "mongoose";

const TripStopSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true },
    type: {
      type: String,
      enum: ["Pickup", "Dropoff", "Waypoint", "Delay"],
      required: true,
      default: "Waypoint",
    },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    address: {
      street: String,
      city: String,
      state: String,
      pin: String,
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
      },
    },
    scheduled_arrival_at: Date,
    scheduled_departure_at: Date,
    eta_at: Date,
    actual_arrival_at: Date,
    actual_departure_at: Date,
    status: {
      type: String,
      enum: ["Pending", "En Route", "Arrived", "Completed", "Skipped"],
      default: "Pending",
    },
    otp: String,
    delay_minutes: Number,
    delay_reason: String,
  },
  { _id: true, timestamps: true },
);

const TripSchema = new mongoose.Schema(
  {
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: true,
    },
    assigned_vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: "Fleet" },
    assigned_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    order_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    status: {
      type: String,
      enum: ["Scheduled", "Active", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    stops: { type: [TripStopSchema], default: [] },
    current_stop_index: { type: Number, default: 0 },
    current_location: {
      coordinates: { type: [Number], default: undefined },
      updated_at: Date,
    },
    planned_start_at: Date,
    actual_start_at: Date,
    planned_end_at: Date,
    actual_end_at: Date,
    total_distance_km: Number,
    total_duration_minutes: Number,
    cancellation: {
      reason_code: { type: String, default: null },
      reason_text: { type: String, default: null },
      cancelled_by: { type: String, enum: ['transporter', 'admin', null], default: null },
      cancelled_at: { type: Date, default: null },
      ledger_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CancellationLedger', default: null },
      penalty_points: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true },
);

const tripModel = mongoose.model("Trip", TripSchema);
export default tripModel;
