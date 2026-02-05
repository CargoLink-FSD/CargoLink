import mongoose from "mongoose";

const TripStopSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    type: {
      type: String,
      enum: ["PICKUP", "DROPOFF"],
      required: true,
    },
    seq: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Arrived", "Done"],
      default: "Pending",
    },
    otp: {
      type: String,
      default: null,
    },
    arrived_at: Date,
    done_at: Date,
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
    vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["Planned", "Scheduled", "InTransit", "Completed", "Cancelled"],
      default: "Planned",
    },
    stops: {
      type: [TripStopSchema],
      default: [],
    },
    started_at: Date,
    completed_at: Date,
  },
  { timestamps: true },
);

const tripModel = mongoose.model("Trip", TripSchema);
export default tripModel;
