const Order = require('../models/order');
const Customer = require('../models/customer');
const Transporter = require('../models/transporter');
const Bid = require('../models/bids');

async function getOrdersPerDay() {
    try {
        const result = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
                    total_orders: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    order_day: "$_id",
                    total_orders: 1,
                    _id: 0
                }
            }
        ]);
        console.log("Orders Per Day:", result);
        return result;
    } catch (error) {
        console.error("Error fetching orders per day:", error);
        return [];
    }
}

async function getRevenuePerDay() {
    try {
        const result = await Order.aggregate([
            { $match: { status: "Completed" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
                    total_revenue: { $sum: "$final_price" }
                }
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    order_day: "$_id",
                    total_revenue: 1,
                    _id: 0
                }
            }
        ]);
        console.log("Revenue Per Day:", result);
        return result;
    } catch (error) {
        console.error("Error fetching revenue per day:", error);
        return [];
    }
}

async function getTopTransporters() {
    try {
        const result = await Order.aggregate([
            { $match: { status: "Completed" } },
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
        console.log("Top Transporters:", result);
        return result;
    } catch (error) {
        console.error("Error fetching top transporters:", error);
        return [];
    }
}

async function getOrderStatusDistribution() {
    try {
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
        console.log("Order Status Distribution:", result);
        return result;
    } catch (error) {
        console.error("Error fetching order status distribution:", error);
        return [];
    }
}

async function getFleetUtilization() {
    try {
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
        console.log("Fleet Utilization:", result);
        return result;
    } catch (error) {
        console.error("Error fetching fleet utilization:", error);
        return [];
    }
}

async function getNewCustomersPerMonth() {
    try {
        const result = await Customer.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    new_customers: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            {
                $project: {
                    month: "$_id",
                    new_customers: 1,
                    _id: 0
                }
            }
        ]);
        console.log("New Customers Per Month:", result);
        return result;
    } catch (error) {
        console.error("Error fetching new customers per month:", error);       
        return [];
    }
}

async function getMostRequestedTruckTypes() {
    try {
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
        console.log("Most Requested Truck Types:", result);
        return result;
    } catch (error) {
        console.error("Error fetching most requested truck types:", error);
        return [];
    }
}

async function getPendingVsCompletedOrders() {
    try {
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

        const data = {
            pending_orders: result[0]?.pending_orders || 0,
            completed_orders: result[0]?.completed_orders || 0
        };
        console.log("Pending vs Completed Orders:", data);
        return data;
    } catch (error) {
        console.error("Error fetching pending vs completed orders:", error);
        return { pending_orders: 0, completed_orders: 0 };
    }
}

async function getAverageBidAmount() {
    try {
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
        console.log("Average Bid Amount:", result);
        return result[0] || { avg_bid: 0 };
    } catch (error) {
        console.error("Error fetching average bid amount:", error);
        return { avg_bid: 0 };
    }
}

async function getAllOrders() {
    try {
        const result = await Order.find().sort({ order_date: -1 });
        console.log("All Orders:", result);
        return result;
    } catch (error) {
        console.error("Error fetching all orders:", error);
        return [];
    }
}

module.exports = {
    getOrdersPerDay,
    getRevenuePerDay,
    getTopTransporters,
    getOrderStatusDistribution,
    getFleetUtilization,
    getNewCustomersPerMonth,
    getMostRequestedTruckTypes,
    getPendingVsCompletedOrders,
    getAverageBidAmount,
    getAllOrders
};