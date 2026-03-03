import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import managerController from "../controllers/managerController.js";

const managerRouter = Router();

// ─── Public: Registration via invitation code ────────────
managerRouter.post("/register", managerController.register);

// All other manager routes require manager authentication
managerRouter.use(authMiddleware(["manager"]));

// Manager profile
managerRouter.get("/profile", managerController.getProfile);

// Verification queue - list all transporters with documents under review
managerRouter.get("/verification-queue", managerController.getVerificationQueue);

// Approve a specific document for a transporter
managerRouter.patch("/transporters/:id/documents/:docType/approve", managerController.approveDocument);

// Reject a specific document for a transporter (body: { note: string })
managerRouter.patch("/transporters/:id/documents/:docType/reject", managerController.rejectDocument);

export default managerRouter;
