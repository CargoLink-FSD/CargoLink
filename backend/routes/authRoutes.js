import { Router } from "express";
import authController from "../controllers/authController.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";

const authRouter = Router();

// Signup OTP verification flow (signup-only 2FA)
authRouter.post("/signup/send-otp", validate(validationSchema.signupOtpRequest), authController.requestSignupOtp);
authRouter.post("/signup/verify-otp", validate(validationSchema.signupOtpVerify), authController.verifySignupOtp);

// Login (same endpoint for both roles)
authRouter.post("/login", validate(validationSchema.login), authController.login);

// Token management
authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authController.logout);

// Password management
authRouter.post("/forgot-password", validate(validationSchema.forgotPassword), authController.forgotPassword);
authRouter.post("/reset-password/:token", validate(validationSchema.resetPassword), authController.resetPassword);

// Email verification
authRouter.get("/verify-email/:token", authController.verifyEmail);
authRouter.post("/resend-verification", authController.resendVerification);

// Google OAuth routes
authRouter.post("/google-login", authController.googleLogin);
authRouter.post("/google-verify", authController.googleVerify);

export default authRouter;
