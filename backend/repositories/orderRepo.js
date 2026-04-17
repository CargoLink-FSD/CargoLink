import mongoose from 'mongoose';
import Order from '../models/order.js';
import { escapeRegex, parsePaginationParams } from '../utils/misc.js';

const ORDER_STATUS_MAP = {
    placed: 'Placed',
    assigned: 'Assigned',
    scheduled: 'Scheduled',
    started: 'Started',
    in_transit: 'In Transit',
    'in transit': 'In Transit',
    intransit: 'In Transit',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const normalizeOrderStatus = (status) => {
    const raw = String(status || '').trim();
    if (!raw || raw.toLowerCase() === 'all') return '';
    const normalizedKey = raw.toLowerCase().replace(/\s+/g, ' ');
    return ORDER_STATUS_MAP[normalizedKey] || raw;
};


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

const getOrdersByCustomer = async (customerId, { search, status, page, limit } = {}) => {
    const query = { customer_id: customerId };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });

    const normalizedStatus = normalizeOrderStatus(status);
    if (normalizedStatus) {
        query.status = normalizedStatus;
    }

    if (search) {
        const term = String(search).trim();
        const re = new RegExp(escapeRegex(term), 'i');
        const orConditions = [
            { 'pickup.city': re },
            { 'pickup.state': re },
            { 'delivery.city': re },
            { 'delivery.state': re },
        ];

        if (mongoose.Types.ObjectId.isValid(term)) {
            orConditions.push({ _id: new mongoose.Types.ObjectId(term) });
        }

        query.$or = orConditions;
    }

    const findQuery = Order.find(query).sort({ createdAt: -1 });

    if (pagination) {
        const [orders, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Order.countDocuments(query),
        ]);

        return {
            items: orders,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1,
            },
        };
    }

    return await findQuery.lean();
};

const getOrdersByTransporter = async (transporterId, { search, status, page, limit } = {}) => {
    const query = { assigned_transporter_id: transporterId };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });

    const normalizedStatus = normalizeOrderStatus(status);
    if (normalizedStatus) {
        query.status = normalizedStatus;
    }

    if (search) {
        const term = String(search).trim();
        const re = new RegExp(escapeRegex(term), 'i');
        const orConditions = [
            { 'pickup.city': re },
            { 'pickup.state': re },
            { 'delivery.city': re },
            { 'delivery.state': re },
        ];

        if (mongoose.Types.ObjectId.isValid(term)) {
            orConditions.push({ _id: new mongoose.Types.ObjectId(term) });
        }

        query.$or = orConditions;
    }

    const findQuery = Order.find(query)
        .select('-bid_by_transporter -otp')
        .sort({ createdAt: -1 });

    if (pagination) {
        const [orders, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Order.countDocuments(query),
        ]);

        return {
            items: orders,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1,
            },
        };
    }

    return await findQuery.lean();
};
const getOrdersByCustomerIds = async (customerId, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return await Order.find({
        _id: { $in: ids },
        customer_id: customerId,
    }).lean();
};

const getOrdersByTransporterIds = async (transporterId, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return await Order.find({
        _id: { $in: ids },
        assigned_transporter_id: transporterId,
    })
        .select('-bid_by_transporter -otp')
        .lean();
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

const cancelOrder = async (orderId, customerId, cancellation = {}) => {
    const allowedStatuses = cancellation.allowedStatuses || ['Placed', 'Assigned'];
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            customer_id: customerId,
            status: { $in: allowedStatuses }
        },
        {
            $set: {
                status: 'Cancelled',
                assigned_transporter_id: null,
                final_price: null,
                accepted_quote_breakdown: null,
                assignment: {},
                cancellation: {
                    cancelled_by: 'customer',
                    cancelled_at: new Date(),
                    reason_code: cancellation.reasonCode || null,
                    reason_text: cancellation.reasonText || null,
                    stage: cancellation.stage || null,
                    fee_amount: Number(cancellation.feeAmount || 0),
                    ledger_id: cancellation.ledgerId || null,
                },
            },
        },
        { new: true }
    );
    return updatedOrder;
};

const reopenOrderForReassignment = async (orderId) => {
    return await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: { $nin: ['Completed', 'Cancelled'] },
        },
        {
            $set: {
                status: 'Placed',
                assigned_transporter_id: null,
                final_price: null,
                accepted_quote_breakdown: null,
                assignment: {},
                pickup_otp: null,
                delivery_otp: null,
                'cancellation.cancelled_by': 'transporter',
                'cancellation.cancelled_at': new Date(),
                'cancellation.reason_code': 'transporter_trip_cancelled',
                'cancellation.reason_text': 'Trip cancelled by transporter and order reopened for reassignment',
                'cancellation.stage': 'reopened_for_reassignment',
                'cancellation.fee_amount': 0,
                'cancellation.ledger_id': null,
            },
            $inc: {
                reopened_count: 1,
            },
        },
        { new: true }
    );
};

const getActiveOrders = async (transporterId, { page, limit } = {}) => {
    // only shows order before 2days of scheduled pickup
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const query = {
        status: 'Placed',
        scheduled_at: { $gte: twoDaysFromNow }
    };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });

    const findQuery = Order.find(query)
        .sort({ createdAt: -1 })
        .populate({
            path: 'bid_by_transporter',
            match: { transporter_id: transporterId },
            select: '_id'
        })
        .lean();

    if (pagination) {
        const [orders, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit),
            Order.countDocuments(query),
        ]);

        return {
            items: orders,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1,
            },
        };
    }

    return await findQuery;
};

const assignOrder = async (orderId, transporterId, finalPrice, quoteBreakdown = null) => {
    const updateData = {
        assigned_transporter_id: transporterId,
        final_price: finalPrice,
        status: 'Assigned',
        assignment: {} // Initialize empty assignment object
    };
    if (quoteBreakdown) {
        updateData.accepted_quote_breakdown = quoteBreakdown;
    }
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: 'Placed'
        },
        updateData,
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

// Verify OTP and Update Status
const verifyOTPAndUpdateStatus = async (orderId, transporterId, otp) => {
    return await Order.findOneAndUpdate(
        {
            _id: orderId,
            assigned_transporter_id: transporterId,
            otp: otp,
            status: 'Started'
        },
        {
            status: 'In Transit',
            $unset: { otp: 1 }
        },
        { new: true }
    );
};


const getOrderById = async (orderId) => {
    return await Order.findById(orderId);
};

// const updateOrderStatus = async (orderId, status, additionalData = {}) => {
//     const updateData = { status, ...additionalData };
//     const updatedOrder = await Order.findByIdAndUpdate(
//         orderId,
//         { $set: updateData },
//         { new: true }
//     );
//     return updatedOrder;
// };

const assignVehicleToOrder = async (orderId, assignmentData) => {
    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                'assignment.vehicle_id': assignmentData.vehicle_id,
                'assignment.vehicle_number': assignmentData.vehicle_number,
                'assignment.vehicle_type': assignmentData.vehicle_type,
                'assignment.assigned_at': new Date()
            }
        },
        { new: true }
    );
    return updatedOrder;
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
    getOrdersByCustomerIds,
    getOrdersByTransporterIds,
    getOrderDetailsForCustomer,
    getOrderDetailsForTransporter,
    existsOrderForCustomer,
    createOrder,
    cancelOrder,
    getActiveOrders,
    assignOrder,
    checkActiveOrder,
    updateOrderStatus,
    verifyOTPAndUpdateStatus,
    getOrderById,
    reopenOrderForReassignment,
    assignVehicleToOrder,
    getCustomerDashboardStats,
}