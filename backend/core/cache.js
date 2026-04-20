import crypto from 'crypto';
import { createClient } from 'redis';
import {
  CACHE_ENABLED,
  CACHE_PREFIX,
  CACHE_VERSION,
  REDIS_URL,
} from './index.js';
import { logger } from '../utils/misc.js';

let redisClient = null;
let cacheConnected = false;
let cacheInitialized = false;
const memoryPresence = new Map();
const memoryNotificationQueues = new Map();

export const isCacheAvailable = () => CACHE_ENABLED && cacheConnected && !!redisClient;

const scopedKey = (key) => `${CACHE_PREFIX}:${CACHE_VERSION}:${key}`;

export const stableStringify = (value) => {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const hashPayload = (payload) => {
  const normalized = stableStringify(payload);
  return crypto.createHash('sha1').update(normalized).digest('hex');
};

export const makeCacheKey = (domain, payload) => {
  return `${domain}:${hashPayload(payload)}`;
};

export const initCache = async () => {
  if (cacheInitialized) return isCacheAvailable();
  cacheInitialized = true;

  if (!CACHE_ENABLED) {
    logger.info('Redis cache disabled by configuration');
    return false;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return false;
          return Math.min(retries * 200, 2000);
        },
      },
    });

    redisClient.on('error', (err) => {
      cacheConnected = false;
      logger.warn('Redis client error, cache fallback to DB/API', { error: err.message });
    });

    redisClient.on('ready', () => {
      cacheConnected = true;
      logger.info('Redis cache connected');
    });

    redisClient.on('end', () => {
      cacheConnected = false;
      logger.warn('Redis connection closed');
    });

    await redisClient.connect();
    // FIX 4: removed redundant cacheConnected = true here — 'ready' event handles it
    return true;
  } catch (err) {
    cacheConnected = false;
    redisClient = null;
    logger.warn('Redis unavailable, proceeding without cache', { error: err.message });
    return false;
  }
};

export const closeCache = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (err) {
    logger.warn('Error while closing Redis client', { error: err.message });
  } finally {
    cacheConnected = false;
    redisClient = null;
    cacheInitialized = false;
  }
};

export const getCachedJson = async (key) => {
  if (!isCacheAvailable()) return null;
  try {
    const raw = await redisClient.get(scopedKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Cache read failed', { key, error: err.message });
    return null;
  }
};

export const setCachedJson = async (key, value, ttlSeconds) => {
  if (!isCacheAvailable()) return false;
  try {
    const scoped = scopedKey(key);
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.set(scoped, payload, { EX: ttlSeconds });
    } else {
      await redisClient.set(scoped, payload);
    }
    return true;
  } catch (err) {
    logger.warn('Cache write failed', { key, error: err.message });
    return false;
  }
};

export const setUserSocketPresence = async (userId, payload = {}, ttlSeconds = 120) => {
  if (!userId) return false;

  const presenceKey = `presence:user:${userId}`;
  const value = {
    userId,
    connected: payload.connected !== false,
    role: payload.role || null,
    updatedAt: new Date().toISOString(),
  };

  if (!isCacheAvailable()) {
    if (value.connected) {
      memoryPresence.set(String(userId), value);
    } else {
      memoryPresence.delete(String(userId));
    }
    return true;
  }

  try {
    if (value.connected) {
      await redisClient.set(scopedKey(presenceKey), JSON.stringify(value), { EX: ttlSeconds });
    } else {
      await redisClient.del(scopedKey(presenceKey));
    }
    return true;
  } catch (err) {
    logger.warn('Failed to set user socket presence', { userId, error: err.message });
    return false;
  }
};

export const getUserSocketPresence = async (userId) => {
  if (!userId) return null;
  if (!isCacheAvailable()) {
    return memoryPresence.get(String(userId)) || null;
  }

  try {
    const raw = await redisClient.get(scopedKey(`presence:user:${userId}`));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Failed to read user socket presence', { userId, error: err.message });
    return null;
  }
};

