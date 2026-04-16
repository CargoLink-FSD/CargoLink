import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import tripController from "../controllers/tripController.js";

const tripRouter = Router();

// ── Transporter Routes ──────────────────────────────────────────────────────

// Resources (must be before /:tripId to avoid param collision)
tripRouter.get('/resources/assignable-orders', authMiddleware(["transporter"]), cacheResponse({ domain: 'trips', ttlSeconds: 20 }), tripController.getAssignableOrders);
tripRouter.get('/resources/available-drivers', authMiddleware(["transporter"]), cacheResponse({ domain: 'trips', ttlSeconds: 20 }), tripController.getAvailableDrivers);
tripRouter.get('/resources/available-vehicles', authMiddleware(["transporter"]), cacheResponse({ domain: 'trips', ttlSeconds: 20 }), tripController.getAvailableVehicles);

// CRUD
tripRouter.post('/', authMiddleware(["transporter"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.createTrip);
tripRouter.get('/', authMiddleware(["transporter"]), cacheResponse({ domain: 'trips', ttlSeconds: 20 }), tripController.getTrips);
tripRouter.get('/:tripId', authMiddleware(["transporter", "driver"]), cacheResponse({ domain: 'trips', ttlSeconds: 15 }), tripController.getTripDetails);
tripRouter.put('/:tripId', authMiddleware(["transporter"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.updateTrip);
tripRouter.delete('/:tripId', authMiddleware(["transporter"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.deleteTrip);

// Trip lifecycle
tripRouter.post('/:tripId/cancel', authMiddleware(["transporter"]), validate(validationSchema.transporterTripCancellation), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.cancelTrip);
tripRouter.post('/:tripId/complete', authMiddleware(["transporter"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.completeTrip);


// ── Driver Routes ───────────────────────────────────────────────────────────

tripRouter.get('/driver/my-trips', authMiddleware(["driver"]), cacheResponse({ domain: 'trips', ttlSeconds: 20 }), tripController.getDriverTrips);
tripRouter.get('/driver/:tripId', authMiddleware(["driver"]), cacheResponse({ domain: 'trips', ttlSeconds: 15 }), tripController.getDriverTripDetails);
tripRouter.post('/driver/:tripId/start', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.startTrip);
tripRouter.post('/driver/:tripId/stops/:stopId/arrive', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips', 'orders']), tripController.arriveAtStop);
tripRouter.post('/driver/:tripId/stops/:stopId/confirm-pickup', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.confirmPickup);
tripRouter.post('/driver/:tripId/stops/:stopId/confirm-delivery', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips', 'orders', 'admin']), tripController.confirmDelivery);
tripRouter.post('/driver/:tripId/stops/:stopId/depart', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips', 'orders']), tripController.departFromStop);
tripRouter.post('/driver/:tripId/delay', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips']), tripController.declareDelay);
tripRouter.post('/driver/:tripId/clear-delay', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips']), tripController.clearDelay);
tripRouter.post('/driver/:tripId/location', authMiddleware(["driver"]), invalidateCacheOnSuccess(['trips']), tripController.updateTripLocation);


// ── Customer Routes ─────────────────────────────────────────────────────────

tripRouter.get('/track/:orderId', authMiddleware(["customer"]), cacheResponse({ domain: 'trips', ttlSeconds: 10 }), tripController.getOrderTracking);


export default tripRouter;
