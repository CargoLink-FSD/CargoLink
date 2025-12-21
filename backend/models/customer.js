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
    phone: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    password: { type: String, required: true },
    addresses: [AddressSchema],
  },
  { timestamps: true },
);

CustomerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
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
