import { AppError, logger } from "../utils/misc.js";
import tripService from "../services/tripService.js";


async function createTrip(req, res, next) {
  try {
    const transporterId = req.user.id;
    const trip = await tripService.createTrip(transporterId);
    
    res.status(201).json({
      success: true,
      data: trip,
      message: "Trip created successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function getTrips(req, res, next) {
  try {
    const transporterId = req.user.id;
    const trips = await tripService.getTrips(transporterId, req.query);
    
    res.status(200).json({
      success: true,
      data: trips,
      message: "Trips fetched successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function getTripDetails(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const trip = await tripService.getTripDetails(transporterId, tripId);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Trip details fetched successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function deleteTrip(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    await tripService.deleteTrip(transporterId, tripId);
    
    res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

// ==================== VEHICLE & ORDER MANAGEMENT ====================

/**
 * POST /api/trips/:id/vehicle
 * Assign a vehicle to a trip
 */
async function assignVehicle(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const { vehicleId } = req.body;
    
    if (!vehicleId) {
      throw new AppError(
        400,
        "ValidationError",
        "vehicleId is required",
        "ERR_VALIDATION"
      );
    }
    
    const trip = await tripService.assignVehicle(transporterId, tripId, vehicleId);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Vehicle assigned successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function addOrders(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError(
        400,
        "ValidationError",
        "orderIds must be a non-empty array",
        "ERR_VALIDATION"
      );
    }
    
    const trip = await tripService.addOrders(transporterId, tripId, orderIds);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Orders added successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function scheduleTrip(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError(
        400,
        "ValidationError",
        "orderIds must be a non-empty array",
        "ERR_VALIDATION"
      );
    }
    
    const trip = await tripService.scheduleTrip(transporterId, tripId, orderIds);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Trip scheduled successfully",
    });
  } catch (err) {
    next(err);
  }
}




async function startTrip(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const trip = await tripService.startTrip(transporterId, tripId);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Trip started successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function arriveAtStop(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const seq = req.params.seq;
    
    const trip = await tripService.arriveAtStop(transporterId, tripId, seq);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Arrival recorded successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function confirmPickup(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const seq = req.params.seq;
    const { otp } = req.body;
    
    if (!otp) {
      throw new AppError(
        400,
        "ValidationError",
        "OTP is required",
        "ERR_VALIDATION"
      );
    }
    
    const trip = await tripService.confirmPickup(transporterId, tripId, seq, otp);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Pickup confirmed successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function confirmDropoff(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const seq = req.params.seq;
    
    const trip = await tripService.confirmDropoff(transporterId, tripId, seq);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Dropoff confirmed successfully",
    });
  } catch (err) {
    next(err);
  }
}


async function completeTrip(req, res, next) {
  try {
    const transporterId = req.user.id;
    const tripId = req.params.id;
    const trip = await tripService.completeTrip(transporterId, tripId);
    
    res.status(200).json({
      success: true,
      data: trip,
      message: "Trip completed successfully",
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createTrip,
  getTrips,
  getTripDetails,
  deleteTrip,
  assignVehicle,
  addOrders,
  scheduleTrip,
  startTrip,
  arriveAtStop,
  confirmPickup,
  confirmDropoff,
  completeTrip,
};