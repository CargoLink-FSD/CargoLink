import mongoose from 'mongoose';
import { MONGO_URI } from './index.js';
import { logger } from '../utils/misc.js';

export async function connectDB(uri = MONGO_URI) {
  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected');
    return mongoose;
  } catch (err) {
    logger.error('MongoDB connection error', { stack: err.stack });
    throw err;
  }
}
