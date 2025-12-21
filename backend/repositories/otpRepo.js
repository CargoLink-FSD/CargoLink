import OTPModel from '../models/otp.js';
import { generateOTP, sendOTPEmail } from '../utils/email.js';
import { logger } from '../utils/misc.js';

// Create and send OTP

export async function createAndSendOTP(email, purpose, role) {
  try {
    // Invalidate previous OTPs for this email and purpose
    await OTPModel.invalidatePreviousOTPs(email, purpose, role);
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Save OTP to database
    const otpDoc = new OTPModel({
      email,
      otp,
      purpose,
      role,
    });
    await otpDoc.save();
    
    // Send OTP via email
    await sendOTPEmail(email, otp, purpose);
    
    logger.info('OTP created and sent', { email, purpose, role });
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error('Failed to create and send OTP', { error: error.message, email, purpose });
    throw error;
  }
}

// Verify OTP

export async function verifyOTP(email, otp, purpose, role) {
  try {
    const otpDoc = await OTPModel.findOne({
      email,
      purpose,
      role,
      verified: false,
    }).sort({ createdAt: -1 });
    
    if (!otpDoc) {
      return { success: false, message: 'No valid OTP found. Please request a new one.' };
    }
    
    const result = otpDoc.verify(otp);
    await otpDoc.save();
    
    return result;
  } catch (error) {
    logger.error('Failed to verify OTP', { error: error.message, email, purpose });
    throw error;
  }
}

// Check if OTP is verified

export async function isOTPVerified(email, purpose, role) {
  try {
    const otpDoc = await OTPModel.findOne({
      email,
      purpose,
      role,
      verified: true,
    }).sort({ createdAt: -1 });
    
    if (!otpDoc) {
      return false;
    }
    
    // Check if OTP is still valid (within 30 minutes of verification)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return otpDoc.updatedAt > thirtyMinutesAgo;
  } catch (error) {
    logger.error('Failed to check OTP verification', { error: error.message, email, purpose });
    throw error;
  }
}

//Resend OTP

export async function resendOTP(email, purpose, role) {
  try {
    const lastOTP = await OTPModel.findOne({
      email,
      purpose,
      role,
    }).sort({ createdAt: -1 });
    
    // Check if last OTP was sent within 1 minute (rate limiting)
    if (lastOTP) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (lastOTP.createdAt > oneMinuteAgo) {
        const waitTime = Math.ceil((60 - (Date.now() - lastOTP.createdAt) / 1000));
        return { 
          success: false, 
          message: `Please wait ${waitTime} seconds before requesting a new OTP` 
        };
      }
    }
    
    return await createAndSendOTP(email, purpose, role);
  } catch (error) {
    logger.error('Failed to resend OTP', { error: error.message, email, purpose });
    throw error;
  }
}

//Delete verified OTP after successful signup/password reset
export async function deleteVerifiedOTP(email, purpose, role) {
  try {
    await OTPModel.deleteMany({ email, purpose, role, verified: true });
    logger.info('Verified OTP deleted', { email, purpose, role });
  } catch (error) {
    logger.error('Failed to delete verified OTP', { error: error.message, email, purpose });
    throw error;
  }
}

export default {
  createAndSendOTP,
  verifyOTP,
  isOTPVerified,
  resendOTP,
  deleteVerifiedOTP,
};
