import { Router } from "express";
import authController from "../controllers/authController.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";

const authRouter = Router();

// authRouter.post("/register/transporter", validate(transporterSchema), authController.registerTransporter);
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

export default authRouter;
