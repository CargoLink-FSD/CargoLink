import adminRepo from '../repositories/adminRepo.js';
import managerService from './managerService.js';
import ticketService from './ticketService.js';
import walletRepo from '../repositories/walletRepo.js';
import { AppError, escapeRegex } from '../utils/misc.js';
import mongoose from 'mongoose';
import { CACHE_DEFAULT_TTL } from '../core/index.js';
import { makeCacheKey, rememberCachedJson } from '../core/cache.js';

const DASHBOARD_RANGE_CONFIG = {
    '1h': { ms: 60 * 60 * 1000, bucket: 'hour', seriesLimit: 24, label: 'Past 1 hour' },
    '24h': { ms: 24 * 60 * 60 * 1000, bucket: 'hour', seriesLimit: 48, label: 'Past 24 hours' },
    '7d': { ms: 7 * 24 * 60 * 60 * 1000, bucket: 'day', seriesLimit: 14, label: 'Past 7 days' },
    '30d': { ms: 30 * 24 * 60 * 60 * 1000, bucket: 'day', seriesLimit: 40, label: 'Past 30 days' },
    '90d': { ms: 90 * 24 * 60 * 60 * 1000, bucket: 'week', seriesLimit: 20, label: 'Past 90 days' },
    '1y': { ms: 365 * 24 * 60 * 60 * 1000, bucket: 'month', seriesLimit: 18, label: 'Past 1 year' },
    all: { ms: null, bucket: 'month', seriesLimit: 36, label: 'All time' },
};

const resolveDashboardWindow = (rangeInput) => {
    const key = String(rangeInput || '30d').toLowerCase();
    const cfg = DASHBOARD_RANGE_CONFIG[key] || DASHBOARD_RANGE_CONFIG['30d'];
    const toDate = new Date();
    const fromDate = cfg.ms ? new Date(toDate.getTime() - cfg.ms) : null;

    return {
        range: key in DASHBOARD_RANGE_CONFIG ? key : '30d',
        fromDate,
        toDate,
        bucket: cfg.bucket,
        seriesLimit: cfg.seriesLimit,
        label: cfg.label,
    };
};

const normalizeKey = (value) => String(value || '').toLowerCase();

