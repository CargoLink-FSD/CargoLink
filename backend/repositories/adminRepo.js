import Order from '../models/order.js';
import Customer from '../models/customer.js';
import Transporter from '../models/transporter.js';
import Driver from '../models/driver.js';
import Manager from '../models/manager.js';
import Fleet from '../models/fleet.js';
import Bid from '../models/bids.js';
import Ticket from '../models/ticket.js';
import Review from '../models/review.js';
import Payment from '../models/payment.js';
import CashoutRequest from '../models/cashoutRequest.js';
import Trip from '../models/trip.js';
import { escapeRegex, parsePaginationParams } from '../utils/misc.js';

// Dashboard Analytics Queries
const buildCreatedAtMatch = (fromDate = null, toDate = null) => {
    const createdAt = {};

    if (fromDate instanceof Date && !Number.isNaN(fromDate.getTime())) {
        createdAt.$gte = fromDate;
    }

    if (toDate instanceof Date && !Number.isNaN(toDate.getTime())) {
        createdAt.$lte = toDate;
    }

    return Object.keys(createdAt).length > 0 ? { createdAt } : null;
};

const buildDateFieldMatch = (dateField = 'createdAt', fromDate = null, toDate = null) => {
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    if (!createdAtMatch) return null;
    return { [dateField]: createdAtMatch.createdAt };
};

const getDateFormatForBucket = (bucket = 'day') => {
    switch (bucket) {
        case 'hour':
            return "%Y-%m-%d %H:00";
        case 'week':
            return "%G-W%V";
        case 'month':
            return "%Y-%m";
        case 'day':
        default:
            return "%Y-%m-%d";
    }
};

const getOrdersPerDay = async (options = {}) => {
    const { fromDate = null, toDate = null, bucket = 'day', limit = 60 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: { $dateToString: { format: getDateFormatForBucket(bucket), date: "$createdAt" } },
                total_orders: { $sum: 1 },
            },
        },
        { $sort: { _id: -1 } },
    );

    if (limit > 0) {
        pipeline.push({ $limit: limit });
    }

    pipeline.push({
        $project: {
            order_day: "$_id",
            total_orders: 1,
            _id: 0,
        },
    });

    return Order.aggregate(pipeline);
};

const getRevenuePerDay = async (options = {}) => {
    const { fromDate = null, toDate = null, bucket = 'day', limit = 60 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const match = { status: "Completed" };
    const pipeline = [];

    if (createdAtMatch) {
        match.createdAt = createdAtMatch.createdAt;
    }

    pipeline.push({ $match: match });

    pipeline.push(
        {
            $group: {
                _id: { $dateToString: { format: getDateFormatForBucket(bucket), date: "$createdAt" } },
                total_revenue: { $sum: "$final_price" },
            },
        },
        { $sort: { _id: -1 } },
    );

    if (limit > 0) {
        pipeline.push({ $limit: limit });
    }

    pipeline.push({
        $project: {
            order_day: "$_id",
            total_revenue: 1,
            _id: 0,
        },
    });

    return Order.aggregate(pipeline);
};

const getTopTransporters = async (options = {}) => {
    const { fromDate = null, toDate = null, limit = 5 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const match = { status: "Completed", assigned_transporter_id: { $ne: null } };

    if (createdAtMatch) {
        match.createdAt = createdAtMatch.createdAt;
    }

    return Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$assigned_transporter_id",
                total_orders: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: "transporters",
                localField: "_id",
                foreignField: "_id",
                as: "transporter",
            },
        },
        { $unwind: "$transporter" },
        {
            $project: {
                name: "$transporter.name",
                total_orders: 1,
                _id: 0,
            },
        },
        { $sort: { total_orders: -1 } },
        { $limit: limit },
    ]);
};

const getTopRoutes = async (options = {}) => {
    const { fromDate = null, toDate = null, limit = 7 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const match = {
        'pickup.city': { $exists: true, $ne: null },
        'delivery.city': { $exists: true, $ne: null },
    };

    if (createdAtMatch) {
        match.createdAt = createdAtMatch.createdAt;
    }

    const result = await Order.aggregate([
        { $match: match },
        {
            $project: {
                route: {
                    $concat: [
                        { $ifNull: ['$pickup.city', 'Unknown'] },
                        ' -> ',
                        { $ifNull: ['$delivery.city', 'Unknown'] },
                    ],
                },
                status: 1,
                final_price: { $ifNull: ['$final_price', 0] },
            },
        },
        {
            $group: {
                _id: '$route',
                total_orders: { $sum: 1 },
                completed_orders: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
                    },
                },
                total_revenue: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Completed'] }, '$final_price', 0],
                    },
                },
            },
        },
        { $sort: { total_orders: -1, completed_orders: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                route: '$_id',
                total_orders: 1,
                completed_orders: 1,
                total_revenue: 1,
            },
        },
    ]);

    return result;
};

