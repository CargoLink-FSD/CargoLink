import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import ticketController from '../controllers/ticketController.js';
import ticketUpload from '../config/ticketMulter.js';

const ticketRouter = Router();

// ─── User routes (customer + transporter) ────────────────
ticketRouter.post('/', authMiddleware(['customer', 'transporter']), ticketUpload.single('photo'), ticketController.createTicket);
ticketRouter.get('/my', authMiddleware(['customer', 'transporter']), ticketController.getMyTickets);
ticketRouter.get('/:id', authMiddleware(['customer', 'transporter', 'manager']), ticketController.getTicketDetail);
ticketRouter.post('/:id/reply', authMiddleware(['customer', 'transporter']), ticketController.addReply);
ticketRouter.post('/:id/reopen', authMiddleware(['customer', 'transporter']), ticketController.reopenTicket);

// ─── Manager routes ──────────────────────────────────────
ticketRouter.get('/manager/all', authMiddleware(['manager']), ticketController.getAllTickets);
ticketRouter.get('/manager/stats', authMiddleware(['manager']), ticketController.getTicketStats);
ticketRouter.get('/manager/:id', authMiddleware(['manager']), ticketController.managerGetTicket);
ticketRouter.post('/manager/:id/reply', authMiddleware(['manager']), ticketController.managerReply);
ticketRouter.patch('/manager/:id/status', authMiddleware(['manager']), ticketController.managerUpdateStatus);

export default ticketRouter;
