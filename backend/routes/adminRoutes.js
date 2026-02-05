import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import adminController from "../controllers/adminController.js";

const adminRouter = Router();

// All admin routes require admin authentication
adminRouter.use(authMiddleware(["admin"]));

// ============================================
// Dashboard Analytics Routes
// ============================================
adminRouter.get("/dashboard/stats", adminController.getDashboardStats); // Get all dashboard statistics
adminRouter.get("/dashboard/orders-per-day", adminController.getOrdersPerDay); // Get orders per day
adminRouter.get("/dashboard/revenue-per-day", adminController.getRevenuePerDay); // Get revenue per day
adminRouter.get("/dashboard/top-transporters", adminController.getTopTransporters); // Get top transporters
adminRouter.get("/dashboard/order-status", adminController.getOrderStatusDistribution); // Get order status distribution
adminRouter.get("/dashboard/fleet-utilization", adminController.getFleetUtilization); // Get fleet utilization
adminRouter.get("/dashboard/new-customers", adminController.getNewCustomersPerMonth); // Get new customers per month
adminRouter.get("/dashboard/truck-types", adminController.getMostRequestedTruckTypes); // Get most requested truck types
adminRouter.get("/dashboard/order-ratio", adminController.getPendingVsCompletedOrders); // Get pending vs completed orders
adminRouter.get("/dashboard/avg-bid", adminController.getAverageBidAmount); // Get average bid amount

// ============================================
// Order Management Routes
// ============================================
adminRouter.get("/orders", adminController.getAllOrders); // Get all orders with filters
adminRouter.get("/orders/:orderId", adminController.getOrderDetails); // Get order details by ID
adminRouter.get("/orders/:orderId/bids", adminController.getBidsForOrder); // Get bids for a specific order
adminRouter.get("/orders/:orderId/bid-count", adminController.getBidCountForOrder); // Get bid count for an order

// ============================================
// User Management Routes
// ============================================
adminRouter.get("/users", adminController.getAllUsers); // Get all users (customers/transporters) with filters
adminRouter.delete("/users/:role/:id", adminController.deleteUser); // Delete a user (customer or transporter)

export default adminRouter;
