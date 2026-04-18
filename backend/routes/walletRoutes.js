import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import {
  getWallet,
  getTransactions,
  requestCashout,
  updateBankDetails,
  getCashoutHistory,
  razorpayxWebhook,
} from '../controllers/walletController.js';

const walletRouter = Router();

// ── Transporter routes ─────────────────────────────────────────────────────────
walletRouter.get('/me', authMiddleware(['transporter']), getWallet);
walletRouter.get('/me/transactions', authMiddleware(['transporter']), getTransactions);
walletRouter.get('/me/cashouts', authMiddleware(['transporter']), getCashoutHistory);
walletRouter.post('/me/cashout', authMiddleware(['transporter']), requestCashout);
walletRouter.put('/me/bank-details', authMiddleware(['transporter']), updateBankDetails);

// ── RazorpayX Webhook (no auth — signature verified inside controller) ──────────
walletRouter.post('/webhooks/razorpayx', razorpayxWebhook);

export default walletRouter;
