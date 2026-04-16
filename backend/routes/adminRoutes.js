import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import adminController from "../controllers/adminController.js";

const adminRouter = Router();

// All admin routes require admin authentication
adminRouter.use(authMiddleware(["admin"]));

// ============================================
// Dashboard Analytics Routes
// ============================================
adminRouter.get("/dashboard/stats", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getDashboardStats); // Get all dashboard statistics
adminRouter.get("/dashboard/orders-per-day", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getOrdersPerDay); // Get orders per day
adminRouter.get("/dashboard/revenue-per-day", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getRevenuePerDay); // Get revenue per day
adminRouter.get("/dashboard/top-transporters", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getTopTransporters); // Get top transporters
adminRouter.get("/dashboard/order-status", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getOrderStatusDistribution); // Get order status distribution
adminRouter.get("/dashboard/fleet-utilization", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getFleetUtilization); // Get fleet utilization
adminRouter.get("/dashboard/new-customers", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getNewCustomersPerMonth); // Get new customers per month
adminRouter.get("/dashboard/truck-types", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getMostRequestedTruckTypes); // Get most requested truck types
adminRouter.get("/dashboard/order-ratio", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getPendingVsCompletedOrders); // Get pending vs completed orders
adminRouter.get("/dashboard/avg-bid", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getAverageBidAmount); // Get average bid amount

// ============================================
// Order Management Routes
// ============================================
adminRouter.get("/orders", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getAllOrders); // Get all orders with filters
adminRouter.get("/orders/:orderId", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getOrderDetails); // Get order details by ID
adminRouter.get("/orders/:orderId/bids", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getBidsForOrder); // Get bids for a specific order
adminRouter.get("/orders/:orderId/bid-count", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getBidCountForOrder); // Get bid count for an order

// ============================================
// User Management Routes
// ============================================
adminRouter.get("/users", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getAllUsers); // Get all users (customers/transporters) with filters
adminRouter.get("/users/:role/:id", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getUserDetail); // Get individual user detail
adminRouter.delete("/users/:role/:id", invalidateCacheOnSuccess(['admin', 'transporters', 'drivers']), adminController.deleteUser); // Delete a user (customer or transporter)

// ============================================
// Fleet Overview Routes
// ============================================
adminRouter.get("/fleet", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getFleetOverview); // Get all vehicles across all transporters

// ============================================
// Tickets Overview Routes
// ============================================
adminRouter.get("/tickets", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getTicketsOverview); // Get all support tickets (read-only)

// ============================================
// Manager Management Routes
// ============================================
adminRouter.get("/managers", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getAllManagers); // Get all managers with stats
adminRouter.post("/managers/invite", invalidateCacheOnSuccess(['admin', 'manager']), adminController.generateInvitationCode); // Generate invitation code
adminRouter.get("/managers/invitations", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getAllInvitationCodes); // Get all invitation codes
adminRouter.patch("/managers/:id/status", invalidateCacheOnSuccess(['admin', 'manager']), adminController.updateManagerStatus); // Activate/deactivate manager
adminRouter.patch("/managers/:id/categories", invalidateCacheOnSuccess(['admin', 'manager']), adminController.updateManagerCategories); // Update manager categories
adminRouter.delete("/managers/:id", invalidateCacheOnSuccess(['admin', 'manager']), adminController.deleteManager); // Delete a manager

// ============================================
// Threshold Configuration Routes
// ============================================
adminRouter.get("/thresholds", cacheResponse({ domain: 'admin', ttlSeconds: 30 }), adminController.getThresholdConfigs); // Get all threshold configs
adminRouter.put("/thresholds", invalidateCacheOnSuccess(['admin', 'manager']), adminController.updateThresholdConfig); // Update a threshold config
adminRouter.post("/thresholds/reset-alert", invalidateCacheOnSuccess(['admin', 'manager']), adminController.resetThresholdAlert); // Reset alert for a category
adminRouter.get("/ticket-volume", cacheResponse({ domain: 'admin', ttlSeconds: 20 }), adminController.getTicketVolumeByCategory); // Get ticket volume analytics

export default adminRouter;
