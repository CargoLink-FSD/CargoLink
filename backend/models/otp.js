import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['signup', 'forgot-password'],
      required: true,
    },
    role: {
      type: String,
      enum: ['customer', 'transporter'],
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    },
  },
  { timestamps: true }
);

// Create index for automatic deletion of expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create compound index for efficient queries
OTPSchema.index({ email: 1, purpose: 1, role: 1 });

// Method to verify OTP
OTPSchema.methods.verify = function (inputOTP) {
  if (this.verified) {
    return { success: false, message: 'OTP already used' };
  }
  
  if (new Date() > this.expiresAt) {
    return { success: false, message: 'OTP expired' };
  }
  
  if (this.attempts >= 5) {
    return { success: false, message: 'Maximum verification attempts exceeded' };
  }
  
  this.attempts += 1;
  
  if (this.otp === inputOTP) {
    this.verified = true;
    return { success: true, message: 'OTP verified successfully' };
  }
  
  return { success: false, message: 'Invalid OTP' };
};

// Static method to clean up old OTPs for an email
OTPSchema.statics.invalidatePreviousOTPs = async function (email, purpose, role) {
  await this.deleteMany({ email, purpose, role, verified: false });
};

const OTPModel = mongoose.model('OTP', OTPSchema);

export default OTPModel;
