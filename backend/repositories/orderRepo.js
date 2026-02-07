import mongoose from 'mongoose';
import Order from '../models/order.js';


const countOrdersByCustomer = async (customerId) => {
    return Order.aggregate()
        .match({ customer_id: customerId })
        .group({ _id: "$status", count: { $sum: 1 } })
};

const countOrdersByTransporter = async (transporterId) => {
    return Order.aggregate()
      .match({ assigned_transporter_id: transporterId }) 
      .group({ _id: "$status", count: { $sum: 1 } });
  };
//         .match({ transporter_id: transporterId })
//         .group({ _id: "$status", count: { $sum: 1 } })
// };

const getOrdersByCustomer = async (customerId) => {
    const orders = await Order.find({ customer_id: customerId });
    return orders;
};

const getOrdersByTransporter = async (transporterId) => {
    const orders = await Order.find({ assigned_transporter_id: transporterId }).select('-bid_by_transporter -otp');
    return orders;
};

const getOrderDetailsForCustomer = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer_id: customerId })
        .populate('assigned_transporter_id', 'name primary_contact email');
    return order;
};

const getOrderDetailsForTransporter = async (orderId, transporterId) => {
    // Allow transporters to view both:
    // 1. Orders assigned to them
    // 2. Unassigned orders (status: "Placed") for bidding
    const order = await Order.findOne({
        _id: orderId,
        $or: [
            { assigned_transporter_id: transporterId },
            { status: "Placed", assigned_transporter_id: null }
        ]
    })
        .populate('customer_id', 'firstName lastName phone email')
        .select('-otp');
    return order;
};

const existsOrderForCustomer = async (orderId, customerId) => {
    return await Order.exists({ _id: orderId, customer_id: customerId });
};

const createOrder = async (orderData) => {
    const order = new Order(orderData);
    await order.save();
    return order;
};

const cancelOrder = async (orderId, customerId) => {
    const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, customer_id: customerId, status: "Placed" },
        { $set: { status: "Cancelled" } },
        { new: true }
    );
    return updatedOrder;
};

const getActiveOrders = async (transporterId) => {
    // only shows order before 2days of scheduled pickup
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
        status: 'Placed',
        scheduled_at: { $gte: twoDaysFromNow } // Filter out orders with closed bidding window
    })
        .populate({
            path: 'bid_by_transporter',
            match: { transporter_id: transporterId },
            select: '_id'
        })
        .lean();
    return orders;
};

const assignOrder = async (orderId, transporterId, finalPrice) => {
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: 'Placed'
        },
        {
            assigned_transporter_id: transporterId,
            final_price: finalPrice,
            status: 'Assigned',
            assignment: {} // Initialize empty assignment object
        },
        { new: true }
    );
    return updatedOrder;
};

const checkActiveOrder = async (orderId, transporterId) => {
    // Bidding window closes 2 days before scheduled pickup
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const order = await Order.exists({
        _id: orderId,
        status: "Placed",
        scheduled_at: { $gte: twoDaysFromNow } // Pickup must be at least 2 days away
    });
    return order;
};

const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    const updateData = { status, ...additionalData };

    return await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true }
    );
};

const getOrderById = async (orderId) => {
    return await Order.findById(orderId);
};

const getOrdersByIds = async (orderIds) => {
    return await Order.find({ _id: { $in: orderIds } });
};

const assignTripToOrder = async (orderId, tripId) => {
    return await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                trip_id: tripId,
                status: 'Scheduled',
            },
        },
        { new: true }
    );
};


const removeTripFromOrder = async (orderId) => {
    return await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                trip_id: null,
                status: 'Assigned',
            },
        },
        { new: true }
    );
};


const getAssignedOrdersForTransporter = async (transporterId) => {
    return await Order.find({
        assigned_transporter_id: transporterId,
        status: 'Assigned',
        trip_id: null,
    });
};

/**
 * Get comprehensive dashboard stats for a customer
 * @param {ObjectId} customerId - The customer's ID
 * @param {Object} dateFilters - Date filters for stats
 * @returns {Object} Dashboard statistics
 */
