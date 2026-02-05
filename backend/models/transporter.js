import mongoose from "mongoose";
import bcrypt from "bcrypt";

const FleetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    registration: { type: String, required: true },
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
  },
  { _id: true },
);

const TransporterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gst_in: { type: String },
    pan: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pin: { type: String },
    primary_contact: { type: String },
    secondary_contact: String,
    email: { type: String, required: true, unique: true },
    password: { type: String },
    fleet: [FleetSchema],
    // OAuth fields
    authProvider: { type: String, enum: ["google", "local"], default: "local" },
    googleId: { type: String },
    profilePicture: { type: String },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

TransporterSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

TransporterSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

TransporterSchema.methods.updatePassword = async function (newPassword) {
  this.password = newPassword;
  await this.save({ validateModifiedOnly: true });
};

const transporterModel = mongoose.model("Transporter", TransporterSchema);
export default transporterModel;
