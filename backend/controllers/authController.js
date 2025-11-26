import authService from '../services/authService.js';
import { AppError } from '../utils/misc.js';

// Helper to standardize responses
function send(res, statusCode, payload) {
  res.status(statusCode).json({ success: true, ...payload });
}

const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      throw new AppError(400, 'AuthError', 'Email, password & role required', 'ERR_LOGIN_INPUT');
    }
    const user = await authService.authenticateUser({ email, password, role });
    const { accessToken, refreshToken } = authService.generateTokens(user, role);
    send(res, 200, { message: 'Login successful', data: { accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'AuthError', 'Refresh token required', 'ERR_REFRESH_INPUT');
    }
    const tokens = authService.rotateRefreshToken(refreshToken);
    send(res, 200, { message: 'Token refreshed', data: tokens });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      authService.revokeRefreshToken(refreshToken);
    }
    send(res, 200, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// Placeholders for future flows
const forgotPassword = async (req, res, next) => {
  next(new AppError(501, 'NotImplemented', 'Forgot password not implemented', 'ERR_NOT_IMPLEMENTED'));
};
const resetPassword = async (req, res, next) => {
  next(new AppError(501, 'NotImplemented', 'Reset password not implemented', 'ERR_NOT_IMPLEMENTED'));
};
const verifyEmail = async (req, res, next) => {
  next(new AppError(501, 'NotImplemented', 'Email verification not implemented', 'ERR_NOT_IMPLEMENTED'));
};
const resendVerification = async (req, res, next) => {
  next(new AppError(501, 'NotImplemented', 'Resend verification not implemented', 'ERR_NOT_IMPLEMENTED'));
};

export default {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};

