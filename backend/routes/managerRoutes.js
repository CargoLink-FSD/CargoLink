import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import managerController from "../controllers/managerController.js";

const managerRouter = Router();

// ─── Public: Registration via invitation code ────────────
managerRouter.post("/register", managerController.register);

// All other manager routes require manager authentication
managerRouter.use(authMiddleware(["manager"]));

// Manager profile
managerRouter.get("/profile", cacheResponse({ domain: 'manager', ttlSeconds: 20 }), managerController.getProfile);

// Verification queue - unified list of all pending documents (transporters + drivers)
managerRouter.get("/verification-queue", cacheResponse({ domain: 'manager', ttlSeconds: 20 }), managerController.getVerificationQueue);

// Approve a specific document (body: { entityType: 'transporter' | 'driver' })
managerRouter.patch("/verify/:id/documents/:docType/approve", invalidateCacheOnSuccess(['manager', 'admin', 'transporters', 'drivers']), managerController.approveDocument);

// Reject a specific document (body: { note: string, entityType: 'transporter' | 'driver' })
managerRouter.patch("/verify/:id/documents/:docType/reject", invalidateCacheOnSuccess(['manager', 'admin', 'transporters', 'drivers']), managerController.rejectDocument);

// Keep legacy routes for backward compatibility
managerRouter.patch("/transporters/:id/documents/:docType/approve", invalidateCacheOnSuccess(['manager', 'admin', 'transporters', 'drivers']), managerController.approveDocument);
managerRouter.patch("/transporters/:id/documents/:docType/reject", invalidateCacheOnSuccess(['manager', 'admin', 'transporters', 'drivers']), managerController.rejectDocument);

export default managerRouter;
