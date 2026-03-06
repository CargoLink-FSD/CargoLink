import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import tripController from "../controllers/tripController.js";

const tripRouter = Router();

// ── Transporter Routes ──────────────────────────────────────────────────────

// Resources (must be before /:tripId to avoid param collision)
tripRouter.get('/resources/assignable-orders', authMiddleware(["transporter"]), tripController.getAssignableOrders);
tripRouter.get('/resources/available-drivers', authMiddleware(["transporter"]), tripController.getAvailableDrivers);
tripRouter.get('/resources/available-vehicles', authMiddleware(["transporter"]), tripController.getAvailableVehicles);

// CRUD
tripRouter.post('/', authMiddleware(["transporter"]), tripController.createTrip);
tripRouter.get('/', authMiddleware(["transporter"]), tripController.getTrips);
tripRouter.get('/:tripId', authMiddleware(["transporter", "driver"]), tripController.getTripDetails);
tripRouter.put('/:tripId', authMiddleware(["transporter"]), tripController.updateTrip);
tripRouter.delete('/:tripId', authMiddleware(["transporter"]), tripController.deleteTrip);

// Trip lifecycle
tripRouter.post('/:tripId/cancel', authMiddleware(["transporter"]), tripController.cancelTrip);
tripRouter.post('/:tripId/complete', authMiddleware(["transporter"]), tripController.completeTrip);


// ── Driver Routes ───────────────────────────────────────────────────────────

tripRouter.get('/driver/my-trips', authMiddleware(["driver"]), tripController.getDriverTrips);
tripRouter.get('/driver/:tripId', authMiddleware(["driver"]), tripController.getDriverTripDetails);
tripRouter.post('/driver/:tripId/start', authMiddleware(["driver"]), tripController.startTrip);
tripRouter.post('/driver/:tripId/stops/:stopId/arrive', authMiddleware(["driver"]), tripController.arriveAtStop);
tripRouter.post('/driver/:tripId/stops/:stopId/confirm-pickup', authMiddleware(["driver"]), tripController.confirmPickup);
tripRouter.post('/driver/:tripId/stops/:stopId/confirm-delivery', authMiddleware(["driver"]), tripController.confirmDelivery);
tripRouter.post('/driver/:tripId/stops/:stopId/depart', authMiddleware(["driver"]), tripController.departFromStop);
tripRouter.post('/driver/:tripId/delay', authMiddleware(["driver"]), tripController.declareDelay);
tripRouter.post('/driver/:tripId/clear-delay', authMiddleware(["driver"]), tripController.clearDelay);
tripRouter.post('/driver/:tripId/location', authMiddleware(["driver"]), tripController.updateTripLocation);


// ── Customer Routes ─────────────────────────────────────────────────────────

tripRouter.get('/track/:orderId', authMiddleware(["customer"]), tripController.getOrderTracking);


export default tripRouter;
