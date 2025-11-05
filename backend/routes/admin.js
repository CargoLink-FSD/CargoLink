// Updated admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const Customer = require('../models/customer');
const Transporter = require('../models/transporter');
const Order = require('../models/order');
const Bid = require('../models/bids');
const authController = require('../controller/authController');
const authMiddleware = require('../middleware/authMiddleware');


//============================================
//login routes
router.get('/login', (req, res) => {
    res.render('login', { userType: 'admin' });
});

router.post('/login', authController.loginAdmin);

router.use(authMiddleware.isAdmin);

router.use((req, res, next) => {
    res.locals.userType = 'admin';
    next();
});

//============================================
// Order routes
// Get all orders with customer names
router.get('/orders-data', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer_id', 'firstName lastName')
            .populate('assigned_transporter_id', 'name')
            .sort({ order_date: -1 });

        const formattedOrders = orders.map(order => ({
            order_id: order._id,
            customer_name: order.customer_id ? `${order.customer_id.firstName} ${order.customer_id.lastName}` : 'N/A',
            transporter_name: order.assigned_transporter_id?.name || 'N/A',
            pickup_city: order.pickup.city,
            pickup_state: order.pickup.state,
            delivery_city: order.delivery.city,
            delivery_state: order.delivery.state,
            order_date: order.order_date,
            status: order.status
        }));
        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get filtered orders
router.get('/orders-filtered', async (req, res) => {
    try {
        const { search, status, fromDate, toDate } = req.query;

        const query = {};
        if (status) query.status = status;
        if (fromDate || toDate) {
            query.order_date = {};
            if (fromDate) query.order_date.$gte = new Date(fromDate);
            if (toDate) query.order_date.$lte = new Date(toDate);
        }

        let orders = await Order.find(query)
            .populate('customer_id', 'firstName lastName')
            .sort({ order_date: -1 });

        if (search) {
            orders = orders.filter(order => {
                const customerName = order.customer_id
                    ? `${order.customer_id.firstName} ${order.customer_id.lastName}`.toLowerCase()
                    : '';
                return (
                    customerName.includes(search.toLowerCase()) ||
                    order.pickup.city.toLowerCase().includes(search.toLowerCase()) ||
                    order.delivery.city.toLowerCase().includes(search.toLowerCase()) ||
                    order._id.toString().includes(search)
                );
            });
        }

        const formattedOrders = orders.map(order => ({
            order_id: order._id,
            customer_name: order.customer_id ? `${order.customer_id.firstName} ${order.customer_id.lastName}` : 'N/A',
            pickup_city: order.pickup.city,
            pickup_state: order.pickup.state,
            delivery_city: order.delivery.city,
            delivery_state: order.delivery.state,
            order_date: order.order_date,
            status: order.status
        }));

        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching filtered orders:', error);
        res.status(500).json({ error: 'Failed to fetch filtered orders' });
    }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId)
            .populate('customer_id', 'firstName lastName')
            .populate('assigned_transporter_id', 'name')
            .populate({
                path: 'assigned_transporter_id',
                populate: { path: 'fleet' }
            });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
                orderId
            });
        }

        const truck = order.assigned_transporter_id?.fleet?.find(f => f.current_order_id?.toString() === orderId);

        
        res.json({
            success: true,
            data: {
                order_id: order._id,
                customer_name: order.customer_id ? `${order.customer_id.firstName} ${order.customer_id.lastName}` : 'N/A',
                transporter_name: order.assigned_transporter_id?.name || 'N/A',
                truck_name: truck?.name || 'N/A',
                truck_type: truck?.truck_type || 'N/A',
                pickup_street: order.pickup.street,
                pickup_city: order.pickup.city,
                pickup_state: order.pickup.state,
                pickup_zip: order.pickup.pin,
                delivery_street: order.delivery.street,
                delivery_city: order.delivery.city,
                delivery_state: order.delivery.state,
                delivery_zip: order.delivery.pin,
                order_date: order.order_date,
                status: order.status
            }
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details',
            details: error.message
        });
    }
});

