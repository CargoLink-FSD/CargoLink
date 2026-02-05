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

const customerModel = mongoose.model("Customer", CustomerSchema);
export default customerModel;
