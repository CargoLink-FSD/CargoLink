import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { validate, validationSchema } from "../middlewares/validator.js";
import customerController from "../controllers/customerController.js";

const customerRouter = Router();

// Registration
customerRouter.post("/register", validate(validationSchema.customer), customerController.createCustomer);

// All routes require authentication as customer
customerRouter.use(authMiddleware(['customer']));

// Profile
customerRouter.get("/profile", customerController.getCustomerProfile); // Get profile
customerRouter.put("/profile", validate(validationSchema.updateCustomer), customerController.updateCustomerProfile); // Update profile
customerRouter.delete("/profile", customerController.deleteCustomer); // Soft delete
customerRouter.patch("/password", validate(validationSchema.password), customerController.updatePassword); // Change password

// Address
customerRouter.get("/addresses", customerController.getAddresses); // List addresses
customerRouter.post("/addresses", validate(validationSchema.address), customerController.addAddress); // Add address
customerRouter.delete("/addresses/:addressId", customerController.removeAddress); // Delete address

// Payment Methods
customerRouter.get("/payment-methods", customerController.getPaymentMethods); // List payment methods
customerRouter.post("/payment-methods", validate(validationSchema.paymentMethod), customerController.addPaymentMethod); // Add payment method
customerRouter.delete("/payment-methods/:methodId", customerController.removePaymentMethod); // Delete payment method


export default customerRouter;