import { Router } from "express";
// import { tripController } from "../controllers/tripController.js";
import { authMiddleware } from "../middlewares/auth.js";
// import { validate } from "../middlewares/validator.js";

const tripRouter = Router();

tripRouter.use(authMiddleware);

// // ===== Transporter Routes =====
// // Create trip
// tripRouter.post(  '/',  roleMiddleware(['transporter']),  validationMiddleware(tripValidator.createTrip),  tripController.createTrip);

// // Get my trips
// tripRouter.get(  '/my-trips',  roleMiddleware(['transporter']),  tripController.getMyTrips);

// // Update trip
// tripRouter.put(  '/:tripId',  roleMiddleware(['transporter']),  validationMiddleware(tripValidator.updateTrip),  tripController.updateTrip);

// // Delete trip
// tripRouter.delete(  '/:tripId',  roleMiddleware(['transporter']),  tripController.deleteTrip);

// // Assign order to trip
// tripRouter.post(  '/:tripId/assign-order',  roleMiddleware(['transporter']),  validationMiddleware(tripValidator.assignOrder),  tripController.assignOrder);

// // Remove order from trip
// tripRouter.delete(  '/:tripId/orders/:orderId',  roleMiddleware(['transporter']),  tripController.removeOrderFromTrip);

// // Auto-assign orders (algorithm)
// tripRouter.post(  '/:tripId/auto-assign',  roleMiddleware(['transporter']),  tripController.autoAssignOrders);

// // Get optimization suggestions
// tripRouter.get(  '/:tripId/optimize',  roleMiddleware(['transporter']),  tripController.getOptimizationSuggestions);

// // Start trip
// tripRouter.post(  '/:tripId/start',  roleMiddleware(['transporter']),  tripController.startTrip);

// // Complete trip
// tripRouter.post(  '/:tripId/complete',  roleMiddleware(['transporter']),  tripController.completeTrip);

// // Update trip status
// tripRouter.put(  '/:tripId/status',  roleMiddleware(['transporter']),  validationMiddleware(tripValidator.updateStatus),  tripController.updateTripStatus);

// // ===== Customer Routes =====
// // Get trips for my order
// tripRouter.get(  '/order/:orderId',  roleMiddleware(['customer']),  tripController.getTripsForOrder);

// // ===== Common Routes =====
// // Get trip details (filtered by role)
// tripRouter.get(  '/:tripId',  tripController.getTripDetails);



import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { tripSchema, assignmentSchema } from "../utils/validation.schemas.js";
import * as tripController from "../controllers/tripController.js";

const router = Router();

// Transporter routes
router.post("/", authMiddleware(["transporter"]), validate(tripSchema), tripController.createTrip); // Manual trip creation
router.post("/suggest", authMiddleware(["transporter"]), tripController.suggestTripAssignments); // Suggest automated assignments
router.patch("/:tripId", authMiddleware(["transporter"]), validate(assignmentSchema), tripController.editTripAssignment); // Edit trip (truck/driver/orders)
router.delete("/:tripId", authMiddleware(["transporter"]), tripController.deleteTrip); // Delete trip
router.post("/:tripId/pickups", authMiddleware(["transporter"]), tripController.addPickup); // Add pickup location
router.post("/:tripId/dropoffs", authMiddleware(["transporter"]), tripController.addDropoff); // Add dropoff location
router.patch("/:tripId/status", authMiddleware(["transporter"]), tripController.updateTripStatus); // Update status (e.g., started, completed)

// Customer routes
router.get("/my-orders/:orderId/trip", authMiddleware(["customer"]), tripController.getTripForOrder); // Get trip details for customer's order (filtered)
router.post("/my-orders/:orderId/trip/confirm-pickup", authMiddleware(["customer"]), tripController.confirmPickup); // Confirm pickup
router.post("/my-orders/:orderId/trip/confirm-delivery", authMiddleware(["customer"]), tripController.confirmDelivery); // Confirm delivery (or rental arrival)

// // Driver routes moved to driverRoutes.js; location updates via WebSocket

// // not decided yet .... 

export default tripRouter;
