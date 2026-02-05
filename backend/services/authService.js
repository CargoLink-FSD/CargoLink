import customerRepo from "../repositories/customerRepo.js";
import transporterRepo from "../repositories/transporterRepo.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError, logger } from '../utils/misc.js';

// Admin credentials (hardcoded for now - in production, use environment variables)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cargolink.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
const ADMIN_ID = "admin";

// In-memory store for refresh tokens (prototype). For production use persistent storage or a blacklist strategy.
const refreshStore = new Map(); // key: jti, value: { userId, role, expiresAt }

function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

export async function authenticateUser({ email, password, role }) {
  // Handle admin authentication separately
  if (role === 'admin') {
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      throw new AppError(401, 'AuthError', 'Invalid admin credentials', 'ERR_INVALID_CREDENTIALS');
    }
    return {
      _id: ADMIN_ID,
      email: ADMIN_EMAIL,
      role: 'admin'
    };
  }

  let user, userRepo;
  if (role === 'customer') {
    user = await customerRepo.findByEmail(email);
  } else if (role === 'transporter') {
    user = await transporterRepo.findByEmail(email);
  } else {
    throw new AppError(400, 'AuthError', 'Unsupported role', 'ERR_UNSUPPORTED_ROLE');
  }

  if (!user) {
    throw new AppError(401, 'AuthError', 'Invalid credentials', 'ERR_INVALID_CREDENTIALS');
  }

  logger.debug('User found', { user: user, role, password, userPassword: user.password });

  const passwordOk = await user.verifyPassword(password);
  if (!passwordOk) {
    throw new AppError(401, 'AuthError', 'Invalid credentials', 'ERR_INVALID_CREDENTIALS');
  }

  return user;
}

export function generateTokens(user, role) {
  const payload = { sub: user._id.toString(), role };
  const accessToken = signAccessToken(payload);
  const jti = generateJti();
  const refreshToken = signRefreshToken(payload, jti);

  // Store refresh token metadata
  const decoded = verifyRefreshToken(refreshToken);
  refreshStore.set(jti, { userId: user._id.toString(), role, expiresAt: decoded.exp * 1000 });

  return { accessToken, refreshToken };
}

export function rotateRefreshToken(oldRefreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new AppError(401, 'AuthError', 'Invalid refresh token', 'ERR_INVALID_REFRESH');
  }
  const { jti: oldJti, sub, role } = decoded;
  const meta = refreshStore.get(oldJti);
  if (!meta) {
    throw new AppError(401, 'AuthError', 'Refresh token revoked', 'ERR_REFRESH_REVOKED');
  }
  // Remove old jti
  refreshStore.delete(oldJti);
  // Issue new tokens
  const accessPayload = { sub, role };
  const accessToken = signAccessToken(accessPayload);
  const newJti = generateJti();
  const refreshToken = signRefreshToken(accessPayload, newJti);
  const newDecoded = verifyRefreshToken(refreshToken);
  refreshStore.set(newJti, { userId: sub, role, expiresAt: newDecoded.exp * 1000 });
  return { accessToken, refreshToken };
}

export function revokeRefreshToken(refreshToken) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    refreshStore.delete(decoded.jti);
  } catch (err) {
    // Ignore invalid token on revoke
    logger.warn('Attempt to revoke invalid refresh token');
  }
}

export function validateAccessTokenPayload(payload, roles) {
  if (!payload?.sub || !payload?.role) {
    throw new AppError(401, 'AuthError', 'Malformed token payload', 'ERR_MALFORMED_TOKEN');
  }
  if (roles && roles.length && !roles.includes(payload.role)) {
    throw new AppError(403, 'AuthError', 'Insufficient role', 'ERR_FORBIDDEN');
  }
  return { userId: payload.sub, role: payload.role };
}

// Find user by email and role (for Google OAuth)
export async function findUserByEmailAndRole(email, role) {
  if (role === 'customer') {
    return await customerRepo.findByEmail(email);
  } else if (role === 'transporter') {
    return await transporterRepo.findByEmail(email);
  }
  return null;
}

export default {
  authenticateUser,
  generateTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  validateAccessTokenPayload,
  findUserByEmailAndRole,
};
