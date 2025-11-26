import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CargoLink';

export default {
  PORT,
  MONGO_URI,
};
