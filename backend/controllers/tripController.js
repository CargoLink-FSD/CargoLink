// import tripServices from '../services/tripServices.js';
import { get } from "mongoose";
import { AppError, logger } from "../utils/misc.js";
import tripServices from "../services/tripService.js";

// Create Trip
async function createTrip(req, res, next) {
    try {
        const trip = await tripServices.createTrip(req.transporter.id, req.body);
        res.status(201).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Get Trips
async function getTrips(req, res, next) {
    try {
        const trips = await tripServices.getTrips(req.transporter.id, req.query);
        res.status(200).json({ success: true, data: trips });
    } catch (err) {
        next(err);
    }
}

// Get Trip Details
async function getTripDetails(req, res, next) {
    try {
        const trip = await tripServices.getTripDetails(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Update Trip
async function updateTrip(req, res, next) {
    try {
        const trip = await tripServices.updateTrip(req.transporter.id, req.params.tripId, req.body);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Delete Trip
async function deleteTrip(req, res, next) {
    try {
        await tripServices.deleteTrip(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, message: 'Trip deleted successfully' });
    } catch (err) {
        next(err);
    }
}
// Assign Order to Trip
async function assignOrder(req, res, next) {
    try {
        const trip = await tripServices.assignOrder(req.transporter.id, req.params.tripId, req.body.orderId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Remove Order from Trip
async function removeOrderFromTrip(req, res, next) {
    try {
        const trip = await tripServices.removeOrderFromTrip(req.transporter.id, req.params.tripId, req.params.orderId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Assign Truck to Trip
async function assignTruck(req, res, next) {
    try {
        const trip = await tripServices.assignTruck(req.transporter.id, req.params.tripId, req.body.truckId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Unassign Truck from Trip
async function unassignTruck(req, res, next) {
    try {
        const trip = await tripServices.unassignTruck(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Auto-assign Orders to Trip
async function autoAssignOrders(req, res, next) {
    try {
        const trip = await tripServices.autoAssignOrders(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Schedule Trip
async function scheduleTrip(req, res, next) {
    try {
        const trip = await tripServices.scheduleTrip(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Start Trip
async function startTrip(req, res, next) {
    try {
        const trip = await tripServices.startTrip(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Update Trip Location
async function updateTripLocation(req, res, next) {
    try {
        const trip = await tripServices.updateTripLocation(req.transporter.id, req.params.tripId, req.body);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Complete Trip
async function completeTrip(req, res, next) {
    try {
        const trip = await tripServices.completeTrip(req.transporter.id, req.params.tripId);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}

// Update Trip Status
async function updateTripStatus(req, res, next) {
    try {
        const trip = await tripServices.updateTripStatus(req.transporter.id, req.params.tripId, req.body.status);
        res.status(200).json({ success: true, data: trip });
    } catch (err) {
        next(err);
    }
}




export default {
    createTrip,
    getTrips,
    getTripDetails,
    updateTrip,
    deleteTrip,
    assignOrder,
    removeOrderFromTrip,
    assignTruck,
    unassignTruck,
    autoAssignOrders,
    scheduleTrip,
    startTrip,
    updateTripLocation,
    completeTrip,
    updateTripStatus,
}