import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
// import { validate } from "../middlewares/validate.js";
// import { paymentMethodSchema } from "../utils/validation.schemas.js";
import paymentController from "../controllers/paymentController.js";

const paymentRouter = Router();

// ===== Customer Routes =====
paymentRouter.post(
  "/orders/:orderId/initiate",
  authMiddleware(["customer"]),
  invalidateCacheOnSuccess(['orders', 'admin']),
  paymentController.initiatePayment
); // Initiate payment for order
paymentRouter.post(
  "/orders/:orderId/verify",
  authMiddleware(["customer"]),
  invalidateCacheOnSuccess(['orders', 'admin']),
  paymentController.verifyPayment
); // Verify Razorpay payment
paymentRouter.post(
  "/cancellation-dues/initiate",
  authMiddleware(["customer"]),
  invalidateCacheOnSuccess(['orders', 'admin']),
  paymentController.initiateCancellationDuesPayment
); // Initiate Razorpay order for cancellation dues
paymentRouter.post(
  "/cancellation-dues/verify",
  authMiddleware(["customer"]),
  invalidateCacheOnSuccess(['orders', 'admin']),
  paymentController.verifyCancellationDuesPayment
); // Verify dues payment and settle ledger
paymentRouter.post(
  "/orders/:orderId/review",
  authMiddleware(["customer"]),
  invalidateCacheOnSuccess(['orders', 'admin']),
  paymentController.submitReview
);
paymentRouter.get(
  "/orders/:orderId/review",
  authMiddleware(["customer", "transporter"]),
  cacheResponse({ domain: 'orders', ttlSeconds: 20 }),
  paymentController.getOrderReview
);
// ===== Transporter Routes =====
paymentRouter.post(
  "/payout",
  authMiddleware(["transporter"]),
  invalidateCacheOnSuccess(['orders', 'admin', 'transporters']),
  paymentController.requestPayout
); // Request payout

// ===== Common Routes =====
paymentRouter.get(
  "/history",
  authMiddleware(["customer"], ["transporter"]),
  cacheResponse({ domain: 'orders', ttlSeconds: 15 }),
  paymentController.getPaymentHistory
); // Get payment history
paymentRouter.get(
  "/:paymentId/invoice",
  authMiddleware(["customer"], ["transporter"]),
  cacheResponse({ domain: 'orders', ttlSeconds: 30 }),
  paymentController.downloadInvoice
); // Download invoice

export default paymentRouter;