const getOrderStatusDistribution = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                status: "$_id",
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    );

    return Order.aggregate(pipeline);
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

const getNewCustomersPerMonth = async (options = {}) => {
    const { fromDate = null, toDate = null, bucket = 'month', limit = 18 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: { $dateToString: { format: getDateFormatForBucket(bucket), date: "$createdAt" } },
                new_customers: { $sum: 1 },
            },
        },
        { $sort: { _id: -1 } },
    );

    if (limit > 0) {
        pipeline.push({ $limit: limit });
    }

    pipeline.push({
        $project: {
            month: "$_id",
            new_customers: 1,
            _id: 0,
        },
    });

    return Customer.aggregate(pipeline);
};

const getMostRequestedTruckTypes = async (options = {}) => {
    const { fromDate = null, toDate = null, limit = 10 } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: "$truck_type",
                total_orders: { $sum: 1 },
            },
        },
        {
            $project: {
                truck_type: "$_id",
                total_orders: 1,
                _id: 0,
            },
        },
        { $sort: { total_orders: -1 } },
    );

    if (limit > 0) {
        pipeline.push({ $limit: limit });
    }

    return Order.aggregate(pipeline);
};

const getPendingVsCompletedOrders = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pendingMatch = { status: { $in: ["Placed", "Bidding", "Assigned", "In Transit"] } };
    const completedMatch = { status: "Completed" };

    if (createdAtMatch) {
        pendingMatch.createdAt = createdAtMatch.createdAt;
        completedMatch.createdAt = createdAtMatch.createdAt;
    }

    const result = await Order.aggregate([
        {
            $facet: {
                pending_orders: [
                    { $match: pendingMatch },
                    { $count: "pending_orders" }
                ],
                completed_orders: [
                    { $match: completedMatch },
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

const getAverageBidAmount = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: null,
                avg_bid: { $avg: "$bid_amount" },
            },
        },
        {
            $project: {
                avg_bid: 1,
                _id: 0,
            },
        },
    );

    const result = await Bid.aggregate(pipeline);
    return result[0] || { avg_bid: 0 };
};

const getPaymentStatusDistribution = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                amount: { $sum: { $ifNull: ["$amount", 0] } },
            },
        },
        {
            $project: {
                status: "$_id",
                count: 1,
                amount: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    );

    return Payment.aggregate(pipeline);
};

const getTripStatusDistribution = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const createdAtMatch = buildCreatedAtMatch(fromDate, toDate);
    const pipeline = [];

    if (createdAtMatch) {
        pipeline.push({ $match: createdAtMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                status: "$_id",
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    );

    return Trip.aggregate(pipeline);
};

const getTicketCategoryDistribution = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const dateMatch = buildDateFieldMatch('createdAt', fromDate, toDate);
    const pipeline = [];

    if (dateMatch) {
        pipeline.push({ $match: dateMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                category: '$_id',
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    );

    return Ticket.aggregate(pipeline);
};

const getTicketPriorityDistribution = async (options = {}) => {
    const { fromDate = null, toDate = null } = options;
    const dateMatch = buildDateFieldMatch('createdAt', fromDate, toDate);
    const pipeline = [];

    if (dateMatch) {
        pipeline.push({ $match: dateMatch });
    }

    pipeline.push(
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                priority: '$_id',
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    );

    return Ticket.aggregate(pipeline);
};

const getResolvedTicketsTrend = async (options = {}) => {
    const { fromDate = null, toDate = null, bucket = 'day', limit = 60 } = options;
    const dateMatch = buildDateFieldMatch('updatedAt', fromDate, toDate);
    const match = { status: 'closed' };
    if (dateMatch?.updatedAt) {
        match.updatedAt = dateMatch.updatedAt;
    }

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: getDateFormatForBucket(bucket), date: '$updatedAt' } },
                resolved_tickets: { $sum: 1 },
            },
        },
        { $sort: { _id: -1 } },
    ];

    if (limit > 0) {
        pipeline.push({ $limit: limit });
    }

    pipeline.push({
        $project: {
            period: '$_id',
            resolved_tickets: 1,
            _id: 0,
        },
    });

    return Ticket.aggregate(pipeline);
};

const getManagerResolvedTickets = async (options = {}) => {
    const { fromDate = null, toDate = null, limit = 8 } = options;
    const dateMatch = buildDateFieldMatch('updatedAt', fromDate, toDate);
    const match = {
        status: 'closed',
        assignedManager: { $ne: null },
    };

    if (dateMatch?.updatedAt) {
        match.updatedAt = dateMatch.updatedAt;
    }

    return Ticket.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$assignedManager',
                resolved_tickets: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'managers',
                localField: '_id',
                foreignField: '_id',
                as: 'manager',
            },
        },
        { $unwind: '$manager' },
        {
            $project: {
                _id: 0,
                manager_id: '$_id',
                name: '$manager.name',
                resolved_tickets: 1,
            },
        },
        { $sort: { resolved_tickets: -1 } },
        { $limit: limit },
    ]);
};

