import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import driverController from "../controllers/driverController.js";
import profileUpload from "../config/profileMulter.js";
import driverDocUpload from "../config/driverDocMulter.js";

const driverRouter = Router();

// Registration
driverRouter.post("/register", validate(validationSchema.driver), driverController.createDriver);

// All routes require authentication as driver
driverRouter.use(authMiddleware(['driver']));

// Dashboard
driverRouter.get("/dashboard-stats", driverController.getDashboardStats);

// Profile
driverRouter.get("/profile", driverController.getDriverProfile);
driverRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateDriver), driverController.updateDriverProfile);
driverRouter.delete("/profile", driverController.deleteDriver);
driverRouter.patch("/password", validate(validationSchema.password), driverController.updatePassword);

// Document upload for verification (PAN card + Driving License)
driverRouter.post(
    "/documents",
    driverDocUpload.fields([
        { name: 'pan_card', maxCount: 1 },
        { name: 'driving_license', maxCount: 1 },
    ]),
    driverController.uploadDocuments
);
driverRouter.get("/verification-status", driverController.getVerificationStatus);

// Schedule
driverRouter.get("/schedule", driverController.getSchedule);
driverRouter.post("/schedule/block", validate(validationSchema.scheduleBlock), driverController.addScheduleBlock);
driverRouter.delete("/schedule/block/:blockId", driverController.removeScheduleBlock);

// Join Transporter
driverRouter.get("/transporters", driverController.getTransporters);
driverRouter.post("/apply/:transporterId", driverController.applyToTransporter);
driverRouter.get("/applications", driverController.getApplicationStatus);
driverRouter.delete("/application/:applicationId", driverController.withdrawApplication);


export default driverRouter;