import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

const parseBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CargoLink_v2';
const buildRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.REDIS_HOST) {
    const port = process.env.REDIS_PORT || 6379;
    return `redis://${process.env.REDIS_HOST}:${port}`;
  }
  return 'redis://127.0.0.1:6379';
};
export const REDIS_URL = buildRedisUrl();
export const CACHE_ENABLED = parseBool(process.env.CACHE_ENABLED, true);
export const CACHE_PREFIX = process.env.CACHE_PREFIX || `cargolink:${process.env.NODE_ENV || 'development'}`;
export const CACHE_VERSION = process.env.CACHE_VERSION || 'v1';
export const CACHE_DEFAULT_TTL = parseNumber(process.env.CACHE_DEFAULT_TTL, 45);
export const CACHE_EXTERNAL_TTL = parseNumber(process.env.CACHE_EXTERNAL_TTL, 1800);

export default {
  PORT,
  MONGO_URI,
  REDIS_URL,
  CACHE_ENABLED,
  CACHE_PREFIX,
  CACHE_VERSION,
  CACHE_DEFAULT_TTL,
  CACHE_EXTERNAL_TTL,
};

