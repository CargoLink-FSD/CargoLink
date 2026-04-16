import Order from '../models/order.js';
import Customer from '../models/customer.js';
import Transporter from '../models/transporter.js';
import Fleet from '../models/fleet.js';
import Bid from '../models/bids.js';
import Ticket from '../models/ticket.js';
import Review from '../models/review.js';
import Payment from '../models/payment.js';
import { escapeRegex, parsePaginationParams } from '../utils/misc.js';

// Dashboard Analytics Queries
const getOrdersPerDay = async () => {
    const result = await Order.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total_orders: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
        {
            $project: {
                order_day: "$_id",
                total_orders: 1,
                _id: 0
            }
        }
    ]);
    return result;
};

const getRevenuePerDay = async () => {
    const result = await Order.aggregate([
        { $match: { status: "Completed" } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total_revenue: { $sum: "$final_price" }
            }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
        {
            $project: {
                order_day: "$_id",
                total_revenue: 1,
                _id: 0
            }
        }
    ]);
    return result;
};

const getTopTransporters = async () => {
    const result = await Order.aggregate([
        { $match: { status: "Completed", assigned_transporter_id: { $ne: null } } },
        {
            $group: {
                _id: "$assigned_transporter_id",
                total_orders: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: "transporters",
                localField: "_id",
                foreignField: "_id",
                as: "transporter"
            }
        },
        { $unwind: "$transporter" },
        {
            $project: {
                name: "$transporter.name",
                total_orders: 1,
                _id: 0
            }
        },
        { $sort: { total_orders: -1 } },
        { $limit: 5 }
    ]);
    return result;
};

const getOrderStatusDistribution = async () => {
    const result = await Order.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                status: "$_id",
                count: 1,
                _id: 0
            }
        }
    ]);
    return result;
};

const getFleetUtilization = async () => {
    const result = await Fleet.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                status: "$_id",
                count: 1,
                _id: 0
            }
        }
    ]);
    return result;
};

const getNewCustomersPerMonth = async () => {
    const result = await Customer.aggregate([
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                new_customers: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        {
            $project: {
                month: "$_id",
                new_customers: 1,
                _id: 0
            }
        }
    ]);
    return result;
};

const getMostRequestedTruckTypes = async () => {
    const result = await Order.aggregate([
        {
            $group: {
                _id: "$truck_type",
                total_orders: { $sum: 1 }
            }
        },
        {
            $project: {
                truck_type: "$_id",
                total_orders: 1,
                _id: 0
            }
        },
        { $sort: { total_orders: -1 } }
    ]);
    return result;
};

const getPendingVsCompletedOrders = async () => {
    const result = await Order.aggregate([
        {
            $facet: {
                pending_orders: [
                    { $match: { status: { $in: ["Placed", "Bidding", "Assigned", "In Transit"] } } },
                    { $count: "pending_orders" }
                ],
                completed_orders: [
                    { $match: { status: "Completed" } },
                    { $count: "completed_orders" }
                ]
            }
        },
        {
            $project: {
                pending_orders: { $arrayElemAt: ["$pending_orders.pending_orders", 0] },
                completed_orders: { $arrayElemAt: ["$completed_orders.completed_orders", 0] }
            }
        }
    ]);

    return {
        pending_orders: result[0]?.pending_orders || 0,
        completed_orders: result[0]?.completed_orders || 0
    };
};

const getAverageBidAmount = async () => {
    const result = await Bid.aggregate([
        {
            $group: {
                _id: null,
                avg_bid: { $avg: "$bid_amount" }
            }
        },
        {
            $project: {
                avg_bid: 1,
                _id: 0
            }
        }
    ]);
    return result[0] || { avg_bid: 0 };
};

// Order Management
const getAllOrders = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = Order.find(query)
        .populate('customer_id', 'firstName lastName email phone')
        .populate('assigned_transporter_id', 'name email primary_contact')
        .sort(sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Order.countDocuments(query),
        ]);

        return {
            items,
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

const getOrdersByIds = async (orderIds = []) => {
    if (!orderIds.length) return [];

    return Order.find({ _id: { $in: orderIds } })
        .populate('customer_id', 'firstName lastName email phone')
        .populate('assigned_transporter_id', 'name email primary_contact')
        .lean();
};

const getOrderById = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('customer_id', 'firstName lastName email phone')
        .populate('assigned_transporter_id', 'name email primary_contact');
    return order;
};

const getBidsForOrder = async (orderId) => {
    const bids = await Bid.find({ order_id: orderId })
        .populate('transporter_id', 'name email primary_contact')
        .sort({ bid_amount: 1 });
    return bids;
};

const getBidCountForOrder = async (orderId) => {
    const count = await Bid.countDocuments({ order_id: orderId });
    return count;
};