// Dashboard Statistics
const getDashboardStats = async (options = {}) => {
    const window = resolveDashboardWindow(options.range);
    const cacheKey = makeCacheKey('svc:admin-dashboard:', { dashboard: 'stats', range: window.range });
    const { value } = await rememberCachedJson({
        key: cacheKey,
        ttlSeconds: Math.max(20, Math.floor(CACHE_DEFAULT_TTL / 2)),
        producer: async () => {
            const [
                ordersPerDay,
                revenuePerDay,
                topTransporters,
                topRoutes,
                orderStatusDistribution,
                fleetUtilization,
                newCustomersPerMonth,
                mostRequestedTruckTypes,
                pendingVsCompletedOrders,
                avgBidAmount,
                totalCustomers,
                totalTransporters,
                totalDrivers,
                totalManagers,
                activeManagers,
                activeTrips,
                pendingCashouts,
                totalVehicles,
                openTickets,
                pendingVerifications,
                paymentStatusDistribution,
                tripStatusDistribution,
                ticketCategoryDistribution,
                ticketPriorityDistribution,
                resolvedTicketsTrend,
                managerResolvedTickets,
                managerOpenTicketLoad,
                managerStatusDistribution,
            ] = await Promise.all([
                adminRepo.getOrdersPerDay({ fromDate: window.fromDate, toDate: window.toDate, bucket: window.bucket, limit: window.seriesLimit }),
                adminRepo.getRevenuePerDay({ fromDate: window.fromDate, toDate: window.toDate, bucket: window.bucket, limit: window.seriesLimit }),
                adminRepo.getTopTransporters({ fromDate: window.fromDate, toDate: window.toDate, limit: 7 }),
                adminRepo.getTopRoutes({ fromDate: window.fromDate, toDate: window.toDate, limit: 7 }),
                adminRepo.getOrderStatusDistribution({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getFleetUtilization(),
                adminRepo.getNewCustomersPerMonth({ fromDate: window.fromDate, toDate: window.toDate, bucket: window.bucket === 'hour' ? 'day' : window.bucket, limit: window.seriesLimit }),
                adminRepo.getMostRequestedTruckTypes({ fromDate: window.fromDate, toDate: window.toDate, limit: 10 }),
                adminRepo.getPendingVsCompletedOrders({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getAverageBidAmount({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getTotalCustomers(),
                adminRepo.getTotalTransporters(),
                adminRepo.getTotalDrivers(),
                adminRepo.getTotalManagers(),
                adminRepo.getActiveManagers(),
                adminRepo.getActiveTrips(),
                adminRepo.getPendingCashouts(),
                adminRepo.getTotalVehicles(),
                adminRepo.getOpenTickets(),
                adminRepo.getPendingVerifications(),
                adminRepo.getPaymentStatusDistribution({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getTripStatusDistribution({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getTicketCategoryDistribution({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getTicketPriorityDistribution({ fromDate: window.fromDate, toDate: window.toDate }),
                adminRepo.getResolvedTicketsTrend({ fromDate: window.fromDate, toDate: window.toDate, bucket: window.bucket, limit: window.seriesLimit }),
                adminRepo.getManagerResolvedTickets({ fromDate: window.fromDate, toDate: window.toDate, limit: 8 }),
                adminRepo.getManagerOpenTicketLoad({ fromDate: window.fromDate, toDate: window.toDate, limit: 8 }),
                adminRepo.getManagerStatusDistribution(),
            ]);

            const paymentMetrics = paymentStatusDistribution.reduce((acc, row) => {
                const count = Number(row?.count || 0);
                const amount = Number(row?.amount || 0);
                const key = normalizeKey(row?.status);

                acc.total += count;
                acc.totalAmount += amount;

                if (key === 'completed') acc.completed += count;
                if (key === 'failed') acc.failed += count;
                if (key === 'refunded') acc.refunded += count;
                if (key === 'created' || key === 'pending') acc.pending += count;

                return acc;
            }, { total: 0, totalAmount: 0, completed: 0, pending: 0, failed: 0, refunded: 0 });

            const tripMetrics = tripStatusDistribution.reduce((acc, row) => {
                const count = Number(row?.count || 0);
                const key = normalizeKey(row?.status);

                acc.total += count;
                if (key === 'scheduled') acc.scheduled += count;
                if (key === 'active') acc.active += count;
                if (key === 'completed') acc.completed += count;
                if (key === 'cancelled') acc.cancelled += count;

                return acc;
            }, { total: 0, scheduled: 0, active: 0, completed: 0, cancelled: 0 });

            const ticketsCreatedInRange = ticketCategoryDistribution.reduce(
                (sum, row) => sum + Number(row?.count || 0),
                0,
            );
            const resolvedTicketsInRange = managerResolvedTickets.reduce(
                (sum, row) => sum + Number(row?.resolved_tickets || 0),
                0,
            );
            const openAssignedTickets = managerOpenTicketLoad.reduce(
                (sum, row) => sum + Number(row?.open_tickets || 0),
                0,
            );
            const topResolverManager = managerResolvedTickets[0]?.name || null;

            return {
                window: {
                    range: window.range,
                    label: window.label,
                    bucket: window.bucket,
                    fromDate: window.fromDate ? window.fromDate.toISOString() : null,
                    toDate: window.toDate.toISOString(),
                },
                totalOrders: ordersPerDay.reduce((sum, day) => sum + day.total_orders, 0),
                totalRevenue: revenuePerDay.reduce((sum, day) => sum + day.total_revenue, 0),
                pendingOrders: pendingVsCompletedOrders.pending_orders || 0,
                completedOrders: pendingVsCompletedOrders.completed_orders || 0,
                newCustomers: newCustomersPerMonth.reduce((sum, month) => sum + month.new_customers, 0),
                totalCustomers,
                totalTransporters,
                totalDrivers,
                totalManagers,
                activeManagers,
                activeTrips,
                pendingCashouts,
                totalVehicles,
                openTickets,
                pendingVerifications,
                ticketsCreatedInRange,
                resolvedTicketsInRange,
                openAssignedTickets,
                topResolverManager,
                totalPayments: paymentMetrics.total,
                totalPaymentAmount: paymentMetrics.totalAmount,
                successfulPayments: paymentMetrics.completed,
                failedPayments: paymentMetrics.failed,
                refundedPayments: paymentMetrics.refunded,
                pendingPayments: paymentMetrics.pending,
                totalTrips: tripMetrics.total,
                scheduledTrips: tripMetrics.scheduled,
                activeTripsInRange: tripMetrics.active,
                completedTrips: tripMetrics.completed,
                cancelledTrips: tripMetrics.cancelled,
                ordersPerDay,
                revenuePerDay,
                topTransporters,
                topRoutes,
                orderStatusDistribution,
                paymentStatusDistribution,
                tripStatusDistribution,
                ticketCategoryDistribution,
                ticketPriorityDistribution,
                resolvedTicketsTrend,
                managerResolvedTickets,
                managerOpenTicketLoad,
                managerStatusDistribution,
                fleetUtilization,
                newCustomersPerMonth,
                truckTypes: mostRequestedTruckTypes,
                orderRatio: pendingVsCompletedOrders,
                avgBidAmount: avgBidAmount?.avg_bid || 0
            };
        },
    });

    return value;
};

// Order Management
const getAllOrders = async (filters = {}) => {
    const { search, status, fromDate, toDate, sort = 'date', page, limit } = filters;

    let query = {};
    let sortOptions = {};

    // Status filter
    if (status) {
        query.status = status;
    }

    // Date range filter
    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Sort options
    switch (sort) {
        case 'status':
            sortOptions = { status: 1 };
            break;
        case 'customer':
            sortOptions = { customer_id: 1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const [customerIds, transporterIds] = await Promise.all([
            adminRepo.searchCustomerIds(search),
            adminRepo.searchTransporterIds(search),
        ]);

        const orConditions = [
            { 'pickup.city': regex },
            { 'pickup.state': regex },
            { 'delivery.city': regex },
            { 'delivery.state': regex },
        ];

        if (mongoose.Types.ObjectId.isValid(search)) {
            orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
        }

        if (customerIds.length > 0) {
            orConditions.push({ customer_id: { $in: customerIds } });
        }

        if (transporterIds.length > 0) {
            orConditions.push({ assigned_transporter_id: { $in: transporterIds } });
        }

        query.$or = orConditions;
    }

    return await adminRepo.getAllOrders(query, sortOptions, { page, limit });
};

const getOrderDetails = async (orderId) => {
    const order = await adminRepo.getOrderById(orderId);

    if (!order) {
        throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    return order;
};

const getBidsForOrder = async (orderId) => {
    // Verify order exists
    const order = await adminRepo.getOrderById(orderId);
    if (!order) {
        throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    const bids = await adminRepo.getBidsForOrder(orderId);
    return bids;
};

const getBidCountForOrder = async (orderId) => {
    const count = await adminRepo.getBidCountForOrder(orderId);
    return count;
};

// User Management
const getAllUsers = async (role, filters = {}) => {
    const { search, sort = 'date', page, limit } = filters;

    if (!['customer', 'transporter', 'driver'].includes(role.toLowerCase())) {
        throw new AppError(400, "ValidationError", "Invalid role specified", "ERR_VALIDATION");
    }

    let query = {};
    let sortOptions = {};

    if (role.toLowerCase() === 'customer') {
        // Search filter for customers
        if (search) {
            query = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Sort options for customers
        switch (sort) {
            case 'name':
                sortOptions = { firstName: 1, lastName: 1 };
                break;
            case 'id':
                sortOptions = { _id: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const customerResult = await adminRepo.getAllCustomers(query, sortOptions, { page, limit });
        const users = Array.isArray(customerResult) ? customerResult : customerResult.items;
        const orderCountMap = await adminRepo.getOrderCountByCustomer(users.map((user) => user._id));

        const formattedUsers = users.map(user => ({
            _id: user._id,
            customer_id: user._id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt,
            noOfOrders: orderCountMap[user._id.toString()] || 0
        }));

        if (!Array.isArray(customerResult)) {
            return {
                items: formattedUsers,
                pagination: customerResult.pagination,
            };
        }

        return formattedUsers;
    } else if (role.toLowerCase() === 'driver') {
        if (search) {
            query = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { licenseNumber: { $regex: search, $options: 'i' } },
                ],
            };
        }

        switch (sort) {
            case 'name':
                sortOptions = { firstName: 1, lastName: 1 };
                break;
            case 'id':
                sortOptions = { _id: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const driverResult = await adminRepo.getAllDrivers(query, sortOptions, { page, limit });
        const users = Array.isArray(driverResult) ? driverResult : driverResult.items;

        const formattedUsers = users.map((user) => ({
            _id: user._id,
            driver_id: user._id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            phone: user.phone,
            licenseNumber: user.licenseNumber,
            status: user.status,
            verificationStatus: user.verificationStatus,
            employment_type: user.employment_type,
            transporter_id: user.transporter_id,
            createdAt: user.createdAt,
        }));

        if (!Array.isArray(driverResult)) {
            return {
                items: formattedUsers,
                pagination: driverResult.pagination,
            };
        }

        return formattedUsers;
    } else {
        // Search filter for transporters
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Sort options for transporters
        switch (sort) {
            case 'name':
                sortOptions = { name: 1 };
                break;
            case 'id':
                sortOptions = { _id: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const transporterResult = await adminRepo.getAllTransporters(query, sortOptions, { page, limit });
        const users = Array.isArray(transporterResult) ? transporterResult : transporterResult.items;
        const orderCountMap = await adminRepo.getOrderCountByTransporter(users.map((user) => user._id));

        const formattedUsers = users.map(user => ({
            _id: user._id,
            transporter_id: user._id,
            name: user.name,
            email: user.email,
            primary_contact: user.primary_contact,
            createdAt: user.createdAt,
            noOfOrders: orderCountMap[user._id.toString()] || 0
        }));

        if (!Array.isArray(transporterResult)) {
            return {
                items: formattedUsers,
                pagination: transporterResult.pagination,
            };
        }

        return formattedUsers;
    }
};

const deleteUser = async (role, userId) => {
    if (!['customer', 'transporter', 'driver'].includes(role.toLowerCase())) {
        throw new AppError(400, "ValidationError", "Invalid role specified", "ERR_VALIDATION");
    }

    let result;
    if (role.toLowerCase() === 'customer') {
        result = await adminRepo.deleteCustomerById(userId);
        if (!result) {
            throw new AppError(404, "NotFound", "Customer not found", "ERR_NOT_FOUND");
        }
    } else if (role.toLowerCase() === 'driver') {
        result = await adminRepo.deleteDriverById(userId);
        if (!result) {
            throw new AppError(404, "NotFound", "Driver not found", "ERR_NOT_FOUND");
        }
    } else {
        result = await adminRepo.deleteTransporterById(userId);
        if (!result) {
            throw new AppError(404, "NotFound", "Transporter not found", "ERR_NOT_FOUND");
        }
    }

    return { message: `${role} deleted successfully` };
};

// Fleet Overview
const getFleetOverview = async (filters = {}) => {
    const { search, status, rcStatus, truckType, page, limit, sort = 'date' } = filters;
    const query = {};
    let sortOptions = { createdAt: -1 };

    if (status) {
        query.status = status;
    }

    if (rcStatus) {
        query.rc_status = rcStatus;
    }

    if (truckType) {
        query.truck_type = truckType;
    }

    if (sort === 'name') {
        sortOptions = { name: 1 };
    } else if (sort === 'registration') {
        sortOptions = { registration: 1 };
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const transporterIds = await adminRepo.searchTransporterIds(search);
        const orConditions = [
            { name: { $regex: regex } },
            { registration: { $regex: regex } },
            { truck_type: { $regex: regex } },
        ];

        if (transporterIds.length > 0) {
            orConditions.push({ transporter_id: { $in: transporterIds } });
        }

        query.$or = orConditions;
    }

    const fleetResult = await adminRepo.getAllFleetVehicles(query, sortOptions, { page, limit });
    const vehicles = fleetResult.items || fleetResult;
    const allVehicles = await adminRepo.getAllFleetVehicles();
    const stats = {
        total: allVehicles.length,
        available: allVehicles.filter(v => v.status === 'Available').length,
        assigned: allVehicles.filter(v => v.status === 'Assigned').length,
        maintenance: allVehicles.filter(v => v.status === 'In Maintenance').length,
        unavailable: allVehicles.filter(v => v.status === 'Unavailable').length,
        rcApproved: allVehicles.filter(v => v.rc_status === 'approved').length,
        rcPending: allVehicles.filter(v => v.rc_status === 'pending').length,
        rcRejected: allVehicles.filter(v => v.rc_status === 'rejected').length,
    };
    return { vehicles, stats, pagination: fleetResult.pagination };
};

// Tickets Overview
const getTicketsOverview = async (filters = {}) => {
    const { search, status, priority, category, role, page, limit, sort = 'date' } = filters;
    const query = {};
    let sortOptions = { createdAt: -1 };

    if (status) {
        query.status = status;
    }

    if (priority) {
        query.priority = priority;
    }

    if (category) {
        query.category = category;
    }

    if (role) {
        query.userRole = role;
    }

    if (sort === 'status') {
        sortOptions = { status: 1, createdAt: -1 };
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
            { ticketId: { $regex: regex } },
            { userName: { $regex: regex } },
            { userEmail: { $regex: regex } },
            { subject: { $regex: regex } },
        ];
    }

    const [ticketsResult, stats] = await Promise.all([
        adminRepo.getAllTickets(query, sortOptions, { page, limit }),
        adminRepo.getTicketStats()
    ]);

    return {
        tickets: ticketsResult.items || ticketsResult,
        pagination: ticketsResult.pagination,
        stats,
    };
};

const getTicketDetail = async (ticketId) => {
    const ticket = await adminRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFound', 'Ticket not found', 'ERR_NOT_FOUND');
    }

    const ticketData = { ...ticket };
    if (ticketData.orderId) {
        const order = await adminRepo.getOrderById(ticketData.orderId);
        if (order) {
            ticketData.orderDetails = {
                _id: order._id,
                pickup: order.pickup,
                delivery: order.delivery,
                status: order.status,
                goods_type: order.goods_type,
                weight: order.weight,
                truck_type: order.truck_type,
                max_price: order.max_price,
                final_price: order.final_price,
                scheduled_at: order.scheduled_at,
                customer: order.customer_id
                    ? {
                        name: `${order.customer_id.firstName || ''} ${order.customer_id.lastName || ''}`.trim(),
                        email: order.customer_id.email,
                        phone: order.customer_id.phone,
                    }
                    : null,
                transporter: order.assigned_transporter_id
                    ? {
                        name: order.assigned_transporter_id.name,
                        email: order.assigned_transporter_id.email,
                        contact: order.assigned_transporter_id.primary_contact,
                    }
                    : null,
            };
        }
    }

    return ticketData;
};

const replyToTicket = async (ticketId, text) => {
    if (!text || !text.trim()) {
        throw new AppError(400, 'ValidationError', 'Reply text is required', 'ERR_VALIDATION');
    }

    return ticketService.addManagerReply(ticketId, text.trim(), 'Admin', null);
};

const updateTicketStatus = async (ticketId, status) => {
    const allowedStatuses = ['open', 'in_progress', 'closed'];
    if (!allowedStatuses.includes(status)) {
        throw new AppError(400, 'ValidationError', 'Invalid ticket status', 'ERR_VALIDATION');
    }

    return ticketService.updateTicketStatus(ticketId, status, null);
};

const getVerificationQueue = async () => {
    return managerService.getVerificationQueue(null, { includeAllStatuses: true });
};

const approveVerificationDocument = async (entityId, entityType, docType) => {
    return managerService.approveDocument(entityId, entityType || 'transporter', docType, null);
};

const rejectVerificationDocument = async (entityId, entityType, docType, note) => {
    if (!note || !note.trim()) {
        throw new AppError(400, 'ValidationError', 'Rejection reason is required', 'ERR_VALIDATION');
    }

    return managerService.rejectDocument(entityId, entityType || 'transporter', docType, note.trim(), null);
};

const getAllTrips = async (filters = {}) => {
    const { status, transporterId, driverId, search, page, limit, sort = 'date' } = filters;
    const query = {};
    let sortOptions = { createdAt: -1 };

    if (status) {
        query.status = status;
    }

    if (transporterId && mongoose.Types.ObjectId.isValid(transporterId)) {
        query.transporter_id = new mongoose.Types.ObjectId(transporterId);
    }

    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
        query.assigned_driver_id = new mongoose.Types.ObjectId(driverId);
    }

    if (sort === 'start_time') {
        sortOptions = { planned_start_at: -1, createdAt: -1 };
    }

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const orConditions = [
            { 'stops.address.city': regex },
            { status: regex },
        ];

        if (mongoose.Types.ObjectId.isValid(search)) {
            orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
        }

        query.$or = orConditions;
    }

    return adminRepo.getAllTrips(query, sortOptions, { page, limit });
};

const getTripDetail = async (tripId) => {
    const trip = await adminRepo.getTripByIdDetailed(tripId);
    if (!trip) {
        throw new AppError(404, 'NotFound', 'Trip not found', 'ERR_NOT_FOUND');
    }
    return trip;
};

const getAllPayments = async (filters = {}) => {
    const { status, paymentType, search, page, limit, sort = 'date' } = filters;
    const query = {};
    let sortOptions = { createdAt: -1 };

    if (status) {
        query.status = status;
    }

    if (paymentType) {
        query.payment_type = paymentType;
    }

    if (sort === 'amount_desc') sortOptions = { amount: -1, createdAt: -1 };
    if (sort === 'amount_asc') sortOptions = { amount: 1, createdAt: -1 };

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const orConditions = [
            { razorpay_order_id: regex },
            { razorpay_payment_id: regex },
        ];

        if (mongoose.Types.ObjectId.isValid(search)) {
            const oid = new mongoose.Types.ObjectId(search);
            orConditions.push({ _id: oid }, { order_id: oid }, { customer_id: oid });
        }

        query.$or = orConditions;
    }

    const paymentsResult = await adminRepo.getAllPayments(query, sortOptions, { page, limit });
    const stats = await adminRepo.getPaymentStats();

    return {
        payments: paymentsResult.items || paymentsResult,
        pagination: paymentsResult.pagination,
        stats,
    };
};

const getPaymentDetail = async (paymentId) => {
    const payment = await adminRepo.getPaymentById(paymentId);
    if (!payment) {
        throw new AppError(404, 'NotFound', 'Payment not found', 'ERR_NOT_FOUND');
    }
    return payment;
};

// Cashouts Overview
const getAllCashouts = async (filters = {}) => {
    const { status, search, sort = 'date', page, limit } = filters;
    let query = {};
    let sortOptions = {};

    if (status) {
        query.status = status;
    }

    if (search) {
        if (mongoose.Types.ObjectId.isValid(search)) {
            query._id = new mongoose.Types.ObjectId(search);
        } else {
            const transporterIds = await adminRepo.searchTransporterIds(search);
            if (transporterIds.length > 0) {
                query.transporter_id = { $in: transporterIds };
            }
        }
    }

    switch (sort) {
        case 'amount_desc': sortOptions = { requested_amount: -1 }; break;
        case 'amount_asc': sortOptions = { requested_amount: 1 }; break;
        case 'status': sortOptions = { status: 1 }; break;
        default: sortOptions = { createdAt: -1 };
    }

    const cashoutsResult = await adminRepo.getAllCashouts(query, sortOptions, { page, limit });
    
    // Calculate global stats
    const allCashouts = await adminRepo.getAllCashouts({}, {}, { limit: 10000 });
    const items = Array.isArray(allCashouts) ? allCashouts : allCashouts.items || [];
    const stats = {
        total: items.length,
        totalAmount: items.reduce((sum, c) => sum + c.requested_amount, 0),
        processing: items.filter(c => c.status === 'Processing').length,
        processed: items.filter(c => c.status === 'Processed').length,
        pendingAmount: items.filter(c => c.status === 'Processing').reduce((sum, c) => sum + c.requested_amount, 0)
    };

    return { cashouts: cashoutsResult.items || cashoutsResult, pagination: cashoutsResult.pagination, stats };
};

const updateCashoutStatus = async (cashoutId, { status, note, razorpayPayoutId } = {}) => {
    const allowedStatuses = ['Pending', 'Processing', 'Processed', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
        throw new AppError(400, 'ValidationError', 'Invalid cashout status', 'ERR_VALIDATION');
    }

    const cashout = await adminRepo.getCashoutById(cashoutId);
    if (!cashout) {
        throw new AppError(404, 'NotFound', 'Cashout request not found', 'ERR_NOT_FOUND');
    }

    const transitions = {
        Pending: ['Pending', 'Processing', 'Processed', 'Rejected'],
        Processing: ['Processing', 'Processed', 'Rejected'],
        Processed: ['Processed'],
        Rejected: ['Rejected'],
    };

    const current = cashout.status;
    if (!transitions[current]?.includes(status)) {
        throw new AppError(400, 'ValidationError', `Invalid status transition: ${current} -> ${status}`, 'ERR_INVALID_OPERATION');
    }

    if (current !== 'Rejected' && status === 'Rejected') {
        const transporterId = cashout.transporter_id?._id || cashout.transporter_id;
        const wallet = await walletRepo.findOrCreateWallet(transporterId);
        await walletRepo.creditWallet(
            wallet._id,
            transporterId,
            cashout.requested_amount,
            cashout._id,
            `Cashout #${cashout._id} rejected by admin${note ? `: ${note}` : ''}`
        );
    }

    const extras = {
        admin_note: note?.trim() || null,
    };
    if (status === 'Processed' && razorpayPayoutId) {
        extras.razorpay_payout_id = razorpayPayoutId;
    }

    return adminRepo.updateCashoutStatus(cashoutId, status, extras);
};

// Individual User Detail
const getUserDetail = async (role, userId) => {
    const normalizedRole = (role || '').toLowerCase();

    if (normalizedRole === 'customer') {
        const detail = await adminRepo.getCustomerDetail(userId);
        if (!detail) throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
        return detail;
    }

    if (normalizedRole === 'driver') {
        const detail = await adminRepo.getDriverDetail(userId);
        if (!detail) throw new AppError(404, 'NotFound', 'Driver not found', 'ERR_NOT_FOUND');
        return detail;
    }

    if (normalizedRole === 'transporter') {
        const detail = await adminRepo.getTransporterDetail(userId);
        if (!detail) throw new AppError(404, 'NotFound', 'Transporter not found', 'ERR_NOT_FOUND');
        return detail;
    }

    throw new AppError(400, 'ValidationError', 'Invalid role specified', 'ERR_VALIDATION');
};

export default {
    // Dashboard
    getDashboardStats,

    // Orders
    getAllOrders,
    getOrderDetails,
    getBidsForOrder,
    getBidCountForOrder,

    // Users
    getAllUsers,
    deleteUser,
    getUserDetail,

    // Fleet
    getFleetOverview,

    // Tickets
    getTicketsOverview,
    getTicketDetail,
    replyToTicket,
    updateTicketStatus,

    // Verification
    getVerificationQueue,
    approveVerificationDocument,
    rejectVerificationDocument,

    // Trips
    getAllTrips,
    getTripDetail,

    // Payments
    getAllPayments,
    getPaymentDetail,

    // Cashouts
    getAllCashouts,
    updateCashoutStatus,
};
