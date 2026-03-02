import mongoose from "mongoose";

const FleetSchema = new mongoose.Schema(
  {
    transporter_id: { type: ObjectId, ref: "Transporter", required: true },
    name: { type: String, required: true },
    registration: { type: String, required: true,  unique: true },
    capacity: { type: Number, required: true, min: 0 },
    max_weight_kg: Number,
    max_volume_m3: Number,
    manufacture_year: { type: Number, required: true },
    truck_type: { type: String, required: true },
    status: {
      type: String,
      enum: ["Available", "Assigned", "In Maintenance", "Unavailable"],
      default: "Available",
    },
    last_service_date: Date,
    next_service_date: Date,
    
    current_location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: [Number]
    },
    current_trip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
  },
  { _id: true },
);

const fleetModel = mongoose.model("Fleet", FleetSchema);
export default fleetModel;