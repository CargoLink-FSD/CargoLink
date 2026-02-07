import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import transporterController from "../controllers/transporterController.js";
import profileUpload from "../config/profileMulter.js";

const transporterRouter = Router();


// Registration
transporterRouter.post("/register", validate(validationSchema.transporter), transporterController.createTransporter);


// All routes require authentication as transporter
transporterRouter.use(authMiddleware(['transporter']));

// Dashboard
transporterRouter.get("/dashboard-stats", transporterController.getDashboardStats); // Get dashboard statistics

// Profile
transporterRouter.get("/profile", transporterController.getTransporterProfile); // Get profile
transporterRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateTransporter), transporterController.updateTransporterProfile); // Update profile
transporterRouter.delete("/profile", transporterController.deleteTransporter); // Soft delete
transporterRouter.patch("/password", validate(validationSchema.password), transporterController.updatePassword); // Change password

// // Service Locations
// transporterRouter.get('/service-locations', transporterController.getServiceLocations);
// transporterRouter.post(  '/service-locations',  transporterController.addServiceLocation);
// transporterRouter.delete('/service-locations/:locationId', transporterController.removeServiceLocation);

// // Payment Info
// transporterRouter.get('payment-info', transporterController.getPaymentInfo);
// transporterRouter.put('/payment-info',  transporterController.updatePaymentInfo);

// Trucks
transporterRouter.get("/fleet", transporterController.getTrucks); // List trucks
transporterRouter.post("/fleet", validate(validationSchema.truck), transporterController.addTruck); // Add truck
transporterRouter.get("/fleet/:truckId", transporterController.getTruckDetails); // Get truck details
transporterRouter.put("/fleet/:truckId", validate(validationSchema.updateTruck), transporterController.updateTruck); // Update truck
transporterRouter.delete("/fleet/:truckId", transporterController.removeTruck); // Delete truck

// Truck Status Management
transporterRouter.post("/fleet/:truckId/set-maintenance", transporterController.setTruckMaintenance); // Set truck to maintenance
transporterRouter.post("/fleet/:truckId/set-available", transporterController.setTruckAvailable); // Set truck to available
transporterRouter.post("/fleet/:truckId/set-unavailable", transporterController.setTruckUnavailable); // Set truck to unavailable
transporterRouter.post("/fleet/:truckId/schedule-maintenance", transporterController.scheduleMaintenance); // Schedule maintenance
//rating
transporterRouter.get('/ratings',transporterController.getTransporterRatings);

// transporterRouter.get("/drivers", transporterController.getDrivers); // List drivers
// transporterRouter.post("/drivers", validate(validationSchema.driver), transporterController.addDriver); // Add driver
// transporterRouter.get("/drivers/:driverId", transporterController.getDriverDetails); // Get driver details
// transporterRouter.put("/drivers/:driverId", validate(validationSchema.driver), transporterController.updateDriver); // Update driver
// transporterRouter.delete("/drivers/:driverId", transporterController.removeDriver); // Delete driver
// transporterRouter.get('/drivers/:driverId/availability', driverController.getDriverAvailability);
// transporterRouter.put('/drivers/:driverId/availability', driverController.updateDriverAvailability);

export default transporterRouter;