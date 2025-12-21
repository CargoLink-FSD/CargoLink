import { Router } from "express";
import authController from "../controllers/authController.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";

const authRouter = Router();

// Login (same endpoint for both roles)
authRouter.post("/login", validate(validationSchema.login), authController.login);

// Token management
authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authController.logout);

// Password management
authRouter.post("/forgot-password", validate(validationSchema.forgotPassword), authController.forgotPassword);
authRouter.post("/verify-reset-otp", authController.verifyResetOTP);
authRouter.post("/reset-password", validate(validationSchema.resetPassword), authController.resetPassword);

// OTP management
authRouter.post("/send-signup-otp", authController.sendSignupOTP);
authRouter.post("/verify-signup-otp", authController.verifySignupOTP);
authRouter.post("/resend-otp", authController.resendOTP);

// Email verification
authRouter.get("/verify-email/:token", authController.verifyEmail);
authRouter.post("/resend-verification", authController.resendVerification);

export default authRouter;
