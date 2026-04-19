import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { cacheResponse, invalidateCacheOnSuccess } from '../middlewares/cache.js';
import ticketController from '../controllers/ticketController.js';
import ticketUpload from '../config/ticketMulter.js';
import gcsUpload from '../middlewares/gcsUpload.js';

const ticketRouter = Router();

// ─── Manager routes (MUST be above /:id to avoid param collision) ──
ticketRouter.get('/manager/all', authMiddleware(['manager']), cacheResponse({ domain: 'manager', ttlSeconds: 20 }), ticketController.getAllTickets);
ticketRouter.get('/manager/stats', authMiddleware(['manager']), cacheResponse({ domain: 'manager', ttlSeconds: 20 }), ticketController.getTicketStats);
ticketRouter.get('/manager/:id', authMiddleware(['manager']), cacheResponse({ domain: 'manager', ttlSeconds: 15 }), ticketController.managerGetTicket);
ticketRouter.post('/manager/:id/reply', authMiddleware(['manager']), invalidateCacheOnSuccess(['tickets', 'admin', 'manager']), ticketController.managerReply);
ticketRouter.patch('/manager/:id/status', authMiddleware(['manager']), invalidateCacheOnSuccess(['tickets', 'admin', 'manager']), ticketController.managerUpdateStatus);

// ─── User routes (customer + transporter + driver) ────────────────
ticketRouter.post('/', authMiddleware(['customer', 'transporter', 'driver']), ticketUpload.single('photo'), gcsUpload('ticket-attachments'), invalidateCacheOnSuccess(['tickets', 'admin', 'manager']), ticketController.createTicket);
ticketRouter.get('/my', authMiddleware(['customer', 'transporter', 'driver']), cacheResponse({ domain: 'tickets', ttlSeconds: 20 }), ticketController.getMyTickets);
ticketRouter.get('/:id', authMiddleware(['customer', 'transporter', 'driver']), cacheResponse({ domain: 'tickets', ttlSeconds: 15 }), ticketController.getTicketDetail);
ticketRouter.post('/:id/reply', authMiddleware(['customer', 'transporter', 'driver']), invalidateCacheOnSuccess(['tickets', 'admin', 'manager']), ticketController.addReply);
ticketRouter.post('/:id/reopen', authMiddleware(['customer', 'transporter', 'driver']), invalidateCacheOnSuccess(['tickets', 'admin', 'manager']), ticketController.reopenTicket);

export default ticketRouter;
