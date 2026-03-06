import mongoose from "mongoose";
import bcrypt from "bcrypt";

const DocumentSchema = new mongoose.Schema(
  {
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    adminStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String },
  },
  { _id: true }
);

const AvailabilitySlotSchema = new mongoose.Schema({
  day: { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], required: true },
  startTime: { type: String, default: "08:00" },
  endTime: { type: String, default: "18:00" },
  available: { type: Boolean, default: true }
}, { _id: false });

const ScheduleBlockSchema = new mongoose.Schema({
  title: { type: String, default: "Unavailable" },
  type: { type: String, enum: ["unavailable", "trip"], default: "unavailable" },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  notes: { type: String, default: "" },
}, { _id: true, timestamps: true });

const DriverSchema = new mongoose.Schema({

  transporter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Transporter" }, // nullable until approved
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,

  authProvider: { type: String, enum: ["google", "local"], default: "local" },
  googleId: String,
  profilePicture: String,
  isEmailVerified: { type: Boolean, default: false },

  licenseNumber: String,
  licenseExpiry: Date,

  // Document verification
  documents: {
    pan_card: { type: DocumentSchema, default: undefined },
    driving_license: { type: DocumentSchema, default: undefined },
  },
  verificationStatus: {
    type: String,
    enum: ["unsubmitted", "under_review", "approved", "rejected"],
    default: "unsubmitted",
  },
  isVerified: { type: Boolean, default: false },

  employment_type: { type: String, enum: ["Salary", "Commission"], default: "Salary" },
  salary_amount: Number,
  commission_percentage: Number,

  status: {
    type: String,
    enum: ["Available", "Assigned", "Unavailable"],
    default: "Available",
  },

  scheduleBlocks: { type: [ScheduleBlockSchema], default: [] },

  current_trip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number]
  },

  street: String,
  city: String,
  state: String,
  pin: String,

  address : {
    street: String,
    city: String,
    state: String,
    pin: String,
  }
}, { timestamps: true });

DriverSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

DriverSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

DriverSchema.methods.updatePassword = async function (newPassword) {
  this.password = newPassword;
  await this.save({ validateModifiedOnly: true });
};

const driverModel = mongoose.model("Driver", DriverSchema);
export default driverModel;