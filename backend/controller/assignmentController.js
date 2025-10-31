const Order = require('../models/order');
const Transporter = require('../models/transporter');

// Assign vehicle to order
exports.assignVehicleToOrder = async (req, res) => {
    try {
        const { order_id, vehicle_id } = req.body;
        const transporter_id = req.session.user.id;

        // Find order and validate
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Find transporter and vehicle
        const transporter = await Transporter.findById(transporter_id);
        if (!transporter) {
            return res.status(404).json({ success: false, error: 'Transporter not found' });
        }

        const vehicle = transporter.fleet.id(vehicle_id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found in your fleet' });
        }

        // Check vehicle availability
        if (vehicle.status !== 'Available') {
            return res.status(400).json({ success: false, error: 'Vehicle is not available' });
        }

        // Create new assignment
        order.assignment = {
            vehicle_id: vehicle._id,
            vehicle_number: vehicle.registration,
            vehicle_type: vehicle.truck_type,
            assigned_at: new Date(),
        };

        // Update vehicle status
        vehicle.status = 'Assigned';
        vehicle.current_order_id = order_id;

        await transporter.save();
        await order.save();

        res.json({
            success: true,
            message: 'Vehicle assigned successfully',
            assignment: order.assignment
        });

    } catch (error) {
        console.error('Assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to assign vehicle' });
    }
};

// Get order assignment details
exports.getOrderAssignment = async (req, res) => {
    try {
        // Set headers to prevent caching and browser history issues
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const { order_id } = req.params;

        const order = await Order.findById(order_id)
            .populate('assigned_transporter_id', 'name primary_contact');

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({
            success: true,
            current_assignment: order.assignment,
        });

    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
    }
};

// Get available vehicles from transporter's fleet
exports.getAvailableVehicles = async (req, res) => {
    try {
        // Set headers to prevent caching and browser history issues
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const transporter_id = req.session.user.id;
        console.log('Getting available vehicles for transporter:', transporter_id);

        const transporter = await Transporter.findById(transporter_id);
        if (!transporter) {
            console.log('Transporter not found');
            return res.status(404).json({ success: false, error: 'Transporter not found' });
        }

        console.log('Transporter found:', transporter.name);
        console.log('Total vehicles in fleet:', transporter.fleet.length);

        // Log all vehicle statuses
        transporter.fleet.forEach((v, index) => {
            console.log(`Vehicle ${index + 1}: ${v.registration} - Status: "${v.status}"`);
        });

        // Filter available vehicles
        const availableVehicles = transporter.fleet.filter(
            vehicle => vehicle.status === 'Available'
        );

        console.log('Available vehicles count:', availableVehicles.length);

        res.json({
            success: true,
            vehicles: availableVehicles
        });

    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
    }
};

// Unassign vehicle from order
exports.unassignVehicle = async (req, res) => {
    try {
        const { order_id } = req.params;
        const transporter_id = req.session.user.id;

        const order = await Order.findById(order_id);
        if (!order || !order.assignment.vehicle_id) {
            return res.status(404).json({ success: false, error: 'No assignment found' });
        }

        // Find vehicle and update status
        const transporter = await Transporter.findById(transporter_id);
        const vehicle = transporter.fleet.id(order.assignment.vehicle_id);
        
        if (vehicle) {
            vehicle.status = 'Available';
            vehicle.current_order_id = null;
            await transporter.save();
        }

        // Clear assignment
        order.assignment = {};
        await order.save();

        res.json({
            success: true,
            message: 'Vehicle unassigned successfully'
        });

    } catch (error) {
        console.error('Error unassigning vehicle:', error);
        res.status(500).json({ success: false, error: 'Failed to unassign vehicle' });
    }
};

// Get vehicles by truck type (for order compatibility)
exports.getVehiclesByType = async (req, res) => {
    try {
        // Set headers to prevent caching and browser history issues
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const { truck_type } = req.query;
        const transporter_id = req.session.user.id;

        const transporter = await Transporter.findById(transporter_id);
        if (!transporter) {
            return res.status(404).json({ success: false, error: 'Transporter not found' });
        }

        const matchingVehicles = transporter.fleet.filter(
            vehicle => vehicle.truck_type === truck_type && vehicle.status === 'Available'
        );

        res.json({
            success: true,
            vehicles: matchingVehicles
        });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
    }
};
