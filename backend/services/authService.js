import customerRepo from "../repositories/customerRepo.js";
import driverRepo from "../repositories/driverRepo.js";
import transporterRepo from "../repositories/transporterRepo.js";
import managerRepo from "../repositories/managerRepo.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError, logger, sendMail } from '../utils/misc.js';

// Admin credentials (hardcoded for now - in production, use environment variables)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cargolink.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
const ADMIN_ID = "admin";
const SIGNUP_OTP_EXPIRY_MINUTES = Number(process.env.SIGNUP_OTP_EXPIRY_MINUTES || 10);
const SIGNUP_VERIFICATION_EXPIRY_MINUTES = Number(process.env.SIGNUP_VERIFICATION_EXPIRY_MINUTES || 20);
const SIGNUP_OTP_MAX_ATTEMPTS = Number(process.env.SIGNUP_OTP_MAX_ATTEMPTS || 5);

// In-memory store for refresh tokens (prototype). For production use persistent storage or a blacklist strategy.
const refreshStore = new Map(); // key: jti, value: { userId, role, expiresAt }
const signupOtpStore = new Map(); // key: normalized email+role, value: { otpHash, expiresAt, attempts }
const signupVerificationStore = new Map(); // key: verification token, value: { email, role, expiresAt }

function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function signupKey(email, role) {
  return `${normalizeEmail(email)}:${String(role).trim().toLowerCase()}`;
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateSignupOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const safeEmail = normalizeEmail(email);
  const [local, domain] = safeEmail.split('@');
  if (!local || !domain) return safeEmail;

  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function assertSignupRole(role) {
  if (!['customer', 'transporter', 'driver'].includes(role)) {
    throw new AppError(400, 'ValidationError', 'Invalid signup role', 'ERR_VALIDATION');
  }
}

export async function requestSignupOtp({ email, role }) {
  const normalizedRole = String(role).trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  assertSignupRole(normalizedRole);

  const existingUser = await findUserByEmailAndRole(normalizedEmail, normalizedRole);
  if (existingUser) {
    throw new AppError(409, 'DuplicateKey', 'Account already exists. Please login.', 'ERR_DUP_EMAIL');
  }

  const otp = generateSignupOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = Date.now() + SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000;

  signupOtpStore.set(signupKey(normalizedEmail, normalizedRole), {
    otpHash,
    expiresAt,
    attempts: 0,
  });

  await sendMail(
    normalizedEmail,
    'CargoLink Signup Verification Code',
    `Your CargoLink verification code is ${otp}. It expires in ${SIGNUP_OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`
  );

  return {
    maskedEmail: maskEmail(normalizedEmail),
    expiresInSeconds: SIGNUP_OTP_EXPIRY_MINUTES * 60,
  };
}

export function verifySignupOtp({ email, role, otp }) {
  const normalizedRole = String(role).trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  assertSignupRole(normalizedRole);

  const key = signupKey(normalizedEmail, normalizedRole);
  const record = signupOtpStore.get(key);

  if (!record) {
    throw new AppError(400, 'ValidationError', 'No OTP request found for this email. Please request a new OTP.', 'ERR_OTP_NOT_FOUND');
  }

  if (Date.now() > record.expiresAt) {
    signupOtpStore.delete(key);
    throw new AppError(400, 'ValidationError', 'OTP expired. Please request a new OTP.', 'ERR_OTP_EXPIRED');
  }

  const incomingOtpHash = hashOtp(otp);
  if (incomingOtpHash !== record.otpHash) {
    const attempts = (record.attempts || 0) + 1;

    if (attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
      signupOtpStore.delete(key);
      throw new AppError(400, 'ValidationError', 'Too many invalid OTP attempts. Please request a new OTP.', 'ERR_OTP_MAX_ATTEMPTS');
    }

    signupOtpStore.set(key, { ...record, attempts });
    throw new AppError(400, 'ValidationError', 'Invalid OTP', 'ERR_OTP_INVALID');
  }

  signupOtpStore.delete(key);

  const signupVerificationToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60 * 1000;

  signupVerificationStore.set(signupVerificationToken, {
    email: normalizedEmail,
    role: normalizedRole,
    expiresAt,
  });

  return {
    signupVerificationToken,
    expiresInSeconds: SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60,
  };
}

export function validateSignupVerificationToken(token, expectedEmail, expectedRole) {
  const verificationRecord = signupVerificationStore.get(token);
  if (!verificationRecord) {
    throw new AppError(401, 'AuthError', 'Signup verification token is missing or invalid', 'ERR_SIGNUP_TOKEN_INVALID');
  }

  if (Date.now() > verificationRecord.expiresAt) {
    signupVerificationStore.delete(token);
    throw new AppError(401, 'AuthError', 'Signup verification token expired. Please verify OTP again.', 'ERR_SIGNUP_TOKEN_EXPIRED');
  }

  const normalizedEmail = normalizeEmail(expectedEmail);
  const normalizedRole = String(expectedRole).trim().toLowerCase();

  if (verificationRecord.email !== normalizedEmail || verificationRecord.role !== normalizedRole) {
    throw new AppError(401, 'AuthError', 'Signup verification token does not match this user', 'ERR_SIGNUP_TOKEN_MISMATCH');
  }

  return true;
}

export function consumeSignupVerificationToken(token) {
  signupVerificationStore.delete(token);
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

  // Handle manager authentication (from database)
  if (role === 'manager') {
    const manager = await managerRepo.findManagerByEmail(email);
    if (!manager) {
      throw new AppError(401, 'AuthError', 'Invalid manager credentials', 'ERR_INVALID_CREDENTIALS');
    }
    if (manager.status !== 'active') {
      throw new AppError(403, 'AuthError', 'Your manager account is inactive. Contact admin.', 'ERR_MANAGER_INACTIVE');
    }
    const passwordOk = await manager.verifyPassword(password);
    if (!passwordOk) {
      throw new AppError(401, 'AuthError', 'Invalid manager credentials', 'ERR_INVALID_CREDENTIALS');
    }
    return {
      _id: manager._id,
      email: manager.email,
      name: manager.name,
      role: 'manager',
    };
  }

  let user, userRepo;
  if (role === 'customer') {
    user = await customerRepo.findByEmail(email);
  } else if (role === 'transporter') {
    user = await transporterRepo.findByEmail(email);
  } else if (role === 'driver') {
    user = await driverRepo.findByEmail(email);
  } else {
    throw new AppError(400, 'AuthError', 'Unsupported role', 'ERR_UNSUPPORTED_ROLE');
  }

  if (!user) {
    throw new AppError(401, 'AuthError', 'Invalid credentials', 'ERR_INVALID_CREDENTIALS');
  }

  // Check if user signed up with Google OAuth
  if (user.authProvider === 'google') {
    throw new AppError(401, 'AuthError', 'This account uses Google Sign-In. Please continue with Google.', 'ERR_GOOGLE_AUTH_REQUIRED');
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
  } else if (role === 'driver') {
    return await driverRepo.findByEmail(email);
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
  requestSignupOtp,
  verifySignupOtp,
  validateSignupVerificationToken,
  consumeSignupVerificationToken,
};
