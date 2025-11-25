import mongoose from "mongoose";

const TripStopSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true },
    type: {
      type: String,
      enum: ["Pickup", "Dropoff", "Waypoint"],
      required: true,
      default: "Waypoint",
    },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      coordinates: {
        type: [Number],
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
      enum: ["Pending", "En Route", "Arrived", "Departed", "Skipped"],
      default: "Pending",
    },
  },
  { _id: false },
);

const TripSchema = new mongoose.Schema(
  {
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: true,
    },
    assigned_vehicle_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    order_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["Planned", "Scheduled", "In Transit", "Delayed", "Completed", "Cancelled"],
      default: "Planned",
    },
    stops: { type: [TripStopSchema], default: [] },
    current_stop_sequence: { type: Number, default: 0 },
    current_location_coordinates: {
      type: [Number],
      default: undefined,
    },
    planned_start_at: Date,
    actual_start_at: Date,
    planned_end_at: Date,
    actual_end_at: Date,
    total_distance_km: Number,
    total_duration_minutes: Number,
  },
  { timestamps: true },
);

const tripModel = mongoose.model("Trip", TripSchema);
export default tripModel;
