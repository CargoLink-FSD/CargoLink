import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import transporterController from "../controllers/transporterController.js";
import profileUpload from "../config/profileMulter.js";
import documentUpload from "../config/documentMulter.js";

const transporterRouter = Router();


// Registration
transporterRouter.post("/register", validate(validationSchema.transporter), transporterController.createTransporter);


// Public profile — accessible by any authenticated user (customer or transporter)
transporterRouter.get('/:transporterId/public-profile', authMiddleware(['customer', 'transporter']), transporterController.getPublicProfile);

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
  transporterController.uploadDocuments
);

// Verification status
transporterRouter.get("/verification-status", transporterController.getVerificationStatus);

// Dashboard
transporterRouter.get("/dashboard-stats", transporterController.getDashboardStats); // Get dashboard statistics

// Profile
transporterRouter.get("/profile", transporterController.getTransporterProfile); // Get profile
transporterRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateTransporter), transporterController.updateTransporterProfile); // Update profile
transporterRouter.delete("/profile", transporterController.deleteTransporter); // Soft delete
transporterRouter.patch("/password", validate(validationSchema.password), transporterController.updatePassword); // Change password

// Trucks
transporterRouter.get("/fleet", transporterController.getTrucks); // List trucks
transporterRouter.post("/fleet", validate(validationSchema.truck), transporterController.addTruck); // Add truck
transporterRouter.get("/fleet/:truckId", transporterController.getTruckDetails); // Get truck details
transporterRouter.put("/fleet/:truckId", validate(validationSchema.updateTruck), transporterController.updateTruck); // Update truck
transporterRouter.delete("/fleet/:truckId", transporterController.removeTruck); // Delete truck
transporterRouter.post("/fleet/:vehicleId/upload-rc", documentUpload.single('rc_file'), transporterController.uploadVehicleRc); // Upload vehicle RC

// Truck Status Management
transporterRouter.post("/fleet/:truckId/set-maintenance", transporterController.setTruckMaintenance); // Set truck to maintenance
transporterRouter.post("/fleet/:truckId/set-available", transporterController.setTruckAvailable); // Set truck to available
transporterRouter.post("/fleet/:truckId/set-unavailable", transporterController.setTruckUnavailable); // Set truck to unavailable
transporterRouter.post("/fleet/:truckId/schedule-maintenance", transporterController.scheduleMaintenance); // Schedule maintenance

// Fleet Schedule Management
transporterRouter.get("/fleet/:truckId/schedule", transporterController.getFleetSchedule); // Get truck schedule
transporterRouter.post("/fleet/:truckId/schedule/block", validate(validationSchema.fleetScheduleBlock), transporterController.addFleetScheduleBlock); // Add schedule block
transporterRouter.delete("/fleet/:truckId/schedule/block/:blockId", transporterController.removeFleetScheduleBlock); // Remove schedule block

//rating
transporterRouter.get('/ratings', transporterController.getTransporterRatings);

// Driver Management
transporterRouter.get("/drivers", transporterController.getDrivers); // List associated drivers
transporterRouter.get("/driver-requests", transporterController.getDriverRequests); // List pending applications
transporterRouter.post("/driver-requests/:applicationId/accept", transporterController.acceptDriverRequest); // Accept driver application
transporterRouter.post("/driver-requests/:applicationId/reject", transporterController.rejectDriverRequest); // Reject driver application
transporterRouter.delete("/drivers/:driverId", transporterController.removeDriverFromCompany); // Remove driver
transporterRouter.get("/drivers/:driverId/schedule", transporterController.getDriverSchedule); // View driver schedule

export default transporterRouter;