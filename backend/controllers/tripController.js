import { AppError, logger } from "../utils/misc.js";
import tripServices from "../services/tripService.js";

// ─── Transporter Endpoints ─────────────────────────────────────────────────────

async function createTrip(req, res, next) {
  try {
    const trip = await tripServices.createTrip(req.user.id, req.body);
    res.status(201).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function getTrips(req, res, next) {
  try {
    const trips = await tripServices.getTrips(req.user.id, req.query);

    if (trips?.items) {
      return res.status(200).json({ success: true, data: trips.items, pagination: trips.pagination });
    }

    res.status(200).json({ success: true, data: trips });
  } catch (err) { next(err); }
}

async function getTripDetails(req, res, next) {
  try {
    const trip = await tripServices.getTripDetails(req.user.id, req.params.tripId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function updateTrip(req, res, next) {
  try {
    const trip = await tripServices.updateTrip(req.user.id, req.params.tripId, req.body);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function deleteTrip(req, res, next) {
  try {
    await tripServices.deleteTrip(req.user.id, req.params.tripId);
    res.status(200).json({ success: true, message: 'Trip deleted successfully' });
  } catch (err) { next(err); }
}

async function cancelTrip(req, res, next) {
  try {
    const { reasonCode, reasonText } = req.body || {};
    const result = await tripServices.cancelTrip(req.user.id, req.params.tripId, { reasonCode, reasonText });
    res.status(200).json({
      success: true,
      data: result,
      message: result?.policy?.penaltyPoints
        ? `Trip cancelled. Reliability penalty applied (${result.policy.penaltyPoints} points).`
        : 'Trip cancelled successfully',
    });
  } catch (err) { next(err); }
}

async function completeTrip(req, res, next) {
  try {
    const trip = await tripServices.completeTrip(req.user.id, req.params.tripId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function getAssignableOrders(req, res, next) {
  try {
    const orders = await tripServices.getAssignableOrders(req.user.id);
    res.status(200).json({ success: true, data: orders });
  } catch (err) { next(err); }
}

async function getAvailableDrivers(req, res, next) {
  try {
    const drivers = await tripServices.getAvailableDrivers(req.user.id);
    res.status(200).json({ success: true, data: drivers });
  } catch (err) { next(err); }
}

async function getAvailableVehicles(req, res, next) {
  try {
    const vehicles = await tripServices.getAvailableVehicles(req.user.id);
    res.status(200).json({ success: true, data: vehicles });
  } catch (err) { next(err); }
}

// ─── Driver Endpoints ──────────────────────────────────────────────────────────

async function getDriverTrips(req, res, next) {
  try {
    const trips = await tripServices.getDriverTrips(req.user.id, req.query);

    if (trips?.items) {
      return res.status(200).json({ success: true, data: trips.items, pagination: trips.pagination });
    }

    res.status(200).json({ success: true, data: trips });
  } catch (err) { next(err); }
}

async function getDriverTripDetails(req, res, next) {
  try {
    const trip = await tripServices.getDriverTripDetails(req.user.id, req.params.tripId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function startTrip(req, res, next) {
  try {
    const trip = await tripServices.startTrip(req.user.id, req.params.tripId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function arriveAtStop(req, res, next) {
  try {
    const trip = await tripServices.arriveAtStop(req.user.id, req.params.tripId, req.params.stopId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function confirmPickup(req, res, next) {
  try {
    const trip = await tripServices.confirmPickup(req.user.id, req.params.tripId, req.params.stopId, req.body.otp);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function confirmDelivery(req, res, next) {
  try {
    const trip = await tripServices.confirmDelivery(req.user.id, req.params.tripId, req.params.stopId, req.body.otp);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function departFromStop(req, res, next) {
  try {
    const trip = await tripServices.departFromStop(req.user.id, req.params.tripId, req.params.stopId);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function declareDelay(req, res, next) {
  try {
    const trip = await tripServices.declareDelay(req.user.id, req.params.tripId, req.body);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function clearDelay(req, res, next) {
  try {
    const trip = await tripServices.clearDelay(req.user.id, req.params.tripId, req.body.stopId || null);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

async function updateTripLocation(req, res, next) {
  try {
    const trip = await tripServices.updateTripLocation(req.user.id, req.params.tripId, req.body.coordinates);
    res.status(200).json({ success: true, data: trip });
  } catch (err) { next(err); }
}

// ─── Customer Endpoints ────────────────────────────────────────────────────────

async function getOrderTracking(req, res, next) {
  try {
    const tracking = await tripServices.getOrderTracking(req.user.id, req.params.orderId);
    res.status(200).json({ success: true, data: tracking });
  } catch (err) { next(err); }
}

export default {
  createTrip, getTrips, getTripDetails, updateTrip, deleteTrip,
  cancelTrip, completeTrip,
  getAssignableOrders, getAvailableDrivers, getAvailableVehicles,
  getDriverTrips, getDriverTripDetails, startTrip,
  arriveAtStop, confirmPickup, confirmDelivery, departFromStop,
  declareDelay, clearDelay, updateTripLocation,
  getOrderTracking,
};
