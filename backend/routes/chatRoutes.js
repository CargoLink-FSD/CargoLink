import { Router } from "express";
import chatController from '../controllers/chatController.js';
import { authMiddleware } from "../middlewares/auth.js";
import { cacheResponse, invalidateCacheOnSuccess } from "../middlewares/cache.js";
import { validate } from "../middlewares/validator.js";
import { validationSchema } from "../middlewares/validator.js";

const chatRouter = Router();

chatRouter.use(authMiddleware(['transporter', 'customer']));

chatRouter.post('/orders/:orderId', invalidateCacheOnSuccess(['chat']), chatController.sendMessage);
chatRouter.get("/orders/:orderId", cacheResponse({ domain: 'chat', ttlSeconds: 10 }), chatController.getChatHistory);

export default chatRouter;