import { Router } from "express";
import chatController from '../controllers/chatController.js';
import { authMiddleware } from "../middlewares/auth.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";

const chatRouter = Router();

chatRouter.use(authMiddleware(['transporter', 'customer']));

chatRouter.post('/orders/:orderId', chatController.sendMessage);
chatRouter.get("/orders/:orderId", chatController.getChatHistory);

export default chatRouter;