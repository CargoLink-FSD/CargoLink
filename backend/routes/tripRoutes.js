import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import tripController from "../controllers/tripController.js";


const tripRouter = Router();

tripRouter.use(authMiddleware(["transporter"]));

// // ===== Transporter Routes =====

// Create trip
tripRouter.post('/', validate(validationSchema.trip),  tripController.createTrip);

// Get my trips
tripRouter.get('/', tripController.getTrips);

// Get trip details
tripRouter.get('/:tripId',  tripController.getTripDetails);

// Update trip
tripRouter.put('/:tripId', validate(validationSchema.updateTrip),  tripController.updateTrip);

// Delete trip
tripRouter.delete('/:tripId', tripController.deleteTrip);

// Assign order to trip
tripRouter.post('/:tripId/assign-order', validate(validationSchema.tripAssignOrder),  tripController.assignOrder);

// Remove order from trip
tripRouter.delete('/:tripId/orders/:orderId', tripController.removeOrderFromTrip);

// Assign truck to trip
tripRouter.post('/:tripId/assign-truck', validate(validationSchema.tripAssignTruck),  tripController.assignTruck);

// Remove order from trip
tripRouter.post('/:tripId/unassign-truck', tripController.unassignTruck);



// Auto-assign orders (algorithm)
tripRouter.post('/:tripId/auto-assign', tripController.autoAssignOrders);

// Get trip schedule
tripRouter.post('/:tripId/schedule', tripController.scheduleTrip);

// Start trip
tripRouter.post('/:tripId/start', tripController.startTrip);

// Update Location
tripRouter.post('/:tripId/location', validate(validationSchema.tripLocation),  tripController.updateTripLocation);

// Complete trip
tripRouter.post('/:tripId/complete', tripController.completeTrip);

// Update trip status
tripRouter.put('/:tripId/status', validate(validationSchema.tripStatus),  tripController.updateTripStatus);


export default tripRouter;
