import adminRepo from '../repositories/adminRepo.js';
import { AppError } from '../utils/misc.js';

// Dashboard Statistics
const getDashboardStats = async () => {
    const [
        ordersPerDay,
        revenuePerDay,
        topTransporters,
        orderStatusDistribution,
        fleetUtilization,
        newCustomersPerMonth,
        mostRequestedTruckTypes,
        pendingVsCompletedOrders,
        avgBidAmount
    ] = await Promise.all([
        adminRepo.getOrdersPerDay(),
        adminRepo.getRevenuePerDay(),
        adminRepo.getTopTransporters(),
        adminRepo.getOrderStatusDistribution(),
        adminRepo.getFleetUtilization(),
        adminRepo.getNewCustomersPerMonth(),
        adminRepo.getMostRequestedTruckTypes(),
        adminRepo.getPendingVsCompletedOrders(),
        adminRepo.getAverageBidAmount()
    ]);

    return {
        totalOrders: ordersPerDay.reduce((sum, day) => sum + day.total_orders, 0),
        totalRevenue: revenuePerDay.reduce((sum, day) => sum + day.total_revenue, 0),
        pendingOrders: pendingVsCompletedOrders.pending_orders || 0,
        completedOrders: pendingVsCompletedOrders.completed_orders || 0,
        newCustomers: newCustomersPerMonth.reduce((sum, month) => sum + month.new_customers, 0),
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
};

// Order Management
const getAllOrders = async (filters = {}) => {
    const { search, status, fromDate, toDate, sort = 'date' } = filters;
    
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
    switch(sort) {
        case 'status':
            sortOptions = { status: 1 };
            break;
        case 'customer':
            sortOptions = { customer_id: 1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    let orders = await adminRepo.getAllOrders(query, sortOptions);

    // Search filter (applied after population)
    if (search) {
        orders = orders.filter(order => {
            const customerName = order.customer_id
                ? `${order.customer_id.firstName} ${order.customer_id.lastName}`.toLowerCase()
                : '';
            const transporterName = order.assigned_transporter_id?.name?.toLowerCase() || '';
            
            return (
                customerName.includes(search.toLowerCase()) ||
                transporterName.includes(search.toLowerCase()) ||
                order.pickup_location?.toLowerCase().includes(search.toLowerCase()) ||
                order.dropoff_location?.toLowerCase().includes(search.toLowerCase()) ||
                order._id.toString().includes(search)
            );
        });
    }

    return orders;
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
    const { search, sort = 'date' } = filters;

    if (!['customer', 'transporter'].includes(role.toLowerCase())) {
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
        switch(sort) {
            case 'name':
                sortOptions = { firstName: 1, lastName: 1 };
                break;
            case 'id':
                sortOptions = { _id: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const users = await adminRepo.getAllCustomers(query, sortOptions);
        const orderCountMap = await adminRepo.getOrderCountByCustomer();

        return users.map(user => ({
            _id: user._id,
            customer_id: user._id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt,
            noOfOrders: orderCountMap[user._id.toString()] || 0
        }));
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
        switch(sort) {
            case 'name':
                sortOptions = { name: 1 };
                break;
            case 'id':
                sortOptions = { _id: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const users = await adminRepo.getAllTransporters(query, sortOptions);
        const orderCountMap = await adminRepo.getOrderCountByTransporter();

        return users.map(user => ({
            _id: user._id,
            transporter_id: user._id,
            name: user.name,
            email: user.email,
            primary_contact: user.primary_contact,
            createdAt: user.createdAt,
            noOfOrders: orderCountMap[user._id.toString()] || 0
        }));
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
    deleteUser
};
