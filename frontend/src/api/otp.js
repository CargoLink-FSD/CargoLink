import http from './http';

/**
 * Send OTP for signup verification
 */
export const sendSignupOTP = async (email, role) => {
  const response = await http.post('/api/auth/send-signup-otp', { email, role });
  return response.data;
};

/**
 * Verify signup OTP
 */
export const verifySignupOTP = async (email, otp, role) => {
  const response = await http.post('/api/auth/verify-signup-otp', { email, otp, role });
  return response.data;
};

/**
 * Send OTP for password reset
 */
export const sendResetOTP = async (email, role) => {
  const response = await http.post('/api/auth/forgot-password', { email, role });
  return response.data;
};

/**
 * Verify reset password OTP
 */
export const verifyResetOTP = async (email, otp, role) => {
  const response = await http.post('/api/auth/verify-reset-otp', { email, otp, role });
  return response.data;
};

/**
 * Reset password after OTP verification
 */
export const resetPassword = async (email, newPassword, role) => {
  const response = await http.post('/api/auth/reset-password', { email, newPassword, role });
  return response.data;
};

/**
 * Resend OTP
 */
export const resendOTP = async (email, purpose, role) => {
  const response = await http.post('/api/auth/resend-otp', { email, purpose, role });
  return response.data;
};

export default {
  sendSignupOTP,
  verifySignupOTP,
  sendResetOTP,
  verifyResetOTP,
  resetPassword,
  resendOTP,
};
