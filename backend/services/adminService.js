import adminRepo from '../repositories/adminRepo.js';
import { AppError, escapeRegex, parsePaginationParams } from '../utils/misc.js';
import mongoose from 'mongoose';
import { CACHE_DEFAULT_TTL } from '../core/index.js';
import { makeCacheKey, rememberCachedJson } from '../core/cache.js';
import { searchAdminOrderIdsViaSolr, searchAdminUserIdsViaSolr } from './solr/adminSearchSolrAdapter.js';
import { searchAdminTicketIdsViaSolr } from './solr/orderTicketSearchSolrAdapter.js';

const reorderByIds = (items = [], ids = []) => {
    if (!ids.length) return items;

    const itemMap = new Map(items.map((item) => [String(item._id), item]));
    return ids.map((id) => itemMap.get(String(id))).filter(Boolean);
};

// Dashboard Statistics
const getDashboardStats = async () => {
    const cacheKey = makeCacheKey('svc:admin-dashboard:', { dashboard: 'stats' });
    const { value } = await rememberCachedJson({
        key: cacheKey,
        ttlSeconds: Math.max(20, Math.floor(CACHE_DEFAULT_TTL / 2)),
        producer: async () => {
            const [
                ordersPerDay,
                revenuePerDay,
                topTransporters,
                orderStatusDistribution,
                fleetUtilization,
                newCustomersPerMonth,
                mostRequestedTruckTypes,
                pendingVsCompletedOrders,
                avgBidAmount,
                totalCustomers,
                totalTransporters,
                totalVehicles,
                openTickets,
                pendingVerifications
            ] = await Promise.all([
                adminRepo.getOrdersPerDay(),
                adminRepo.getRevenuePerDay(),
                adminRepo.getTopTransporters(),
                adminRepo.getOrderStatusDistribution(),
                adminRepo.getFleetUtilization(),
                adminRepo.getNewCustomersPerMonth(),
                adminRepo.getMostRequestedTruckTypes(),
                adminRepo.getPendingVsCompletedOrders(),
                adminRepo.getAverageBidAmount(),
                adminRepo.getTotalCustomers(),
                adminRepo.getTotalTransporters(),
                adminRepo.getTotalVehicles(),
                adminRepo.getOpenTickets(),
                adminRepo.getPendingVerifications()
            ]);

            return {
                totalOrders: ordersPerDay.reduce((sum, day) => sum + day.total_orders, 0),
                totalRevenue: revenuePerDay.reduce((sum, day) => sum + day.total_revenue, 0),
                pendingOrders: pendingVsCompletedOrders.pending_orders || 0,
                completedOrders: pendingVsCompletedOrders.completed_orders || 0,
                newCustomers: newCustomersPerMonth.reduce((sum, month) => sum + month.new_customers, 0),
                totalCustomers,
                totalTransporters,
                totalVehicles,
                openTickets,
                pendingVerifications,
                ordersPerDay,
                revenuePerDay,
                topTransporters,
                orderStatusDistribution,
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
    const hasSearchTerm = String(search || '').trim().length > 0;
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

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

    if (hasSearchTerm) {
        const solrResult = await searchAdminOrderIdsViaSolr({
            search,
            status,
            fromDate,
            toDate,
            sort,
            page: pagination?.page,
            limit: pagination?.limit,
        });

        if (solrResult) {
            const items = solrResult.ids.length > 0
                ? reorderByIds(await adminRepo.getOrdersByIds(solrResult.ids), solrResult.ids)
                : [];

            return {
                items,
                pagination: solrResult.pagination,
            };
        }
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
    const normalizedRole = role.toLowerCase();
    const hasSearchTerm = String(search || '').trim().length > 0;
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    if (!['customer', 'transporter'].includes(normalizedRole)) {
        throw new AppError(400, "ValidationError", "Invalid role specified", "ERR_VALIDATION");
    }

    let query = {};
    let sortOptions = {};

    if (normalizedRole === 'customer') {
        const solrResult = hasSearchTerm
            ? await searchAdminUserIdsViaSolr({
                role: 'customer',
                search,
                sort,
                page: pagination?.page,
                limit: pagination?.limit,
            })
            : null;

        if (solrResult) {
            const users = solrResult.ids.length > 0
                ? reorderByIds(await adminRepo.getCustomersByIds(solrResult.ids), solrResult.ids)
                : [];

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

            return {
                items: formattedUsers,
                pagination: solrResult.pagination,
            };
        }

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
    } else {
        const solrResult = hasSearchTerm
            ? await searchAdminUserIdsViaSolr({
                role: 'transporter',
                search,
                sort,
                page: pagination?.page,
                limit: pagination?.limit,
            })
            : null;

        if (solrResult) {
            const users = solrResult.ids.length > 0
                ? reorderByIds(await adminRepo.getTransportersByIds(solrResult.ids), solrResult.ids)
                : [];

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

            return {
                items: formattedUsers,
                pagination: solrResult.pagination,
            };
        }

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
    if (!['customer', 'transporter'].includes(role.toLowerCase())) {
        throw new AppError(400, "ValidationError", "Invalid role specified", "ERR_VALIDATION");
    }

    let result;
    if (role.toLowerCase() === 'customer') {
        result = await adminRepo.deleteCustomerById(userId);
        if (!result) {
            throw new AppError(404, "NotFound", "Customer not found", "ERR_NOT_FOUND");
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
const getFleetOverview = async () => {
    const vehicles = await adminRepo.getAllFleetVehicles();
    const stats = {
        total: vehicles.length,
        available: vehicles.filter(v => v.status === 'Available').length,
        assigned: vehicles.filter(v => v.status === 'Assigned').length,
        maintenance: vehicles.filter(v => v.status === 'In Maintenance').length,
        unavailable: vehicles.filter(v => v.status === 'Unavailable').length,
        rcApproved: vehicles.filter(v => v.rc_status === 'approved').length,
        rcPending: vehicles.filter(v => v.rc_status === 'pending').length,
        rcRejected: vehicles.filter(v => v.rc_status === 'rejected').length,
    };
    return { vehicles, stats };
};

// Tickets Overview
const getTicketsOverview = async (filters = {}) => {
    const {
        search,
        status,
        priority,
        category,
        userRole,
        page,
        limit,
    } = filters;

    const hasSearchTerm = String(search || '').trim().length > 0;
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 });
    let ticketsResult = null;

    if (hasSearchTerm) {
        const solrResult = await searchAdminTicketIdsViaSolr({
            search,
            status,
            priority,
            category,
            userRole,
            page: pagination?.page,
            limit: pagination?.limit,
        });

        if (solrResult) {
            const items = solrResult.ids.length > 0
                ? reorderByIds(await adminRepo.getTicketsByIds(solrResult.ids), solrResult.ids)
                : [];

            ticketsResult = solrResult.pagination
                ? { items, pagination: solrResult.pagination }
                : items;
        }
    }

    if (!ticketsResult) {
        ticketsResult = await adminRepo.getAllTickets(
            { status, priority, category, userRole },
            { page, limit }
        );
    }

    const stats = await adminRepo.getTicketStats();

    if (Array.isArray(ticketsResult)) {
        return { tickets: ticketsResult, stats };
    }

    return {
        tickets: ticketsResult.items,
        pagination: ticketsResult.pagination,
        stats,
    };
};

// Individual User Detail
const getUserDetail = async (role, userId) => {
    if (role === 'customer') {
        const detail = await adminRepo.getCustomerDetail(userId);
        if (!detail) throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
        return detail;
    } else {
        const detail = await adminRepo.getTransporterDetail(userId);
        if (!detail) throw new AppError(404, 'NotFound', 'Transporter not found', 'ERR_NOT_FOUND');
        return detail;
    }
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
    getTicketsOverview
};
