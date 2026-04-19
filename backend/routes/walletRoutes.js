import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { cacheResponse, invalidateCacheOnSuccess } from '../middlewares/cache.js';
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
walletRouter.get('/me', authMiddleware(['transporter']), cacheResponse({ domain: 'wallets', ttlSeconds: 15 }), getWallet);
walletRouter.get('/me/transactions', authMiddleware(['transporter']), cacheResponse({ domain: 'wallets', ttlSeconds: 15 }), getTransactions);
walletRouter.get('/me/cashouts', authMiddleware(['transporter']), cacheResponse({ domain: 'wallets', ttlSeconds: 15 }), getCashoutHistory);
walletRouter.post('/me/cashout', authMiddleware(['transporter']), invalidateCacheOnSuccess(['wallets', 'admin']), requestCashout);
walletRouter.put('/me/bank-details', authMiddleware(['transporter']), invalidateCacheOnSuccess(['wallets']), updateBankDetails);

// ── RazorpayX Webhook (no auth — signature verified inside controller) ──────────
walletRouter.post('/webhooks/razorpayx', invalidateCacheOnSuccess(['wallets', 'admin']), razorpayxWebhook);

export default walletRouter;
