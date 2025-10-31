const adminModel = require('../models/adminModel');
const Customer = require('../models/customer'); // Import Customer model
const Transporter = require('../models/transporter'); // Import Transporter model

async function getDashboardStats() {
    try {
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
            adminModel.getOrdersPerDay(),
            adminModel.getRevenuePerDay(),
            adminModel.getTopTransporters(),
            adminModel.getOrderStatusDistribution(),
            adminModel.getFleetUtilization(),
            adminModel.getNewCustomersPerMonth(),
            adminModel.getMostRequestedTruckTypes(),
            adminModel.getPendingVsCompletedOrders(),
            adminModel.getAverageBidAmount()
        ]);

        return {
            totalOrders: ordersPerDay.reduce((sum, day) => sum + day.total_orders, 0),
            totalRevenue: revenuePerDay.reduce((sum, day) => sum + day.total_revenue, 0),
            pendingOrders: pendingVsCompletedOrders.pending_orders || 0,
            newCustomers: newCustomersPerMonth.reduce((sum, month) => sum + month.new_customers, 0),
            ordersPerDay,
            revenuePerDay,
            topTransporters,
            orderStatusDistribution,
            fleetUtilization,
            newCustomersPerMonth,
            truckTypes: mostRequestedTruckTypes,
            orderRatio: pendingVsCompletedOrders || { pending_orders: 0, completed_orders: 0 },
            avgBidAmount: avgBidAmount?.avg_bid || 0
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw new Error('Failed to fetch dashboard statistics');
    }
}

// Delete a customer by ID
async function deleteCustomer(customer_id) {
    try {
        const result = await Customer.findByIdAndDelete(customer_id);
        if (!result) {
            throw new Error('Customer not found');
        }
        return { message: 'Customer removed successfully' };
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw new Error('Failed to delete customer');
    }
}

// Delete a transporter by ID
async function deleteTransporter(transporter_id) {
    try {
        const result = await Transporter.findByIdAndDelete(transporter_id);
        if (!result) {
            throw new Error('Transporter not found');
        }
        return { message: 'Transporter removed successfully' };
    } catch (error) {
        console.error('Error deleting transporter:', error);
        throw new Error('Failed to delete transporter');
    }
}

// Individual API functions
async function getOrdersPerDay(req, res) {
    try {
        const data = await adminModel.getOrdersPerDay();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders per day' });
    }
}

async function getRevenuePerDay(req, res) {
    try {
        const data = await adminModel.getRevenuePerDay();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch revenue per day' });
    }
}

async function getTopTransporters(req, res) {
    try {
        const data = await adminModel.getTopTransporters();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top transporters' });
    }
}

async function getOrderStatusDistribution(req, res) {
    try {
        const data = await adminModel.getOrderStatusDistribution();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order status distribution' });
    }
}

async function getFleetUtilization(req, res) {
    try {
        const data = await adminModel.getFleetUtilization();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fleet utilization' });
    }
}

async function getNewCustomersPerMonth(req, res) {
    try {
        const data = await adminModel.getNewCustomersPerMonth();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch new customers per month' });
    }
}

async function getMostRequestedTruckTypes(req, res) {
    try {
        const data = await adminModel.getMostRequestedTruckTypes();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch most requested truck types' });
    }
}

async function getPendingVsCompletedOrders(req, res) {
    try {
        const data = await adminModel.getPendingVsCompletedOrders();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending vs completed orders' });
    }
}

async function getAverageBidAmount(req, res) {
    try {
        const data = await adminModel.getAverageBidAmount();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch average bid amount' });
    }
}

async function getAllOrders(req, res) {
    try {
        const orders = await adminModel.getAllOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}

module.exports = {
    getDashboardStats,
    deleteCustomer, // Added
    deleteTransporter, // Added
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