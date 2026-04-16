import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import locationController from "../controllers/locationController.js";
import { invalidateCacheOnSuccess } from "../middlewares/cache.js";

const locationRouter = Router();

// Calculate distance between pickup and delivery addresses (authenticated customers)
locationRouter.post(
    "/calculate-distance",
    authMiddleware(["customer"]),
    invalidateCacheOnSuccess(['orders']),
    locationController.calculateDistance
);

export default locationRouter;
