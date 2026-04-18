import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import notificationController from '../controllers/notificationController.js';

const notificationRouter = Router();

notificationRouter.use(authMiddleware(['customer', 'transporter', 'driver', 'admin', 'manager']));
notificationRouter.get('/poll', notificationController.pollNotifications);
notificationRouter.get('/unread-count', notificationController.getUnreadCount);

export default notificationRouter;
