import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { cacheResponse, invalidateCacheOnSuccess } from '../middlewares/cache.js';
import notificationController from '../controllers/notificationController.js';

const notificationRouter = Router();

notificationRouter.use(authMiddleware(['customer', 'transporter', 'driver', 'admin', 'manager']));
// Poll drains queued notifications, so it must not be cached.
notificationRouter.get('/poll', invalidateCacheOnSuccess(['notifications']), notificationController.pollNotifications);
notificationRouter.get('/unread-count', cacheResponse({ domain: 'notifications', ttlSeconds: 5 }), notificationController.getUnreadCount);

export default notificationRouter;
