import mongoose from "mongoose";

const FleetScheduleBlockSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    type: {
      type: String,
      enum: ['maintenance', 'unavailable', 'trip'],
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const FleetSchema = new mongoose.Schema(
  {
    transporter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Transporter", required: true },
    name: { type: String, required: true },
    registration: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true, min: 0 },
    manufacture_year: { type: Number, required: true },
    truck_type: { type: String, required: true },
    status: {
      type: String,
      enum: ["Available", "Assigned", "In Maintenance", "Unavailable"],
      default: "Available",
    },
    last_service_date: Date,
    next_service_date: Date,
    currentLocation: String,
    current_trip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
    rc_url: { type: String, default: null },
    rc_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rc_note: { type: String, default: null },
    scheduleBlocks: [FleetScheduleBlockSchema],
  },
  { timestamps: true },
);

// Explicit schema-level indexes (do NOT also set index:true on the field — causes Mongoose duplicate index warning)
FleetSchema.index({ transporter_id: 1, status: 1 });
FleetSchema.index({ status: 1 });
FleetSchema.index({ rc_status: 1 });
FleetSchema.index({ createdAt: -1 });

const Fleet = mongoose.model("Fleet", FleetSchema);
export default Fleet;