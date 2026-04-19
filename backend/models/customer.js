import mongoose from "mongoose";
import bcrypt from "bcrypt";

const AddressSchema = new mongoose.Schema(
  {
    address_label: { type: String, default: "Home" },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pin: { type: String, required: true },
    phone: String,
    coordinates: { type: [Number], default: undefined },
  },
  { _id: false },
);

const CustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    password: { type: String },
    addresses: [AddressSchema],
    // OAuth fields
    authProvider: { type: String, enum: ["google", "local"], default: "local" },
    googleId: { type: String },
    profilePicture: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    cancellation_stats: {
      cancels7d: { type: Number, default: 0, min: 0 },
      cancels30d: { type: Number, default: 0, min: 0 },
      abuseTier: { type: Number, default: 0, min: 0, max: 10 },
      gateMode: { type: String, enum: ["none", "soft", "hard"], default: "none" },
      cooldownUntil: { type: Date, default: null },
      outstandingCancellationDues: { type: Number, default: 0, min: 0 },
      enforceAdvanceToken: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

CustomerSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

CustomerSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

CustomerSchema.methods.updatePassword = async function (newPassword) {
  this.password = newPassword;
  await this.save({ validateModifiedOnly: true });
};

// B-Tree index on createdAt for dashboard aggregation queries
CustomerSchema.index({ createdAt: -1 });
// Text index: enables $text search (O(log n)) instead of $regex (O(n) collection scan)
CustomerSchema.index({ firstName: 'text', lastName: 'text', email: 'text' }, { name: 'customer_text_search' });

const customerModel = mongoose.model("Customer", CustomerSchema);
export default customerModel;