const getManagerOpenTicketLoad = async (options = {}) => {
    const { fromDate = null, toDate = null, limit = 8 } = options;
    const dateMatch = buildDateFieldMatch('createdAt', fromDate, toDate);
    const match = {
        status: { $in: ['open', 'in_progress'] },
        assignedManager: { $ne: null },
    };

    if (dateMatch?.createdAt) {
        match.createdAt = dateMatch.createdAt;
    }

    return Ticket.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$assignedManager',
                open_tickets: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'managers',
                localField: '_id',
                foreignField: '_id',
                as: 'manager',
            },
        },
        { $unwind: '$manager' },
        {
            $project: {
                _id: 0,
                manager_id: '$_id',
                name: '$manager.name',
                open_tickets: 1,
            },
        },
        { $sort: { open_tickets: -1 } },
        { $limit: limit },
    ]);
};

const getManagerStatusDistribution = async () => {
    return Manager.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                status: '$_id',
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    ]);
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

// ΓöÇΓöÇΓöÇ Extra counts for dashboard ΓöÇΓöÇΓöÇ
const getTotalCustomers = async () => Customer.countDocuments();
const getTotalTransporters = async () => Transporter.countDocuments();
const getTotalDrivers = async () => Driver.countDocuments();
const getTotalManagers = async () => Manager.countDocuments();
const getActiveManagers = async () => Manager.countDocuments({ status: 'active' });
const getActiveTrips = async () => Trip.countDocuments({ status: { $in: ['Scheduled', 'Active'] } });
const getPendingCashouts = async () => CashoutRequest.countDocuments({ status: { $in: ['Pending', 'Processing'] } });

const getTotalVehicles = async () => {
    const fleetCount = await Fleet.countDocuments();
    if (fleetCount > 0) {
        return fleetCount;
    }

    const result = await Transporter.aggregate([
        { $unwind: "$fleet" },
        { $count: "total" }
    ]);
    return result[0]?.total || 0;
};

const getOpenTickets = async () => Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } });
const getPendingVerifications = async () => {
    const [transporterPending, driverPending] = await Promise.all([
        Transporter.countDocuments({
            $or: [
                { verificationStatus: 'under_review' },
                { 'documents.pan_card.adminStatus': 'pending' },
                { 'documents.driving_license.adminStatus': 'pending' },
                { 'documents.vehicle_rcs': { $elemMatch: { adminStatus: 'pending' } } },
            ],
        }),
        Driver.countDocuments({
            $or: [
                { verificationStatus: 'under_review' },
                { 'documents.pan_card.adminStatus': 'pending' },
                { 'documents.driving_license.adminStatus': 'pending' },
            ],
        }),
    ]);

    return transporterPending + driverPending;
};