// Get bids for an order
router.get('/orders/:orderId/bids', async (req, res) => {
    try {
        const bids = await Bid.find({ order_id: req.params.orderId })
            .populate('transporter_id', 'name')
            .populate({
                path: 'transporter_id',
                populate: { path: 'fleet' }
            })
            .sort({ bid_amount: 1 });

        const formattedBids = bids.map(bid => {
            const truck = bid.transporter_id?.fleet?.find(f => f.current_order_id?.toString() === req.params.orderId);
            return {
                transporter_name: bid.transporter_id?.name || 'N/A',
                bid_amount: bid.bid_amount,
                truck_name: truck?.name || 'N/A',
                truck_type: truck?.truck_type || 'N/A',
                bid_time: bid.createdAt,
                status: bid.status || 'Pending'
            };
        });

        res.json(formattedBids);
    } catch (error) {
        console.error('Error fetching bids:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

// Get bid count for an order
router.get('/orders/:orderId/bid-count', async (req, res) => {
    try {
        const { orderId } = req.params;
        const count = await Bid.countDocuments({ order_id: orderId });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching bid count:', error);
        res.status(500).json({ error: 'Failed to fetch bid count' });
    }
});

router.get('/orders', (req, res) => {
    res.render('admin/orders');
});
//============================================



//============================================
// Dashboard routes
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

router.get('/dashboard', async (req, res) => {
    res.render('admin/dashboard');
});
router.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = await adminController.getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to fetch dashboard statistics"
        });
    }
});

// API endpoints for dashboard data
router.get('/api/dashboard/orders-per-day', adminController.getOrdersPerDay);
router.get('/api/dashboard/revenue-per-day', adminController.getRevenuePerDay);
router.get('/api/dashboard/top-transporters', adminController.getTopTransporters);
router.get('/api/dashboard/order-status', adminController.getOrderStatusDistribution);
router.get('/api/dashboard/fleet-utilization', adminController.getFleetUtilization);
router.get('/api/dashboard/new-customers', adminController.getNewCustomersPerMonth);
router.get('/api/dashboard/truck-types', adminController.getMostRequestedTruckTypes);
router.get('/api/dashboard/order-ratio', adminController.getPendingVsCompletedOrders);
router.get('/api/dashboard/avg-bid', adminController.getAverageBidAmount);

//============================================


//============================================
//user management routes
router.get('/users', async (req, res) => {
        res.render('./admin/users');
});

router.get('/api/users', async (req, res) => {
    try {
        const { role = 'Customer', search, sort = 'date' } = req.query;

        const validRoles = ['Customer', 'Transporter'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        let query = {};
        let sortOptions = {};

        if (role === 'Customer') {
            if (search) {
                query = {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            // Sorting for customers
            switch(sort) {
                case 'name':
                    sortOptions = { firstName: 1, lastName: 1 }; // Alphabetical by full name
                    break;
                case 'id':
                    sortOptions = { _id: 1 }; // By ID ascending
                    break;
                default:
                    sortOptions = { createdAt: -1 }; // By date joined, newest first
            }

            // Step 1: Aggregate orders to count per customer
            const orderCounts = await Order.aggregate([
                {
                    $group: {
                        _id: "$customer_id", // Group by customer_id
                        noOfOrders: { $sum: 1 }, // Count the number of orders
                    },
                },
            ]);

            // Convert order counts to a lookup map for easier access
            const orderCountMap = {};
            orderCounts.forEach((entry) => {
                orderCountMap[entry._id.toString()] = entry.noOfOrders;
            });
            const users = await Customer.find(query).sort(sortOptions);
            const formattedUsers = users.map(user => ({
                customer_id: user._id,
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                phone: user.phone,
                noOfOrders: orderCountMap[user._id.toString()] || 0
            }));
            res.json({ users: formattedUsers });
        } else {
            if (search) {
                query = {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            // Sorting for transporters
            switch(sort) {
                case 'name':
                    sortOptions = { name: 1 }; // Alphabetical by name
                    break;
                case 'id':
                    sortOptions = { _id: 1 }; // By ID ascending
                    break;
                default:
                    sortOptions = { createdAt: -1 }; // By date joined, newest first
            }

            // Step 1: Aggregate orders to count per transporter
            const orderCounts = await Order.aggregate([
                {
                    $group: {
                        _id: "$assigned_transporter_id", // Group by assigned_transporter_id
                        noOfOrders: { $sum: 1 }, // Count the number of orders
                    },
                },
            ]);
            console.log(orderCounts);

            // Convert order counts to a lookup map for easier access
            const orderCountMap = {};
            orderCounts.forEach((entry) => {
                if (entry._id != null) { // This checks for both null and undefined
                    orderCountMap[entry._id.toString()] = entry.noOfOrders;
                }
            });
            const users = await Transporter.find(query).sort(sortOptions);
            const formattedUsers = users.map(user => ({
                transporter_id: user._id,
                name: user.name,
                email: user.email,
                primary_contact: user.primary_contact,
                noOfOrders: orderCountMap[user._id.toString()] || 0
            }));
            res.json({ users: formattedUsers });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE route
router.delete('/users/delete/:role/:id', async (req, res) => {
    try {
        const { role, id } = req.params;

        if (role === 'Customer') {
            await adminController.deleteCustomer(id);
        } else if (role === 'Transporter') {
            await adminController.deleteTransporter(id);
        } else {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        res.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//============================================

module.exports = router;