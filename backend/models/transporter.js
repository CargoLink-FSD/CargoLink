import mongoose from "mongoose";
import bcrypt from "bcrypt";

const DocumentSchema = new mongoose.Schema(
  {
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    autoVerified: { type: Boolean, default: false },
    adminStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String },
    vehicleId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: true }
);

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
    rc_url: { type: String, default: null },
    rc_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rc_note: { type: String, default: null },
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
    // OAuth fields
    authProvider: { type: String, enum: ["google", "local"], default: "local" },
    googleId: { type: String },
    profilePicture: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    // Document verification fields
    documents: {
      pan_card: { type: DocumentSchema, default: undefined },
      driving_license: { type: DocumentSchema, default: undefined },
      vehicle_rcs: [DocumentSchema],
    },
    verificationStatus: {
      type: String,
      enum: ["unsubmitted", "under_review", "approved", "rejected"],
      default: "unsubmitted",
    },
    isVerified: { type: Boolean, default: false },
    reliability: {
      score: { type: Number, default: 100, min: 0, max: 100 },
      assignmentCancels30d: { type: Number, default: 0, min: 0 },
      lateCancels30d: { type: Number, default: 0, min: 0 },
      noShowCount30d: { type: Number, default: 0, min: 0 },
      restrictionUntil: { type: Date, default: null },
    },
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

TransporterSchema.index({ createdAt: -1 });
TransporterSchema.index({ verificationStatus: 1, createdAt: -1 });

const transporterModel = mongoose.model("Transporter", TransporterSchema);
export default transporterModel;