export const enqueueNotification = async (userId, notification, { ttlSeconds = 60 * 60 * 24, maxItems = 200 } = {}) => {
  if (!userId || !notification) return false;
  const queueKey = `notifications:queue:user:${userId}`;

  if (!isCacheAvailable()) {
    const existing = memoryNotificationQueues.get(String(userId)) || [];
    existing.push(notification);
    memoryNotificationQueues.set(String(userId), existing.slice(-maxItems));
    return true;
  }

  try {
    // FIX 1: use pipeline so rPush + lTrim + expire are atomic
    const scoped = scopedKey(queueKey);
    const pipeline = redisClient.multi();
    pipeline.rPush(scoped, JSON.stringify(notification));
    pipeline.lTrim(scoped, -maxItems, -1);
    pipeline.expire(scoped, ttlSeconds);
    await pipeline.exec();
    return true;
  } catch (err) {
    logger.warn('Failed to enqueue notification', { userId, error: err.message });
    return false;
  }
};

export const dequeueAllNotifications = async (userId) => {
  if (!userId) return [];
  const queueKey = `notifications:queue:user:${userId}`;

  if (!isCacheAvailable()) {
    const items = memoryNotificationQueues.get(String(userId)) || [];
    memoryNotificationQueues.delete(String(userId));
    return items;
  }

  try {
    const scoped = scopedKey(queueKey);
    const items = await redisClient.lRange(scoped, 0, -1);
    await redisClient.del(scoped);
    return items
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    logger.warn('Failed to dequeue notifications', { userId, error: err.message });
    return [];
  }
};

export const getNotificationQueueSize = async (userId) => {
  if (!userId) return 0;
  const queueKey = `notifications:queue:user:${userId}`;

  if (!isCacheAvailable()) {
    return (memoryNotificationQueues.get(String(userId)) || []).length;
  }

  try {
    return await redisClient.lLen(scopedKey(queueKey));
  } catch (err) {
    logger.warn('Failed to get notification queue size', { userId, error: err.message });
    return 0;
  }
};

const LOCK_RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

export const acquireDistributedLock = async (key, { ttlSeconds = 15 } = {}) => {
  if (!isCacheAvailable()) {
    return { acquired: true, token: null, degraded: true };
  }

  try {
    const token = crypto.randomBytes(16).toString('hex');
    const result = await redisClient.set(scopedKey(key), token, {
      NX: true,
      EX: ttlSeconds,
    });

    return {
      acquired: result === 'OK',
      token: result === 'OK' ? token : null,
      degraded: false,
    };
  } catch (err) {
    logger.warn('Distributed lock acquisition failed, continuing without lock', {
      key,
      error: err.message,
    });
    return { acquired: true, token: null, degraded: true };
  }
};

export const releaseDistributedLock = async (key, token) => {
  if (!isCacheAvailable() || !token) return true;

  try {
    const released = await redisClient.eval(LOCK_RELEASE_SCRIPT, {
      keys: [scopedKey(key)],
      arguments: [token],
    });
    return released === 1;
  } catch (err) {
    logger.warn('Distributed lock release failed', { key, error: err.message });
    return false;
  }
};

export const rememberCachedJson = async ({ key, ttlSeconds, producer }) => {
  const cached = await getCachedJson(key);
  if (cached !== null) {
    return { value: cached, hit: true };
  }

  const value = await producer();
  await setCachedJson(key, value, ttlSeconds);
  return { value, hit: false };
};

export const invalidateByPrefix = async (prefix) => {
  if (!isCacheAvailable()) return 0;

  const pattern = scopedKey(`${prefix}*`);
  let cursor = '0';
  let deleted = 0;

  try {
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = String(reply.cursor);
      const keys = reply.keys || [];

      if (keys.length > 0) {
        deleted += await redisClient.del(keys);
      }
    } while (cursor !== '0');

    return deleted;
  } catch (err) {
    logger.warn('Cache invalidation failed', { prefix, error: err.message });
    return deleted;
  }
};