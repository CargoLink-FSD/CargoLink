import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import transporterController from "../controllers/transporterController.js";

const transporterRouter = Router();

// All routes require authentication as transporter
transporterRouter.use(authMiddleware(['transporter']));

// Profile
transporterRouter.get("/profile", transporterController.getTransporterProfile); // Get profile
transporterRouter.patch("/profile", validate(validationSchema.transporter), transporterController.updateTransporterProfile); // Update profile
transporterRouter.delete("/profile", transporterController.deleteTransporter); // Soft delete
transporterRouter.patch("/update-password", transporterController.updatePassword); // Change password

// Service Locations
transporterRouter.get('/service-locations', transporterController.getServiceLocations);
transporterRouter.post(  '/service-locations',  transporterController.addServiceLocation);
transporterRouter.delete('/service-locations/:locationId', transporterController.removeServiceLocation);

// Payment Info
transporterRouter.get('payment-info', transporterController.getPaymentInfo);
transporterRouter.put('/payment-info',  transporterController.updatePaymentInfo);

// Trucks
transporterRouter.get("/trucks", transporterController.getTrucks); // List trucks
transporterRouter.post("/trucks", validate(validationSchema.truck), transporterController.addTruck); // Add truck
transporterRouter.get("/trucks/:truckId", transporterController.getTruckDetails); // Get truck details
transporterRouter.put("/trucks/:truckId", validate(validationSchema.truck), transporterController.updateTruck); // Update truck
transporterRouter.delete("/trucks/:truckId", transporterController.removeTruck); // Delete truck
transporterRouter.post("/trucks/:truckId/maintenance", validate(validationSchema.maintenance), transporterController.scheduleMaintenance); // Schedule maintenance


// transporterRouter.get("/drivers", transporterController.getDrivers); // List drivers
// transporterRouter.post("/drivers", validate(validationSchema.driver), transporterController.addDriver); // Add driver
// transporterRouter.get("/drivers/:driverId", transporterController.getDriverDetails); // Get driver details
// transporterRouter.put("/drivers/:driverId", validate(validationSchema.driver), transporterController.updateDriver); // Update driver
// transporterRouter.delete("/drivers/:driverId", transporterController.removeDriver); // Delete driver
// transporterRouter.get('/drivers/:driverId/availability', driverController.getDriverAvailability);
// transporterRouter.put('/drivers/:driverId/availability', driverController.updateDriverAvailability);

export default transporterRouter;