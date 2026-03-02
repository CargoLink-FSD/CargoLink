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
// driverRouter.get("/transporters", driverController.getTransporters); // Get list of transporters (for driver applications)
// driverRouter.get("/transporters/:transporterId", driverController.getTransporterDetails); // Get transporter details for application
// driverRouter.post("/apply/:transporterId", driverController.applyToTransporter); // Apply to become driver for a transporter
// driverRouter.get("/schedule", driverController.getSchedule); // View upcoming schedule
// driverRouter.post("/schedule/update", validate(validationSchema.schedule), driverController.updateSchedule); // Update availability schedule



export default driverRouter;