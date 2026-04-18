import jwt from 'jsonwebtoken';
import { JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY } from '../config/index.js';

// Read secrets from process.env at call time (after loadAllSecrets() has run)
const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change';

export function signAccessToken(payload) {
  return jwt.sign(payload, accessSecret(), { expiresIn: JWT_ACCESS_EXPIRY });
}

export function signRefreshToken(payload, jti) {
  return jwt.sign({ ...payload, jti }, refreshSecret(), { expiresIn: JWT_REFRESH_EXPIRY });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret());
}

export function decodeToken(token) {
  return jwt.decode(token);
}
