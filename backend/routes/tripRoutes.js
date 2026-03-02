import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
// import tripController from "../controllers/tripController.js";


const tripRouter = Router();

// tripRouter.get('/:tripId', authMiddleware(["transporter", "driver"]),  tripController.getTripInfo); // Get specific trip details

// // Transporter CRUD
// tripRouter.post('/', authMiddleware(["transporter"]), validate(validationSchema.trip),  tripController.createTrip); // Create new trip
// tripRouter.get('/', authMiddleware(["transporter"]), tripController.getTrips); // Get all trips
// tripRouter.put('/:tripId', authMiddleware(["transporter"]), validate(validationSchema.updateTrip),  tripController.updateTrip); // Update trip
// tripRouter.delete('/:tripId', authMiddleware(["transporter"]), tripController.deleteTrip); // Delete trip


// // Auto-assign orders (algorithm) probably not used
// tripRouter.post('/:tripId/auto-assign', tripController.autoAssignOrders);


// // Driver View and Actions 
// tripRouter.get("/my-trips", tripController.getTrips); // View all trips assigned to the driver
// tripRouter.post(":tripId/confirm-pickup", tripController.confirmPickup); // Confirm order pick-up
// tripRouter.post(":tripId/confirm-delivery", tripController.confirmDelivery); // Confirm delivery completion
// tripRouter.post(":tripId/update-location", validate(validationSchema.location), tripController.updateCurrentLocation); // Update current location during transit
// tripRouter.post(":tripId/report-deley", validate(validationSchema.delay), tripController.reportDelay); // Report delay or issue during transit


export default tripRouter;
