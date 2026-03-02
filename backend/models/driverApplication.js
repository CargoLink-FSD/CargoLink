import mongoose from "mongoose";

const DriverApplicationSchema = new mongoose.Schema(
  {
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    transporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transporter",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    message: { type: String, default: "" }, // application message from driver
    rejectionReason: { type: String, default: "" }, // reason if rejected
  },
  { timestamps: true }
);

// Ensure a driver can only have one pending application per transporter
DriverApplicationSchema.index(
  { driver_id: 1, transporter_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "Pending" } }
);

const DriverApplication = mongoose.model(
  "DriverApplication",
  DriverApplicationSchema
);
export default DriverApplication;
