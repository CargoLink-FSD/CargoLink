import Order from '../models/order.js';
import Bid from '../models/bids.js';

/**
 * Get customer dashboard statistics
 */
const getCustomerDashboard = async (customerId) => {
  // Order statistics
  const orderStats = await Order.aggregate([
    { $match: { customer_id: customerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Total orders
  const totalOrders = await Order.countDocuments({ customer_id: customerId });

  // Active orders (Placed, Assigned, In Transit)
  const activeOrders = await Order.countDocuments({
    customer_id: customerId,
    status: { $in: ['Placed', 'Assigned', 'In Transit', 'Started'] }
  });

  // Completed orders
  const completedOrders = await Order.countDocuments({
    customer_id: customerId,
    status: 'Completed'
  });

  // Total spending
  const spendingResult = await Order.aggregate([
    { $match: { customer_id: customerId, status: 'Completed', final_price: { $exists: true } } },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$final_price' }
      }
    }
  ]);
  const totalSpent = spendingResult.length > 0 ? spendingResult[0].totalSpent : 0;

  // Recent orders
  const recentOrders = await Order.find({ customer_id: customerId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id status pickup delivery scheduled_at final_price max_price createdAt')
    .lean();

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    totalSpent,
    orderStats,
    recentOrders
  };
};

/**
 * Get transporter dashboard statistics
 */
const getTransporterDashboard = async (transporterId) => {
  // Order statistics
  const orderStats = await Order.aggregate([
    { $match: { assigned_transporter_id: transporterId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Total orders
  const totalOrders = await Order.countDocuments({ assigned_transporter_id: transporterId });

  // Active orders (Assigned, In Transit)
  const activeOrders = await Order.countDocuments({
    assigned_transporter_id: transporterId,
    status: { $in: ['Assigned', 'In Transit', 'Started'] }
  });

  // Completed orders
  const completedOrders = await Order.countDocuments({
    assigned_transporter_id: transporterId,
    status: 'Completed'
  });

  // Total earnings
  const earningsResult = await Order.aggregate([
    { 
      $match: { 
        assigned_transporter_id: transporterId, 
        status: 'Completed', 
        final_price: { $exists: true } 
      } 
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$final_price' }
      }
    }
  ]);
  const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;

  // Bid statistics
  const totalBids = await Bid.countDocuments({ transporter_id: transporterId });

  // Average bid amount
  const avgBidResult = await Bid.aggregate([
    { $match: { transporter_id: transporterId } },
    {
      $group: {
        _id: null,
        avgBidAmount: { $avg: '$bid_amount' }
      }
    }
  ]);
  const avgBidAmount = avgBidResult.length > 0 ? avgBidResult[0].avgBidAmount : 0;

  // Recent orders
  const recentOrders = await Order.find({ assigned_transporter_id: transporterId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id status pickup delivery scheduled_at final_price createdAt')
    .populate('customer_id', 'firstName lastName phone')
    .lean();

  // Pending bids (orders with bids but not yet assigned)
  const pendingBids = await Bid.find({ transporter_id: transporterId })
    .populate({
      path: 'order_id',
      match: { status: 'Placed' },
      select: '_id pickup delivery scheduled_at max_price'
    })
    .lean();

  // Filter out null order_ids (orders that are no longer Placed)
  const activeBids = pendingBids.filter(bid => bid.order_id !== null);

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    totalEarnings,
    totalBids,
    avgBidAmount,
    orderStats,
    recentOrders,
    activeBids: activeBids.length
  };
};

export default {
  getCustomerDashboard,
  getTransporterDashboard
};
