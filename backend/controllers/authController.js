import authService from '../services/authService.js';
import otpRepo from '../repositories/otpRepo.js';
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
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      throw new AppError(400, 'AuthError', 'Email and role are required', 'ERR_FORGOT_PASSWORD_INPUT');
    }
    
    // Send OTP for password reset
    await otpRepo.createAndSendOTP(email, 'forgot-password', role);
    send(res, 200, { message: 'OTP sent to your email. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
};

const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;
    if (!email || !otp || !role) {
      throw new AppError(400, 'AuthError', 'Email, OTP and role are required', 'ERR_VERIFY_OTP_INPUT');
    }
    
    const result = await otpRepo.verifyOTP(email, otp, 'forgot-password', role);
    if (!result.success) {
      throw new AppError(400, 'AuthError', result.message, 'ERR_INVALID_OTP');
    }
    
    send(res, 200, { message: 'OTP verified successfully. You can now reset your password.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, role } = req.body;
    if (!email || !newPassword || !role) {
      throw new AppError(400, 'AuthError', 'Email, new password and role are required', 'ERR_RESET_PASSWORD_INPUT');
    }
    
    // Verify OTP was verified
    const isVerified = await otpRepo.isOTPVerified(email, 'forgot-password', role);
    if (!isVerified) {
      throw new AppError(400, 'AuthError', 'Please verify OTP first', 'ERR_OTP_NOT_VERIFIED');
    }
    
    // Reset password
    await authService.resetPassword(email, newPassword, role);
    
    // Delete verified OTP
    await otpRepo.deleteVerifiedOTP(email, 'forgot-password', role);
    
    send(res, 200, { message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    next(err);
  }
};

const sendSignupOTP = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      throw new AppError(400, 'AuthError', 'Email and role are required', 'ERR_SEND_OTP_INPUT');
    }
    
    await otpRepo.createAndSendOTP(email, 'signup', role);
    send(res, 200, { message: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (err) {
    next(err);
  }
};

const verifySignupOTP = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;
    if (!email || !otp || !role) {
      throw new AppError(400, 'AuthError', 'Email, OTP and role are required', 'ERR_VERIFY_OTP_INPUT');
    }
    
    const result = await otpRepo.verifyOTP(email, otp, 'signup', role);
    if (!result.success) {
      throw new AppError(400, 'AuthError', result.message, 'ERR_INVALID_OTP');
    }
    
    send(res, 200, { message: 'Email verified successfully. You can now complete your registration.' });
  } catch (err) {
    next(err);
  }
};

const resendOTP = async (req, res, next) => {
  try {
    const { email, purpose, role } = req.body;
    if (!email || !purpose || !role) {
      throw new AppError(400, 'AuthError', 'Email, purpose and role are required', 'ERR_RESEND_OTP_INPUT');
    }
    
    const result = await otpRepo.resendOTP(email, purpose, role);
    if (!result.success) {
      throw new AppError(400, 'AuthError', result.message, 'ERR_RESEND_FAILED');
    }
    
    send(res, 200, { message: 'OTP resent successfully' });
  } catch (err) {
    next(err);
  }
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
  verifyResetOTP,
  resetPassword,
  sendSignupOTP,
  verifySignupOTP,
  resendOTP,
  verifyEmail,
  resendVerification,
};

