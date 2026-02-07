import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import tripController from "../controllers/tripController.js";

/**
 * Trip Routes
 * Implements the trip-centric REST API.
 * All routes require transporter authentication.
 * 
 * API Structure:
 * POST   /api/trips                           → create trip (Planned)
 * GET    /api/trips                           → list trips with filters
 * GET    /api/trips/:id                       → get trip details
 * DELETE /api/trips/:id                       → delete trip (Planned only)
 * 
 * POST   /api/trips/:id/vehicle               → assign vehicle
 * POST   /api/trips/:id/orders                → add orders
 * POST   /api/trips/:id/schedule              → schedule trip (generate stops)
 * POST   /api/trips/:id/start                 → start trip (InTransit)
 * 
 * POST   /api/trips/:id/stops/:seq/arrive     → mark arrival at stop
 * POST   /api/trips/:id/stops/:seq/confirm-pickup   → confirm pickup with OTP
 * POST   /api/trips/:id/stops/:seq/confirm-dropoff  → confirm dropoff
 * 
 * POST   /api/trips/:id/complete              → complete trip
 */

const tripRouter = Router();

// All trip routes require transporter authentication
tripRouter.use(authMiddleware(["transporter"]));

// ==================== TRIP CRUD ====================

// Create a new trip
tripRouter.post("/", tripController.createTrip);

// Get all trips for transporter (with optional filters)
tripRouter.get("/", tripController.getTrips);

// Get detailed trip information
tripRouter.get("/:id", tripController.getTripDetails);

// Delete a trip (Planned only)
tripRouter.delete("/:id", tripController.deleteTrip);

// ==================== TRIP PLANNING ====================

// Assign a vehicle to the trip
tripRouter.post("/:id/vehicle", tripController.assignVehicle);

// Add orders to the trip
tripRouter.post("/:id/orders", tripController.addOrders);

// Schedule the trip (lock in orders, generate stops)
tripRouter.post("/:id/schedule", tripController.scheduleTrip);

// ==================== TRIP EXECUTION ====================

// Start the trip (transition to InTransit)
tripRouter.post("/:id/start", tripController.startTrip);

// Mark arrival at a stop
tripRouter.post("/:id/stops/:seq/arrive", tripController.arriveAtStop);

// Confirm pickup with OTP validation
tripRouter.post("/:id/stops/:seq/confirm-pickup", tripController.confirmPickup);

// Confirm dropoff (no OTP required)
tripRouter.post("/:id/stops/:seq/confirm-dropoff", tripController.confirmDropoff);

// Complete the trip
tripRouter.post("/:id/complete", tripController.completeTrip);

export default tripRouter;
