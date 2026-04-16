import { Router } from "express";
import { authMiddleware, requireVerified } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import orderController from "../controllers/orderController.js";
import upload from "../config/multer.js";

const orderRouter = Router();

// Middleware to parse JSON strings from FormData
const parseFormDataJSON = (req, res, next) => {
    if (req.body.pickup) {
        try {
            req.body.pickup = JSON.parse(req.body.pickup);
        } catch (e) {
            // Already an object, skip
        }
    }
    if (req.body.delivery) {
        try {
            req.body.delivery = JSON.parse(req.body.delivery);
        } catch (e) {
            // Already an object, skip
        }
    }
    if (req.body.pickup_coordinates) {
        try {
            req.body.pickup_coordinates = JSON.parse(req.body.pickup_coordinates);
        } catch (e) {
            // Already an object, skip
        }
    }
    if (req.body.delivery_coordinates) {
        try {
            req.body.delivery_coordinates = JSON.parse(req.body.delivery_coordinates);
        } catch (e) {
            // Already an object, skip
        }
    }
    if (req.body.shipments) {
        try {
            req.body.shipments = JSON.parse(req.body.shipments);
        } catch (e) {
            // Already an array, skip
        }
    }

    // Convert numeric fields from strings to numbers
    if (req.body.distance) req.body.distance = parseFloat(req.body.distance);
    if (req.body.max_price) req.body.max_price = parseFloat(req.body.max_price);
    if (req.body.weight) req.body.weight = parseFloat(req.body.weight);

    next();
};

// Price estimation — open to any authenticated user (customer placing order)
// POST body: { distance, vehicle_type, weight, volume?, goods_type?,
//              cargo_value?, insurance_tier?, originCoords?, destCoords? }
// Fetches live toll data from Google Maps Routes API and returns full breakdown.
orderRouter.post("/estimate-price", authMiddleware(["customer"]), orderController.estimatePrice);

// Common:
orderRouter.get("/my-orders", authMiddleware(["customer", "transporter"]), cacheResponse({ domain: 'orders', ttlSeconds: 20 }), orderController.getUserOrders); // Get user-specific orders
orderRouter.get("/available", authMiddleware(["transporter"]), cacheResponse({ domain: 'orders', ttlSeconds: 20 }), orderController.getActiveOrders); // List available orders for bidding
orderRouter.get("/my-bids", authMiddleware(["transporter"]), cacheResponse({ domain: 'bids', ttlSeconds: 20 }), orderController.getTransporterBids); // List transporter's bids

// Orders:
orderRouter.post("/", authMiddleware(["customer"]), upload.single('cargo_photo'), parseFormDataJSON, validate(validationSchema.order), invalidateCacheOnSuccess(['orders', 'admin']), orderController.placeOrder); // Place order (shipment/rental)
orderRouter.get('/cancellation-dues', authMiddleware(["customer"]), cacheResponse({ domain: 'orders', ttlSeconds: 15 }), orderController.getCancellationDues); // Get cancellation dues summary
orderRouter.delete("/:orderId", authMiddleware(["customer"]), validate(validationSchema.customerCancelOrder), invalidateCacheOnSuccess(['orders', 'bids', 'trips', 'admin']), orderController.cancelOrder); // Cancel order
// orderRouter.post("/:orderId/rating", authMiddleware(["customer"]), validate(validationSchema.rating), orderController.submitRating); // Submit rating for order

orderRouter.get("/:orderId", authMiddleware(["customer", "transporter"]), cacheResponse({ domain: 'orders', ttlSeconds: 20 }), orderController.getOrderDetails); // Get order details (role-filtered)

// Bids
orderRouter.get("/:orderId/bids", authMiddleware(["customer"]), cacheResponse({ domain: 'bids', ttlSeconds: 20 }), orderController.getCurrentBids); // Get bids for order
orderRouter.get("/:orderId/bids/:bidId/quote-pdf", authMiddleware(["customer"]), orderController.downloadBidQuotePdf); // Download bid quote as PDF
orderRouter.post("/:orderId/bids/:bidId/accept", authMiddleware(["customer"]), invalidateCacheOnSuccess(['orders', 'bids', 'trips', 'admin']), orderController.acceptBid); // Accept bid
orderRouter.delete("/:orderId/bids/:bidId", authMiddleware(["customer"]), invalidateCacheOnSuccess(['orders', 'bids', 'admin']), orderController.rejectBid); // Reject bid

orderRouter.post("/:orderId/bids", authMiddleware(["transporter"]), requireVerified, validate(validationSchema.bid), invalidateCacheOnSuccess(['orders', 'bids', 'admin']), orderController.submitBid); // Submit bid
orderRouter.delete('/:orderId/bids/:bidId', authMiddleware(['transporter']), invalidateCacheOnSuccess(['orders', 'bids', 'admin']), orderController.withdrawBid); // Withdraw a bid



export default orderRouter;
