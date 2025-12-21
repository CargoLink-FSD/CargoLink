import { Router } from "express";
import authRoutes from "./authRoutes.js";
import customerRoutes from "./customerRoutes.js";
import transporterRoutes from "./transporterRoutes.js";
import orderRoutes from "./orderRoutes.js";
import tripRoutes from "./tripRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import adminRoutes from "./adminRoutes.js";
import chatRoutes from "./chatRoutes.js";

const router = Router();

router.use("/api/auth", authRoutes);
router.use("/api/customers", customerRoutes);
router.use("/api/transporters", transporterRoutes);
router.use("/api/orders", orderRoutes);
router.use("/api/trips", tripRoutes);
router.use("/api/payments", paymentRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/chat", chatRoutes);

router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
    errorCode: "404_NOT_FOUND",
  });
});


export default router;
