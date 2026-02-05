import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
// import { validate } from "../middlewares/validate.js";
// import { paymentMethodSchema } from "../utils/validation.schemas.js";
import paymentController from "../controllers/paymentController.js";

const paymentRouter = Router();

// ===== Customer Routes =====
paymentRouter.post('/orders/:orderId/initiate', authMiddleware(['customer']), paymentController.initiatePayment); // Initiate payment for order
paymentRouter.post('/orders/:orderId/process', authMiddleware(['customer']), paymentController.processPayment); // Process payment
paymentRouter.post('/orders/:orderId/review', authMiddleware(['customer']), paymentController.submitReview);

// ===== Transporter Routes =====
paymentRouter.post( '/payout', authMiddleware(['transporter']), paymentController.requestPayout); // Request payout

// ===== Common Routes =====
paymentRouter.get('/history', authMiddleware(["customer"], ["transporter"]), paymentController.getPaymentHistory); // Get payment history
paymentRouter.get('/:paymentId/invoice', authMiddleware(["customer"], ["transporter"]), paymentController.downloadInvoice); // Download invoice

export default paymentRouter;