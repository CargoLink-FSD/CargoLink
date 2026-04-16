import { CACHE_DEFAULT_TTL } from '../core/index.js';
import {
  getCachedJson,
  invalidateByPrefix,
  makeCacheKey,
  setCachedJson,
} from '../core/cache.js';

const normalizeIdentity = (req, includeUser) => {
  if (!includeUser) return 'public';
  const role = req.user?.role || 'anon';
  const subject = req.user?.id || req.ip || 'unknown';
  return `${role}:${subject}`;
};

export const cacheResponse = ({
  ttlSeconds = CACHE_DEFAULT_TTL,
  domain = 'default',
  includeUser = true,
} = {}) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    if (req.headers['x-cache-bypass'] === '1' || req.query.__cacheBypass === '1') {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const identity = normalizeIdentity(req, includeUser);
    const key = makeCacheKey(`http:${domain}:${identity}:`, {
      path: req.baseUrl + req.path,
      query: req.query,
    });

    const cached = await getCachedJson(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.statusCode || 200).json(cached.payload);
    }

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void setCachedJson(key, {
          statusCode: res.statusCode,
          payload,
        }, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(payload);
    };

    return next();
  };
};

export const invalidateCacheOnSuccess = (domains = []) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!domains.length) return;

      void Promise.allSettled(
        domains.map((domain) => invalidateByPrefix(`http:${domain}:`))
      );
    });

    next();
  };
};
