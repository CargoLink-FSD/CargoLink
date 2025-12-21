import nodemailer from 'nodemailer';
import { logger } from './misc.js';

// Create reusable transporter object using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
    user: "cargolink.logistcs@gmail.com",
    pass: "zrpt aldt sylq qdty"
  }
  });
};

export async function sendOTPEmail(to, otp, purpose = 'signup') {
  try {
    const transporter = createTransporter();

    const subject = purpose === 'signup' 
      ? 'Verify Your CargoLink Account' 
      : 'Reset Your CargoLink Password';

    const html = purpose === 'signup'
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .otp-box { background-color: white; border: 2px solid #2563eb; border-radius: 8px; 
                       padding: 20px; text-align: center; font-size: 32px; font-weight: bold; 
                       letter-spacing: 8px; color: #2563eb; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to CargoLink!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up with CargoLink. To complete your registration, please use the following OTP:</p>
              <div class="otp-box">${otp}</div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <div class="warning">
                <strong>Security Notice:</strong> Never share this OTP with anyone. CargoLink will never ask for your OTP via phone or email.
              </div>
            </div>
            <div class="footer">
              <p>If you didn't create a CargoLink account, please ignore this email.</p>
              <p>&copy; 2025 CargoLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .otp-box { background-color: white; border: 2px solid #dc2626; border-radius: 8px; 
                       padding: 20px; text-align: center; font-size: 32px; font-weight: bold; 
                       letter-spacing: 8px; color: #dc2626; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your CargoLink password. Use the following OTP to proceed:</p>
              <div class="otp-box">${otp}</div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 CargoLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    const mailOptions = {
      from: `"CargoLink" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('OTP email sent successfully', { messageId: info.messageId, to });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send OTP email', { error: error.message, to });
    throw error;
  }
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default {
  sendOTPEmail,
  generateOTP,
};
