import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
// import { validate } from "../middlewares/validate.js";
// import { paymentMethodSchema } from "../utils/validation.schemas.js";
import paymentController from "../controllers/paymentController.js";

const paymentRouter = Router();

// ===== Customer Routes =====
paymentRouter.post(
  "/orders/:orderId/initiate",
  authMiddleware(["customer"]),
  paymentController.initiatePayment
); // Initiate payment for order
paymentRouter.post(
  "/orders/:orderId/verify",
  authMiddleware(["customer"]),
  paymentController.verifyPayment
); // Verify Razorpay payment
paymentRouter.post(
  "/cancellation-dues/initiate",
  authMiddleware(["customer"]),
  paymentController.initiateCancellationDuesPayment
); // Initiate Razorpay order for cancellation dues
paymentRouter.post(
  "/cancellation-dues/verify",
  authMiddleware(["customer"]),
  paymentController.verifyCancellationDuesPayment
); // Verify dues payment and settle ledger
paymentRouter.post(
  "/orders/:orderId/review",
  authMiddleware(["customer"]),
  paymentController.submitReview
);
paymentRouter.get(
  "/orders/:orderId/review",
  authMiddleware(["customer", "transporter"]),
  paymentController.getOrderReview
);
// ===== Transporter Routes =====
paymentRouter.post(
  "/payout",
  authMiddleware(["transporter"]),
  paymentController.requestPayout
); // Request payout

// ===== Common Routes =====
paymentRouter.get(
  "/history",
  authMiddleware(["customer"], ["transporter"]),
  paymentController.getPaymentHistory
); // Get payment history
paymentRouter.get(
  "/:paymentId/invoice",
  authMiddleware(["customer"], ["transporter"]),
  paymentController.downloadInvoice
); // Download invoice

export default paymentRouter;
