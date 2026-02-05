import authService from '../services/authService.js';
import { AppError } from '../utils/misc.js';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/index.js';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    console.log('Forgot password request body:', req.body);
    const { email, userType } = req.body;

    // Import models dynamically
    const Customer = (await import('../models/customer.js')).default;
    const Transporter = (await import('../models/transporter.js')).default;
    const { sendMail, generatePassword } = await import('../utils/misc.js');

    // Generate temporary password
    const password = generatePassword();

    // Find user based on type
    let user = null;
    if (userType === 'customer') {
      user = await Customer.findOne({ email: email });
    } else if (userType === 'transporter') {
      user = await Transporter.findOne({ email: email });
    }

    if (!user) {
      return next(new AppError(404, 'NotFound', 'Email not found', 'ERR_NOT_FOUND'));
    }

    // Send email with temporary password
    await sendMail(
      email,
      'CargoLink - Password Reset',
      `Hello,\n\nYour temporary password is: ${password}\n\nPlease use this password to log in and change it immediately for security purposes.\n\nBest regards,\nCargoLink Team`
    );

    // Update user password
    await user.updatePassword(password);

    res.status(200).json({
      success: true,
      message: 'Temporary password sent to your email',
    });
  } catch (err) {
    next(err);
  }
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

// Google OAuth Login
const googleLogin = async (req, res, next) => {
  try {
    const { credential, role } = req.body;
    
    if (!credential) {
      throw new AppError(400, 'AuthError', 'Google credential required', 'ERR_GOOGLE_INPUT');
    }
    
    if (!role) {
      throw new AppError(400, 'AuthError', 'Role required', 'ERR_GOOGLE_INPUT');
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;

    if (!email) {
      throw new AppError(400, 'AuthError', 'Email not found in Google account', 'ERR_GOOGLE_EMAIL');
    }

    // Try to find user by email and role
    const user = await authService.findUserByEmailAndRole(email, role);
    
    if (!user) {
      throw new AppError(404, 'AuthError', 'No account found with this email. Please sign up first.', 'ERR_USER_NOT_FOUND');
    }

    // Generate tokens for the found user
    const { accessToken, refreshToken } = authService.generateTokens(user, role);
    send(res, 200, { message: 'Login successful', data: { accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

// Google OAuth Verify (for signup - just extracts email)
const googleVerify = async (req, res, next) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      throw new AppError(400, 'AuthError', 'Google credential required', 'ERR_GOOGLE_INPUT');
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;

    if (!email) {
      throw new AppError(400, 'AuthError', 'Email not found in Google account', 'ERR_GOOGLE_EMAIL');
    }

    // Return just the email for signup form population
    send(res, 200, { message: 'Email verified', data: { email } });
  } catch (err) {
    next(err);
  }
};

export default {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleLogin,
  googleVerify,
};

