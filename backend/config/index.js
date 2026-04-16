import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CargoLink';

// JWT configuration with sensible defaults; secrets should be overridden in production
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change';
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '60m';
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Google OAuth configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '230748201134-5mvs75s5q6oj6smc3rf61bta3r04rovf.apps.googleusercontent.com';

// Razorpay Payment Gateway
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Google Maps API
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Cancellation policy configuration
export const CANCELLATION_GRACE_MINUTES = Number(process.env.CANCELLATION_GRACE_MINUTES || 10);
export const FREE_CANCELLATIONS_30D = Number(process.env.FREE_CANCELLATIONS_30D || 2);
export const CANCELLATION_FEE_PLACED = Number(process.env.CANCELLATION_FEE_PLACED || 150);
export const CANCELLATION_FEE_ASSIGNED = Number(process.env.CANCELLATION_FEE_ASSIGNED || 500);
export const CANCELLATION_FEE_NEAR_PICKUP = Number(process.env.CANCELLATION_FEE_NEAR_PICKUP || 1000);
export const CANCELLATION_NEAR_PICKUP_HOURS = Number(process.env.CANCELLATION_NEAR_PICKUP_HOURS || 6);
export const CANCELLATION_COOLDOWN_HOURS_TIER2 = Number(process.env.CANCELLATION_COOLDOWN_HOURS_TIER2 || 24);
export const TRANSPORTER_LATE_CANCEL_WINDOW_HOURS = Number(process.env.TRANSPORTER_LATE_CANCEL_WINDOW_HOURS || 6);
export const TRANSPORTER_RESTRICTION_DAYS = Number(process.env.TRANSPORTER_RESTRICTION_DAYS || 3);

export default {
  PORT,
  MONGO_URI,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  GOOGLE_CLIENT_ID,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  GOOGLE_MAPS_API_KEY,
  CANCELLATION_GRACE_MINUTES,
  FREE_CANCELLATIONS_30D,
  CANCELLATION_FEE_PLACED,
  CANCELLATION_FEE_ASSIGNED,
  CANCELLATION_FEE_NEAR_PICKUP,
  CANCELLATION_NEAR_PICKUP_HOURS,
  CANCELLATION_COOLDOWN_HOURS_TIER2,
  TRANSPORTER_LATE_CANCEL_WINDOW_HOURS,
  TRANSPORTER_RESTRICTION_DAYS,
};
