import { Router } from "express";
import { authMiddleware, requireSignupVerification } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import transporterController from "../controllers/transporterController.js";
import profileUpload from "../config/profileMulter.js";
import documentUpload from "../config/documentMulter.js";

const transporterRouter = Router();


// Registration
transporterRouter.post("/register", validate(validationSchema.transporter), requireSignupVerification('transporter'), transporterController.createTransporter);


// Public profile — accessible by any authenticated user (customer or transporter)
transporterRouter.get('/:transporterId/public-profile', authMiddleware(['customer', 'transporter']), cacheResponse({ domain: 'transporters', ttlSeconds: 30, includeUser: false }), transporterController.getPublicProfile);

// All routes below require authentication as transporter
transporterRouter.use(authMiddleware(['transporter']));

// Document upload for verification (up to 10 files: pan_card, driving_license, vehicle_rc_0..N)
transporterRouter.post(
  "/documents",
  documentUpload.fields([
    { name: 'pan_card', maxCount: 1 },
    { name: 'driving_license', maxCount: 1 },
    { name: 'vehicle_rc_0', maxCount: 1 },
    { name: 'vehicle_rc_1', maxCount: 1 },
    { name: 'vehicle_rc_2', maxCount: 1 },
    { name: 'vehicle_rc_3', maxCount: 1 },
    { name: 'vehicle_rc_4', maxCount: 1 },
    { name: 'vehicle_rc_5', maxCount: 1 },
    { name: 'vehicle_rc_6', maxCount: 1 },
    { name: 'vehicle_rc_7', maxCount: 1 },
  ]),
  invalidateCacheOnSuccess(['transporters', 'drivers', 'admin', 'manager']),
  transporterController.uploadDocuments
);

// Verification status
transporterRouter.get("/verification-status", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getVerificationStatus);

// Dashboard
transporterRouter.get("/dashboard-stats", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getDashboardStats); // Get dashboard statistics

// Profile
transporterRouter.get("/profile", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getTransporterProfile); // Get profile
transporterRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateTransporter), invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.updateTransporterProfile); // Update profile
transporterRouter.delete("/profile", invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.deleteTransporter); // Soft delete
transporterRouter.patch("/password", validate(validationSchema.password), invalidateCacheOnSuccess(['transporters']), transporterController.updatePassword); // Change password

// Trucks
transporterRouter.get("/fleet", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getTrucks); // List trucks
transporterRouter.post("/fleet", validate(validationSchema.truck), invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.addTruck); // Add truck
transporterRouter.get("/fleet/:truckId", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getTruckDetails); // Get truck details
transporterRouter.put("/fleet/:truckId", validate(validationSchema.updateTruck), invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.updateTruck); // Update truck
transporterRouter.delete("/fleet/:truckId", invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.removeTruck); // Delete truck
transporterRouter.post("/fleet/:vehicleId/upload-rc", documentUpload.single('rc_file'), invalidateCacheOnSuccess(['transporters', 'admin']), transporterController.uploadVehicleRc); // Upload vehicle RC

// // Truck Status Management
// transporterRouter.post("/fleet/:truckId/set-maintenance", transporterController.setTruckMaintenance); // Set truck to maintenance
// transporterRouter.post("/fleet/:truckId/set-available", transporterController.setTruckAvailable); // Set truck to available
// transporterRouter.post("/fleet/:truckId/set-unavailable", transporterController.setTruckUnavailable); // Set truck to unavailable
// transporterRouter.post("/fleet/:truckId/schedule-maintenance", transporterController.scheduleMaintenance); // Schedule maintenance

// Fleet Schedule Management
transporterRouter.get("/fleet/:truckId/schedule", cacheResponse({ domain: 'transporters', ttlSeconds: 15 }), transporterController.getFleetSchedule); // Get truck schedule
transporterRouter.post("/fleet/:truckId/schedule/block", validate(validationSchema.fleetScheduleBlock), invalidateCacheOnSuccess(['transporters', 'trips']), transporterController.addFleetScheduleBlock); // Add schedule block
transporterRouter.delete("/fleet/:truckId/schedule/block/:blockId", invalidateCacheOnSuccess(['transporters', 'trips']), transporterController.removeFleetScheduleBlock); // Remove schedule block

//rating
transporterRouter.get('/ratings', cacheResponse({ domain: 'transporters', ttlSeconds: 30 }), transporterController.getTransporterRatings);

// Driver Management
transporterRouter.get("/drivers", cacheResponse({ domain: 'transporters', ttlSeconds: 20 }), transporterController.getDrivers); // List associated drivers
transporterRouter.get("/driver-requests", cacheResponse({ domain: 'transporters', ttlSeconds: 15 }), transporterController.getDriverRequests); // List pending applications
transporterRouter.post("/driver-requests/:applicationId/accept", invalidateCacheOnSuccess(['transporters', 'drivers', 'admin']), transporterController.acceptDriverRequest); // Accept driver application
transporterRouter.post("/driver-requests/:applicationId/reject", invalidateCacheOnSuccess(['transporters', 'drivers', 'admin']), transporterController.rejectDriverRequest); // Reject driver application
transporterRouter.delete("/drivers/:driverId", invalidateCacheOnSuccess(['transporters', 'drivers', 'admin']), transporterController.removeDriverFromCompany); // Remove driver
transporterRouter.get("/drivers/:driverId/schedule", cacheResponse({ domain: 'transporters', ttlSeconds: 15 }), transporterController.getDriverSchedule); // View driver schedule

export default transporterRouter;