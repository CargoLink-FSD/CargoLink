import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";
import orderController from "../controllers/orderController.js";

const orderRouter = Router();

// Common:
orderRouter.get("/my-orders", authMiddleware(["customer", "transporter"]), orderController.getUserOrders); // Get user-specific orders
orderRouter.get("/available", authMiddleware(["transporter"]), orderController.getActiveOrders); // List available orders for bidding
orderRouter.get("/my-bids", authMiddleware(["transporter"]), orderController.getTransporterBids); // List transporter's bids

// Orders:
orderRouter.post("/", authMiddleware(["customer"]), validate(validationSchema.order), orderController.placeOrder); // Place order (shipment/rental)
orderRouter.delete("/:orderId", authMiddleware(["customer"]), orderController.cancelOrder); // Cancel order
// orderRouter.post("/:orderId/rating", authMiddleware(["customer"]), validate(validationSchema.rating), orderController.submitRating); // Submit rating for order

orderRouter.get("/:orderId", authMiddleware(["customer", "transporter"]), orderController.getOrderDetails); // Get order details (role-filtered)

// Trips
orderRouter.post('/:orderId/confirm-pickup', authMiddleware(['transporter']), orderController.confirmPickup); // confirm order pick-up 
orderRouter.post('/:orderId/confirm-delivery', authMiddleware(['customer']), orderController.confirmDelivery); // confirm order delivery

// Bids
orderRouter.get("/:orderId/bids", authMiddleware(["customer"]), orderController.getCurrentBids); // Get bids for order
orderRouter.post("/:orderId/bids/:bidId/accept", authMiddleware(["customer"]), orderController.acceptBid); // Accept bid
orderRouter.delete("/:orderId/bids/:bidId", authMiddleware(["customer"]), orderController.rejectBid); // Reject bid

orderRouter.post("/:orderId/bids", authMiddleware(["transporter"]), validate(validationSchema.bid), orderController.submitBid); // Submit bid
orderRouter.delete( '/:orderId/bids/:bidId', authMiddleware(['transporter']), orderController.withdrawBid); // Withdraw a bid



export default orderRouter;
