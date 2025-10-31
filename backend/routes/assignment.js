const express = require('express');
const router = express.Router();
const assignmentController = require('../controller/assignmentController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all assignment routes - transporter only
router.use(authMiddleware.isTransporter);

// POST - Assign vehicle to order
router.post('/assign', assignmentController.assignVehicleToOrder);

// GET - Get order assignment details
router.get('/order/:order_id', assignmentController.getOrderAssignment);

// GET - Get available vehicles from fleet
router.get('/vehicles/available', assignmentController.getAvailableVehicles);

// GET - Get vehicles by truck type
router.get('/vehicles/by-type', assignmentController.getVehiclesByType);

// DELETE - Unassign vehicle from order
router.delete('/unassign/:order_id', assignmentController.unassignVehicle);

module.exports = router;