// User Management
const getAllCustomers = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = Customer.find(query)
        .select('firstName lastName email phone createdAt')
        .sort(sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Customer.countDocuments(query),
        ]);

        return {
            items,
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

const getCustomersByIds = async (customerIds = []) => {
    if (!customerIds.length) return [];

    return Customer.find({ _id: { $in: customerIds } })
        .select('firstName lastName email phone createdAt')
        .lean();
};

const getAllTransporters = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = Transporter.find(query)
        .select('name email primary_contact createdAt')
        .sort(sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Transporter.countDocuments(query),
        ]);

        return {
            items,
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

const getTransportersByIds = async (transporterIds = []) => {
    if (!transporterIds.length) return [];

    return Transporter.find({ _id: { $in: transporterIds } })
        .select('name email primary_contact createdAt')
        .lean();
};

const searchCustomerIds = async (search) => {
    const regex = new RegExp(escapeRegex(search), 'i');
    const customers = await Customer.find({
        $or: [
            { firstName: { $regex: regex } },
            { lastName: { $regex: regex } },
            { email: { $regex: regex } },
        ]
    }).select('_id').limit(1000).lean();

    return customers.map((customer) => customer._id);
};

const searchTransporterIds = async (search) => {
    const regex = new RegExp(escapeRegex(search), 'i');
    const transporters = await Transporter.find({
        $or: [
            { name: { $regex: regex } },
            { email: { $regex: regex } },
        ]
    }).select('_id').limit(1000).lean();

    return transporters.map((transporter) => transporter._id);
};

const getCustomerById = async (customerId) => {
    return await Customer.findById(customerId);
};

const getTransporterById = async (transporterId) => {
    return await Transporter.findById(transporterId);
};

const deleteCustomerById = async (customerId) => {
    return await Customer.findByIdAndDelete(customerId);
};

const deleteTransporterById = async (transporterId) => {
    return await Transporter.findByIdAndDelete(transporterId);
};

const getOrderCountByCustomer = async (customerIds = []) => {
    const pipeline = [];

    if (customerIds.length > 0) {
        pipeline.push({
            $match: {
                customer_id: { $in: customerIds },
            }
        });
    }

    pipeline.push(
        {
            $group: {
                _id: "$customer_id",
                noOfOrders: { $sum: 1 }
            }
        }
    );

    const result = await Order.aggregate(pipeline);

    const orderCountMap = {};
    result.forEach((entry) => {
        orderCountMap[entry._id.toString()] = entry.noOfOrders;
    });
    return orderCountMap;
};

const getOrderCountByTransporter = async (transporterIds = []) => {
    const match = { assigned_transporter_id: { $ne: null } };
    if (transporterIds.length > 0) {
        match.assigned_transporter_id.$in = transporterIds;
    }

    const result = await Order.aggregate([
        {
            $match: match
        },
        {
            $group: {
                _id: "$assigned_transporter_id",
                noOfOrders: { $sum: 1 }
            }
        }
    ]);

    const orderCountMap = {};
    result.forEach((entry) => {
        orderCountMap[entry._id.toString()] = entry.noOfOrders;
    });
    return orderCountMap;
};

// ─── Extra counts for dashboard ───
const getTotalCustomers = async () => Customer.countDocuments();
const getTotalTransporters = async () => Transporter.countDocuments();

const getTotalVehicles = async () => {
    const result = await Transporter.aggregate([
        { $unwind: "$fleet" },
        { $count: "total" }
    ]);
    return result[0]?.total || 0;
};

const getOpenTickets = async () => Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } });
const getPendingVerifications = async () => Transporter.countDocuments({ verificationStatus: 'under_review' });

// ─── Fleet Overview ───
const getAllFleetVehicles = async () => {
    const transporters = await Transporter.find(
        { 'fleet.0': { $exists: true } },
        'name email primary_contact city state fleet'
    ).lean();
    const vehicles = [];
    transporters.forEach(t => {
        t.fleet.forEach(v => {
            vehicles.push({
                ...v,
                transporter_id: t._id,
                transporter_name: t.name,
                transporter_email: t.email,
                transporter_contact: t.primary_contact,
                transporter_location: [t.city, t.state].filter(Boolean).join(', '),
            });
        });
    });
    return vehicles;
};

// ─── Tickets Overview ───
const getAllTickets = async () => {
    return Ticket.find()
        .sort({ createdAt: -1 })
        .lean();
};

const getTicketStats = async () => {
    const result = await Ticket.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);
    const stats = { open: 0, in_progress: 0, closed: 0, total: 0 };
    result.forEach(r => { stats[r.status] = r.count; stats.total += r.count; });
    return stats;
};

// ─── Individual User Details ───
const getCustomerDetail = async (customerId) => {
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return null;
    const orders = await Order.find({ customer_id: customerId })
        .populate('assigned_transporter_id', 'name')
        .sort({ createdAt: -1 })
        .lean();
    const payments = await Payment.find({ customer_id: customerId }).lean();
    const totalSpent = orders
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + (o.final_price || 0), 0);
    return {
        ...customer,
        orders,
        payments,
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'Completed').length,
        totalSpent,
    };
};

const getTransporterDetail = async (transporterId) => {
    const transporter = await Transporter.findById(transporterId).lean();
    if (!transporter) return null;
    const orders = await Order.find({ assigned_transporter_id: transporterId })
        .populate('customer_id', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();
    const reviews = await Review.find({ transporter_id: transporterId })
        .populate('customer_id', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();
    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;
    return {
        ...transporter,
        orders,
        reviews,
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'Completed').length,
        avgRating,
    };
};

export default {
    // Dashboard Analytics
    getOrdersPerDay,
    getRevenuePerDay,
    getTopTransporters,
    getOrderStatusDistribution,
    getFleetUtilization,
    getNewCustomersPerMonth,
    getMostRequestedTruckTypes,
    getPendingVsCompletedOrders,
    getAverageBidAmount,
    getTotalCustomers,
    getTotalTransporters,
    getTotalVehicles,
    getOpenTickets,
    getPendingVerifications,

    // Order Management
    getAllOrders,
    getOrdersByIds,
    getOrderById,
    getBidsForOrder,
    getBidCountForOrder,

    // User Management
    getAllCustomers,
    getCustomersByIds,
    getAllTransporters,
    getTransportersByIds,
    searchCustomerIds,
    searchTransporterIds,
    getCustomerById,
    getTransporterById,
    deleteCustomerById,
    deleteTransporterById,
    getOrderCountByCustomer,
    getOrderCountByTransporter,
    getCustomerDetail,
    getTransporterDetail,

    // Fleet Overview
    getAllFleetVehicles,

    // Tickets Overview
    getAllTickets,
    getTicketStats,
};
