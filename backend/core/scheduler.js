import cron from 'node-cron';
import Order from '../models/order.js';
import Bid from '../models/bids.js';
import { logger } from '../utils/misc.js';

/**
 * Order Expiry Scheduler
 * Runs every hour to check and expire orders that:
 * 1. Have passed their bidding_closes_at time
 * 2. Have passed their expires_at time with no bids
 */

let schedulerTask = null;

const checkAndExpireOrders = async () => {
  try {
    const now = new Date();
    
    // Find orders that are "Placed" and have expired
    const expiredOrders = await Order.find({
      status: 'Placed',
      expires_at: { $lte: now }
    });

    logger.info(`Found ${expiredOrders.length} expired orders to process`);

    for (const order of expiredOrders) {
      // Check if the order has any bids
      const bidCount = await Bid.countDocuments({ order_id: order._id });
      
      if (bidCount === 0) {
        // No bids received - mark as rejected
        order.status = 'Rejected';
        await order.save();
        logger.info(`Order ${order._id} marked as Rejected (no bids received)`);
      } else {
        // Bids exist but not accepted - mark as expired
        order.status = 'Expired';
        await order.save();
        logger.info(`Order ${order._id} marked as Expired (bids not accepted in time)`);
      }
    }

    logger.info('Order expiry check completed');
  } catch (error) {
    logger.error('Error in order expiry scheduler:', error);
  }
};

const startScheduler = () => {
  if (schedulerTask) {
    logger.warn('Scheduler is already running');
    return;
  }

  // Run every hour at the start of the hour
  schedulerTask = cron.schedule('0 * * * *', async () => {
    logger.info('Running order expiry scheduler');
    await checkAndExpireOrders();
  });

  logger.info('Order expiry scheduler started (runs every hour)');
};

const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Order expiry scheduler stopped');
  }
};

// Export for testing
export { checkAndExpireOrders, startScheduler, stopScheduler };
export default { checkAndExpireOrders, startScheduler, stopScheduler };
