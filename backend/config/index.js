import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CargoLink';

// JWT configuration with sensible defaults; secrets should be overridden in production
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change';
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '30m';
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Google OAuth configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '230748201134-5mvs75s5q6oj6smc3rf61bta3r04rovf.apps.googleusercontent.com';

export default {
  PORT,
  MONGO_URI,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  GOOGLE_CLIENT_ID,
};
