import { Router } from "express";
import { authMiddleware, requireSignupVerification } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import driverController from "../controllers/driverController.js";
import profileUpload from "../config/profileMulter.js";
import driverDocUpload from "../config/driverDocMulter.js";

const driverRouter = Router();

// Registration
driverRouter.post("/register", validate(validationSchema.driver), requireSignupVerification('driver'), driverController.createDriver);

// All routes require authentication as driver
driverRouter.use(authMiddleware(['driver']));

// Dashboard
driverRouter.get("/dashboard-stats", cacheResponse({ domain: 'drivers', ttlSeconds: 20 }), driverController.getDashboardStats);

// Profile
driverRouter.get("/profile", cacheResponse({ domain: 'drivers', ttlSeconds: 20 }), driverController.getDriverProfile);
driverRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateDriver), invalidateCacheOnSuccess(['drivers', 'transporters', 'admin']), driverController.updateDriverProfile);
driverRouter.delete("/profile", invalidateCacheOnSuccess(['drivers', 'transporters', 'admin']), driverController.deleteDriver);
driverRouter.patch("/password", validate(validationSchema.password), invalidateCacheOnSuccess(['drivers']), driverController.updatePassword);

// Document upload for verification (PAN card + Driving License)
driverRouter.post(
    "/documents",
    driverDocUpload.fields([
        { name: 'pan_card', maxCount: 1 },
        { name: 'driving_license', maxCount: 1 },
    ]),
    invalidateCacheOnSuccess(['drivers', 'transporters', 'admin', 'manager']),
    driverController.uploadDocuments
);
driverRouter.get("/verification-status", cacheResponse({ domain: 'drivers', ttlSeconds: 20 }), driverController.getVerificationStatus);

// Schedule
driverRouter.get("/schedule", cacheResponse({ domain: 'drivers', ttlSeconds: 15 }), driverController.getSchedule);
driverRouter.post("/schedule/block", validate(validationSchema.scheduleBlock), invalidateCacheOnSuccess(['drivers', 'trips']), driverController.addScheduleBlock);
driverRouter.delete("/schedule/block/:blockId", invalidateCacheOnSuccess(['drivers', 'trips']), driverController.removeScheduleBlock);

// Join Transporter
driverRouter.get("/transporters", cacheResponse({ domain: 'drivers', ttlSeconds: 20, includeUser: false }), driverController.getTransporters);
driverRouter.post("/apply/:transporterId", invalidateCacheOnSuccess(['drivers', 'transporters', 'admin']), driverController.applyToTransporter);
driverRouter.get("/applications", cacheResponse({ domain: 'drivers', ttlSeconds: 15 }), driverController.getApplicationStatus);
driverRouter.delete("/application/:applicationId", invalidateCacheOnSuccess(['drivers', 'transporters', 'admin']), driverController.withdrawApplication);


export default driverRouter;