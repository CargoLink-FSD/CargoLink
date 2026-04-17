import { makeCacheKey } from '../core/cache.js';

const MAX_KEY_LENGTH = 128;

export const getRequestIdempotencyKey = (req) => {
    const raw = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (!value || typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    if (!normalized) return null;
    return normalized.slice(0, MAX_KEY_LENGTH);
};

export const buildIdempotencyCacheKey = ({ scope, payload = {}, requestKey, fallbackKey }) => {
    const key = requestKey || fallbackKey;
    if (!key) return null;

    return makeCacheKey(`idem:${scope}`, {
        ...payload,
        key,
    });
};
