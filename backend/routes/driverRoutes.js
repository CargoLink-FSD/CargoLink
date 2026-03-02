import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import driverController from "../controllers/driverController.js";
import profileUpload from "../config/profileMulter.js";

const driverRouter = Router();

// Registration
driverRouter.post("/register", validate(validationSchema.driver), driverController.createDriver);

// All routes require authentication as customer
driverRouter.use(authMiddleware(['driver']));

// Dashboard
driverRouter.get("/dashboard-stats", driverController.getDashboardStats); // Get dashboard statistics


// Profile
driverRouter.get("/profile", driverController.getDriverProfile); // Get profile
driverRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateDriver), driverController.updateDriverProfile); // Update profile
driverRouter.delete("/profile", driverController.deleteDriver); // Soft delete
driverRouter.patch("/password", validate(validationSchema.password), driverController.updatePassword); // Change password

// Schedule
driverRouter.get("/schedule", driverController.getSchedule); // Get schedule (query: startDate, endDate)
driverRouter.post("/schedule/block", validate(validationSchema.scheduleBlock), driverController.addScheduleBlock); // Add unavailable block
driverRouter.delete("/schedule/block/:blockId", driverController.removeScheduleBlock); // Remove unavailable block

// Join Transporter
driverRouter.get("/transporters", driverController.getTransporters); // List all transporters
driverRouter.post("/apply/:transporterId", driverController.applyToTransporter); // Apply to join a transporter
driverRouter.get("/applications", driverController.getApplicationStatus); // Get application statuses
driverRouter.delete("/application/:applicationId", driverController.withdrawApplication); // Withdraw application


export default driverRouter;