const getCustomerDashboardStats = async (customerId, dateFilters) => {
    const { activeStatuses, startOfMonth, endOfMonth, now, sevenDaysFromNow } = dateFilters;
    
    // Convert customerId to ObjectId if it's a string
    const customerObjectId = typeof customerId === 'string' 
        ? new mongoose.Types.ObjectId(customerId) 
        : customerId;

    // Run aggregation for status breakdown and spend calculations
    const [statusBreakdown] = await Order.aggregate([
        { $match: { customer_id: customerObjectId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalSpend: { 
                    $sum: { 
                        $ifNull: ['$final_price', { $ifNull: ['$max_price', 0] }] 
                    } 
                }
            }
        }
    ]).then(results => {
        // Transform to a structured object
        const breakdown = {
            Placed: 0,
            Assigned: 0,
            'In Transit': 0,
            Started: 0,
            Completed: 0,
            Cancelled: 0,
            Other: 0
        };
        let totalOrders = 0;
        let estimatedTotalSpend = 0;

        results.forEach(item => {
            if (breakdown.hasOwnProperty(item._id)) {
                breakdown[item._id] = item.count;
            } else {
                breakdown.Other += item.count;
            }
            totalOrders += item.count;
            estimatedTotalSpend += item.totalSpend || 0;
        });

        return [{ breakdown, totalOrders, estimatedTotalSpend }];
    });

    // Get this month's spend
    const [monthlySpendResult] = await Order.aggregate([
        { 
            $match: { 
                customer_id: customerObjectId,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            } 
        },
        {
            $group: {
                _id: null,
                thisMonthSpend: { 
                    $sum: { 
                        $ifNull: ['$final_price', { $ifNull: ['$max_price', 0] }] 
                    } 
                }
            }
        }
    ]);

    // Get upcoming pickups count (active orders with scheduled_at in next 7 days)
    const upcomingPickupsCount = await Order.countDocuments({
        customer_id: customerObjectId,
        status: { $in: activeStatuses },
        scheduled_at: { $gte: now, $lte: sevenDaysFromNow }
    });

    // Get upcoming orders details (top 5)
    const upcomingOrders = await Order.find({
        customer_id: customerObjectId,
        status: { $in: activeStatuses },
        scheduled_at: { $gte: now, $lte: sevenDaysFromNow }
    })
    .sort({ scheduled_at: 1 })
    .limit(5)
    .select('_id pickup delivery scheduled_at status final_price max_price')
    .lean();

    // Get recent orders (last 10)
    const recentOrders = await Order.find({
        customer_id: customerObjectId
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(10)
    .select('_id pickup delivery scheduled_at status final_price max_price createdAt updatedAt')
    .lean();

    // Calculate active orders count
    const activeOrdersCount = activeStatuses.reduce((sum, status) => {
        return sum + (statusBreakdown.breakdown[status] || 0);
    }, 0);

    return {
        totalOrders: statusBreakdown.totalOrders || 0,
        activeOrders: activeOrdersCount,
        completedOrders: statusBreakdown.breakdown.Completed || 0,
        cancelledOrders: statusBreakdown.breakdown.Cancelled || 0,
        statusBreakdown: statusBreakdown.breakdown,
        estimatedTotalSpend: statusBreakdown.estimatedTotalSpend || 0,
        thisMonthSpend: monthlySpendResult?.thisMonthSpend || 0,
        upcomingPickupsCount,
        upcomingOrders,
        recentOrders
    };
};

export default {
    countOrdersByCustomer,
    countOrdersByTransporter,
    getOrdersByCustomer,
    getOrdersByTransporter,
    getOrderDetailsForCustomer,
    getOrderDetailsForTransporter,
    existsOrderForCustomer,
    createOrder,
    cancelOrder,
    getActiveOrders,
    assignOrder,
    checkActiveOrder,
    updateOrderStatus,
    getOrderById,
    assignVehicleToOrder,
    getCustomerDashboardStats,
    getOrdersByIds,
    assignTripToOrder,
    removeTripFromOrder,
    getAssignedOrdersForTransporter,
}