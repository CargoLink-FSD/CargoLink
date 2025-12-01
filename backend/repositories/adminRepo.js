import Order from '../models/order.js';
import Customer from '../models/customer.js';
import Transporter from '../models/transporter.js';
import Bid from '../models/bids.js';

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
    const result = await Transporter.aggregate([
        { $unwind: "$fleet" },
        {
            $group: {
                _id: "$fleet.status",
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
const getAllOrders = async (query = {}, sortOptions = { createdAt: -1 }) => {
    const orders = await Order.find(query)
        .populate('customer_id', 'firstName lastName email phone')
        .populate('assigned_transporter_id', 'name email primary_contact')
        .sort(sortOptions);
    return orders;
};

const getOrderById = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('customer_id', 'firstName lastName email phone')
        .populate('assigned_transporter_id', 'name email primary_contact fleet');
    return order;
};

const getBidsForOrder = async (orderId) => {
    const bids = await Bid.find({ order_id: orderId })
        .populate('transporter_id', 'name email primary_contact fleet')
        .sort({ bid_amount: 1 });
    return bids;
};

const getBidCountForOrder = async (orderId) => {
    const count = await Bid.countDocuments({ order_id: orderId });
    return count;
};

// User Management
const getAllCustomers = async (query = {}, sortOptions = { createdAt: -1 }) => {
    const customers = await Customer.find(query).sort(sortOptions);
    return customers;
};

const getAllTransporters = async (query = {}, sortOptions = { createdAt: -1 }) => {
    const transporters = await Transporter.find(query).sort(sortOptions);
    return transporters;
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

const getOrderCountByCustomer = async () => {
    const result = await Order.aggregate([
        {
            $group: {
                _id: "$customer_id",
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

const getOrderCountByTransporter = async () => {
    const result = await Order.aggregate([
        {
            $match: { assigned_transporter_id: { $ne: null } }
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
    
    // Order Management
    getAllOrders,
    getOrderById,
    getBidsForOrder,
    getBidCountForOrder,
    
    // User Management
    getAllCustomers,
    getAllTransporters,
    getCustomerById,
    getTransporterById,
    deleteCustomerById,
    deleteTransporterById,
    getOrderCountByCustomer,
    getOrderCountByTransporter
};
