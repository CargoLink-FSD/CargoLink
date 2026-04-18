import { Router } from "express";
import authRoutes from "./authRoutes.js";
import customerRoutes from "./customerRoutes.js";
import transporterRoutes from "./transporterRoutes.js";
import driverRoutes from "./driverRoutes.js";
import orderRoutes from "./orderRoutes.js";
import tripRoutes from "./tripRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import adminRoutes from "./adminRoutes.js";
import managerRoutes from "./managerRoutes.js";
import chatRoutes from "./chatRoutes.js";
import ticketRoutes from "./ticketRoutes.js";
import locationRoutes from "./locationRoutes.js";
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use("/api/auth", authRoutes);
router.use("/api/customers", customerRoutes);
router.use("/api/transporters", transporterRoutes);
router.use("/api/drivers", driverRoutes);
router.use("/api/orders", orderRoutes);
router.use("/api/trips", tripRoutes);
router.use("/api/payments", paymentRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/manager", managerRoutes);
router.use("/api/chat", chatRoutes);
router.use("/api/tickets", ticketRoutes);
router.use("/api/location", locationRoutes);
router.use('/api/notifications', notificationRoutes);

router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
    errorCode: "404_NOT_FOUND",
  });
});


export default router;
