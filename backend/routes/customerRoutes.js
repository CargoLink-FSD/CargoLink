import { Router } from "express";
import { authMiddleware, requireSignupVerification } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import customerController from "../controllers/customerController.js";
import profileUpload from "../config/profileMulter.js";

const customerRouter = Router();

// Registration
customerRouter.post("/register", validate(validationSchema.customer), requireSignupVerification('customer'), customerController.createCustomer);

// All routes require authentication as customer
customerRouter.use(authMiddleware(['transporter', 'customer'])); // Allow both transporter and customer for now, can be restricted to 'customer' if needed

// Dashboard
customerRouter.get("/dashboard-stats", cacheResponse({ domain: 'customer', ttlSeconds: 20 }), customerController.getDashboardStats); // Get dashboard statistics

// Profile
customerRouter.get("/profile", cacheResponse({ domain: 'customer', ttlSeconds: 20 }), customerController.getCustomerProfile); // Get profile
customerRouter.put("/profile", profileUpload.single('profilePicture'), validate(validationSchema.updateCustomer), invalidateCacheOnSuccess(['customer', 'orders', 'admin']), customerController.updateCustomerProfile); // Update profile
customerRouter.delete("/profile", invalidateCacheOnSuccess(['customer', 'orders', 'admin']), customerController.deleteCustomer); // Soft delete
customerRouter.patch("/password", validate(validationSchema.password), invalidateCacheOnSuccess(['customer']), customerController.updatePassword); // Change password

// Address
customerRouter.get("/addresses", cacheResponse({ domain: 'customer', ttlSeconds: 20 }), customerController.getAddresses); // List addresses
customerRouter.post("/addresses", validate(validationSchema.address), invalidateCacheOnSuccess(['customer']), customerController.addAddress); // Add address
customerRouter.delete("/addresses/:addressId", invalidateCacheOnSuccess(['customer']), customerController.removeAddress); // Delete address

// // Payment Methods
// customerRouter.get("/payment-methods", customerController.getPaymentMethods); // List payment methods
// customerRouter.post("/payment-methods", validate(validationSchema.paymentMethod), customerController.addPaymentMethod); // Add payment method
// customerRouter.delete("/payment-methods/:methodId", customerController.removePaymentMethod); // Delete payment method


export default customerRouter;