// ΓöÇΓöÇΓöÇ Fleet Overview ΓöÇΓöÇΓöÇ
const getAllFleetVehicles = async () => {
    const fleetVehicles = await Fleet.find({})
        .populate('transporter_id', 'name email primary_contact city state')
        .lean();

    if (fleetVehicles.length > 0) {
        return fleetVehicles.map((vehicle) => {
            const transporter = vehicle.transporter_id && typeof vehicle.transporter_id === 'object'
                ? vehicle.transporter_id
                : null;

            return {
                ...vehicle,
                transporter_id: transporter?._id || vehicle.transporter_id || null,
                transporter_name: transporter?.name || null,
                transporter_email: transporter?.email || null,
                transporter_contact: transporter?.primary_contact || null,
                transporter_location: [transporter?.city, transporter?.state].filter(Boolean).join(', '),
            };
        });
    }

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

// ΓöÇΓöÇΓöÇ Tickets Overview ΓöÇΓöÇΓöÇ
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

const getTicketById = async (ticketId) => {
    return Ticket.findById(ticketId)
        .populate('assignedManager', 'name email')
        .lean();
};

const addTicketMessage = async (ticketId, message) => {
    const updated = await Ticket.findByIdAndUpdate(
        ticketId,
        { $push: { messages: message } },
        { new: true }
    ).populate('assignedManager', 'name email');

    return updated ? updated.toObject() : null;
};

const updateTicketStatus = async (ticketId, status) => {
    const updated = await Ticket.findByIdAndUpdate(
        ticketId,
        { $set: { status } },
        { new: true }
    ).populate('assignedManager', 'name email');

    return updated ? updated.toObject() : null;
};

// ΓöÇΓöÇΓöÇ Trips Oversight ΓöÇΓöÇΓöÇ
const buildTripQuery = (query = {}, sortOptions = { createdAt: -1 }) => {
    return Trip.find(query)
        .populate('transporter_id', 'name email primary_contact')
        .populate('assigned_vehicle_id', 'name registration truck_type status')
        .populate('assigned_driver_id', 'firstName lastName email phone status')
        .populate({
            path: 'order_ids',
            select: 'status final_price pickup delivery customer_id assigned_transporter_id',
            populate: [
                { path: 'customer_id', select: 'firstName lastName email phone' },
                { path: 'assigned_transporter_id', select: 'name email primary_contact' },
            ],
        })
        .sort(sortOptions);
};

const getAllTrips = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = buildTripQuery(query, sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Trip.countDocuments(query),
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

    return findQuery.lean();
};

const getTripByIdDetailed = async (tripId) => {
    return buildTripQuery({ _id: tripId }).lean().then((items) => items?.[0] || null);
};

// ΓöÇΓöÇΓöÇ Payments Oversight ΓöÇΓöÇΓöÇ
const buildPaymentQuery = (query = {}, sortOptions = { createdAt: -1 }) => {
    return Payment.find(query)
        .populate('customer_id', 'firstName lastName email phone')
        .populate({
            path: 'order_id',
            select: 'status pickup delivery final_price customer_id assigned_transporter_id createdAt',
            populate: [
                { path: 'customer_id', select: 'firstName lastName email phone' },
                { path: 'assigned_transporter_id', select: 'name email primary_contact' },
            ],
        })
        .sort(sortOptions);
};

const getAllPayments = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = buildPaymentQuery(query, sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Payment.countDocuments(query),
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

    return findQuery.lean();
};

const getPaymentById = async (paymentId) => {
    return buildPaymentQuery({ _id: paymentId }).lean().then((items) => items?.[0] || null);
};

const getPaymentStats = async () => {
    const result = await Payment.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
            },
        },
    ]);

    const stats = {
        total: 0,
        totalAmount: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
    };

    result.forEach((row) => {
        stats.total += row.count || 0;
        stats.totalAmount += row.amount || 0;
        const key = String(row._id || '').toLowerCase();
        if (key === 'completed') stats.completed = row.count;
        if (key === 'created' || key === 'pending') stats.pending += row.count;
        if (key === 'failed') stats.failed = row.count;
        if (key === 'refunded') stats.refunded = row.count;
    });

    return stats;
};

const getCashoutById = async (cashoutId) => {
    return CashoutRequest.findById(cashoutId)
        .populate('transporter_id', 'name email primary_contact bankDetails')
        .lean();
};

const updateCashoutStatus = async (cashoutId, status, extras = {}) => {
    const updated = await CashoutRequest.findByIdAndUpdate(
        cashoutId,
        { $set: { status, ...extras } },
        { new: true }
    ).populate('transporter_id', 'name email primary_contact bankDetails');

    return updated ? updated.toObject() : null;
};

// ΓöÇΓöÇΓöÇ Cashouts Overview ΓöÇΓöÇΓöÇ
const getAllCashouts = async (query = {}, sortOptions = { createdAt: -1 }, options = {}) => {
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });
    const findQuery = CashoutRequest.find(query)
        .populate('transporter_id', 'name email primary_contact bankDetails')
        .sort(sortOptions);

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            CashoutRequest.countDocuments(query),
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

// ΓöÇΓöÇΓöÇ Individual User Details ΓöÇΓöÇΓöÇ
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
    getTopRoutes,
    getOrderStatusDistribution,
    getFleetUtilization,
    getNewCustomersPerMonth,
    getMostRequestedTruckTypes,
    getPendingVsCompletedOrders,
    getAverageBidAmount,
    getPaymentStatusDistribution,
    getTripStatusDistribution,
    getTicketCategoryDistribution,
    getTicketPriorityDistribution,
    getResolvedTicketsTrend,
    getManagerResolvedTickets,
    getManagerOpenTicketLoad,
    getManagerStatusDistribution,
    getTotalCustomers,
    getTotalTransporters,
    getTotalDrivers,
    getTotalManagers,
    getActiveManagers,
    getActiveTrips,
    getPendingCashouts,
    getTotalVehicles,
    getOpenTickets,
    getPendingVerifications,

    // Order Management
    getAllOrders,
    getOrderById,
    getBidsForOrder,
    getBidCountForOrder,

    // User Management
    getAllCustomers,
    getAllTransporters,
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
    getTicketById,
    addTicketMessage,
    updateTicketStatus,

    // Cashouts Overview
    getAllCashouts,

    // Trips
    getAllTrips,
    getTripByIdDetailed,

    // Payments
    getAllPayments,
    getPaymentById,
    getPaymentStats,

    // Cashout actions
    getCashoutById,
    updateCashoutStatus,
};
