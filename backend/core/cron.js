import { logger } from '../utils/misc.js';
import CashoutRequest from '../models/cashoutRequest.js';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // run every 6 hours

export function startCronJobs() {
  logger.info('Starting automated background jobs...');

  setInterval(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await CashoutRequest.updateMany(
        { status: 'Processing', createdAt: { $lte: oneDayAgo } },
        { $set: { status: 'Processed', updatedAt: new Date() } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Cron: Auto-processed ${result.modifiedCount} cashout requests.`);
      }
    } catch (err) {
      logger.error('Cron job failed: auto-processing cashouts', err);
    }
  }, CHECK_INTERVAL_MS);

  // Run the first check shortly after startup
  setTimeout(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await CashoutRequest.updateMany(
        { status: 'Processing', createdAt: { $lte: oneDayAgo } },
        { $set: { status: 'Processed', updatedAt: new Date() } }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Cron: Auto-processed ${result.modifiedCount} cashout requests on startup.`);
      }
    } catch (err) {
      logger.error('Startup cron job failed', err);
    }
  }, 10000); // 10 seconds after boot
}
