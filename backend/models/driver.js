import mongoose from "mongoose";
import bcrypt from "bcrypt";

const AvailabilitySlotSchema = new mongoose.Schema({
  day: { type: String, enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], required: true },
  startTime: { type: String, default: "08:00" },
  endTime:   { type: String, default: "18:00" },
  available: { type: Boolean, default: true }
}, { _id: false });

const DriverSchema = new mongoose.Schema({

  transporter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Transporter" }, // nullable until approved
  firstName: String,
  lastName:  String,
  email:     { type: String, unique: true },
  phone:     String,
  password:  String,

  authProvider:    { type: String, enum: ["google","local"], default: "local" },
  googleId:        String,
  profilePicture:  String,
  isEmailVerified: { type: Boolean, default: false },

  licenseNumber: String,
  licenseExpiry: Date,

  employment_type:       { type: String, enum: ["Salary","Commission"], default: "Salary" },
  salary_amount:         Number,
  commission_percentage: Number,

  status: {
    type: String,
    enum: ["Available","Assigned","Unavailable"],
    default: "Available",
  },

  availability: { type: [AvailabilitySlotSchema], default: [] },

  current_trip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number]
  },

  street: String,
  city: String,
  state: String,
  pin: String,

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