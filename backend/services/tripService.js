import { AppError, logger } from "../utils/misc.js";
import tripRepo from "../repositories/tripRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import truckRepo from "../repositories/truckRepo.js";
import driverRepo from "../repositories/driverRepo.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Transporter: Create Trip ──────────────────────────────────────────────────

const createTrip = async (transporterId, tripData) => {
  const { order_ids, stops, planned_start_at, planned_end_at, total_distance_km } = tripData;

  if (order_ids && order_ids.length > 0) {
    for (const orderId of order_ids) {
      const order = await orderRepo.getOrderById(orderId);
      if (!order) throw new AppError(404, "NotFound", `Order ${orderId} not found`, "ERR_NOT_FOUND");
      if (order.assigned_transporter_id?.toString() !== transporterId) {
        throw new AppError(403, "Forbidden", `Order ${orderId} not assigned to you`, "ERR_FORBIDDEN");
      }
      if (order.status !== 'Assigned') {
        throw new AppError(400, "InvalidOperation", `Order ${orderId} must be Assigned`, "ERR_INVALID_OPERATION");
      }
      const existingTrip = await tripRepo.getTripByOrderId(orderId);
      if (existingTrip) {
        throw new AppError(400, "InvalidOperation", `Order ${orderId} already in a trip`, "ERR_INVALID_OPERATION");
      }
    }
  }

  return await tripRepo.createTrip({
    transporter_id: transporterId,
    order_ids: order_ids || [],
    stops: stops || [],
    planned_start_at,
    planned_end_at,
    total_distance_km,
    total_duration_minutes: tripData.total_duration_minutes,
    status: 'Planned',
  });
};

const getTrips = async (transporterId, queryParams) => {
  return await tripRepo.getTripsByTransporter(transporterId, queryParams);
};

const getTripDetails = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  return trip;
};

const updateTrip = async (transporterId, tripId, updateData) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['Planned', 'Scheduled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Can only update planned/scheduled trips", "ERR_INVALID_OPERATION");
  }
  const allowed = {};
  if (updateData.stops) allowed.stops = updateData.stops;
  if (updateData.planned_start_at) allowed.planned_start_at = updateData.planned_start_at;
  if (updateData.planned_end_at) allowed.planned_end_at = updateData.planned_end_at;
  if (updateData.total_distance_km !== undefined) allowed.total_distance_km = updateData.total_distance_km;
  if (updateData.total_duration_minutes !== undefined) allowed.total_duration_minutes = updateData.total_duration_minutes;
  return await tripRepo.updateTrip(tripId, allowed);
};

const deleteTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only delete planned trips", "ERR_INVALID_OPERATION");
  }
  if (trip.assigned_vehicle_id) {
    await _removeVehicleTripBlock(transporterId, trip.assigned_vehicle_id._id || trip.assigned_vehicle_id, tripId);
  }
  if (trip.assigned_driver_id) {
    await _removeDriverTripBlock(trip.assigned_driver_id._id || trip.assigned_driver_id, tripId);
  }
  await tripRepo.deleteTrip(tripId);
};

// ─── Transporter: Order management ─────────────────────────────────────────────

const assignOrder = async (transporterId, tripId, orderId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only add orders to planned trips", "ERR_INVALID_OPERATION");
  }
  const order = await orderRepo.getOrderById(orderId);
  if (!order || order.assigned_transporter_id?.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Order not found or not assigned to you", "ERR_NOT_FOUND");
  }
  if (order.status !== 'Assigned') {
    throw new AppError(400, "InvalidOperation", "Order must be Assigned", "ERR_INVALID_OPERATION");
  }
  const existingTrip = await tripRepo.getTripByOrderId(orderId);
  if (existingTrip && existingTrip._id.toString() !== tripId) {
    throw new AppError(400, "InvalidOperation", "Order already in another trip", "ERR_INVALID_OPERATION");
  }
  return await tripRepo.addOrderToTrip(tripId, orderId);
};

const removeOrderFromTrip = async (transporterId, tripId, orderId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only remove orders from planned trips", "ERR_INVALID_OPERATION");
  }
  return await tripRepo.removeOrderFromTrip(tripId, orderId);
};

// ─── Transporter: Assign Vehicle (creates schedule block) ──────────────────────

const assignVehicle = async (transporterId, tripId, vehicleId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['Planned', 'Scheduled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot assign vehicle now", "ERR_INVALID_OPERATION");
  }
  const truck = await truckRepo.getTruck(transporterId, vehicleId);
  if (!truck) throw new AppError(404, "NotFound", "Vehicle not found", "ERR_NOT_FOUND");

  const activeTripWithVehicle = await tripRepo.getActiveTripByVehicle(vehicleId);
  if (activeTripWithVehicle && activeTripWithVehicle._id.toString() !== tripId) {
    throw new AppError(400, "InvalidOperation", "Vehicle in another active trip", "ERR_INVALID_OPERATION");
  }

  if (trip.assigned_vehicle_id) {
    const prevId = trip.assigned_vehicle_id._id || trip.assigned_vehicle_id;
    await _removeVehicleTripBlock(transporterId, prevId, tripId);
  }

  if (trip.planned_start_at && trip.planned_end_at) {
    await truckRepo.addFleetScheduleBlock(transporterId, vehicleId, {
      title: 'Trip', type: 'trip',
      startTime: trip.planned_start_at, endTime: trip.planned_end_at,
      order_id: trip.order_ids[0], notes: `Trip ${tripId}`,
    });
  }
  return await tripRepo.assignVehicleToTrip(tripId, vehicleId);
};

const unassignVehicle = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['Planned', 'Scheduled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot unassign vehicle now", "ERR_INVALID_OPERATION");
  }
  if (trip.assigned_vehicle_id) {
    const vehicleId = trip.assigned_vehicle_id._id || trip.assigned_vehicle_id;
    await _removeVehicleTripBlock(transporterId, vehicleId, tripId);
  }
  return await tripRepo.unassignVehicleFromTrip(tripId);
};

// ─── Transporter: Assign Driver (creates schedule block) ───────────────────────

const assignDriver = async (transporterId, tripId, driverId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['Planned', 'Scheduled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot assign driver now", "ERR_INVALID_OPERATION");
  }
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver || driver.transporter_id?.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Driver not found or not in your team", "ERR_NOT_FOUND");
  }
  const activeTripWithDriver = await tripRepo.getActiveTripByDriver(driverId);
  if (activeTripWithDriver && activeTripWithDriver._id.toString() !== tripId) {
    throw new AppError(400, "InvalidOperation", "Driver in another active trip", "ERR_INVALID_OPERATION");
  }

  if (trip.assigned_driver_id) {
    const prevId = trip.assigned_driver_id._id || trip.assigned_driver_id;
    await _removeDriverTripBlock(prevId, tripId);
  }

  if (trip.planned_start_at && trip.planned_end_at) {
    await driverRepo.addScheduleBlock(driverId, {
      title: 'Trip', type: 'trip',
      startTime: trip.planned_start_at, endTime: trip.planned_end_at,
      order_id: trip.order_ids[0], notes: `Trip ${tripId}`,
    });
  }
  return await tripRepo.assignDriverToTrip(tripId, driverId);
};

const unassignDriver = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['Planned', 'Scheduled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot unassign driver now", "ERR_INVALID_OPERATION");
  }
  if (trip.assigned_driver_id) {
    const driverId = trip.assigned_driver_id._id || trip.assigned_driver_id;
    await _removeDriverTripBlock(driverId, tripId);
  }
  return await tripRepo.unassignDriverFromTrip(tripId);
};

// ─── Transporter: Schedule Trip ────────────────────────────────────────────────

const scheduleTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Trip must be Planned", "ERR_INVALID_OPERATION");
  }
  if (!trip.assigned_vehicle_id) throw new AppError(400, "InvalidOperation", "Assign a vehicle first", "ERR_INVALID_OPERATION");
  if (!trip.assigned_driver_id) throw new AppError(400, "InvalidOperation", "Assign a driver first", "ERR_INVALID_OPERATION");
  if (!trip.order_ids.length) throw new AppError(400, "InvalidOperation", "Add at least one order", "ERR_INVALID_OPERATION");
  if (!trip.stops.length) throw new AppError(400, "InvalidOperation", "Define stops first", "ERR_INVALID_OPERATION");

  const stops = trip.stops.map(s => {
    const stop = s.toObject ? s.toObject() : { ...s };
    if (stop.type === 'Pickup' || stop.type === 'Dropoff') stop.otp = generateOTP();
    stop.status = 'Pending';
    return stop;
  });

  return await tripRepo.updateTrip(tripId, { status: 'Scheduled', stops });
};

const cancelTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (['Completed', 'Cancelled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot cancel", "ERR_INVALID_OPERATION");
  }
  if (trip.assigned_vehicle_id) {
    await _removeVehicleTripBlock(transporterId, trip.assigned_vehicle_id._id || trip.assigned_vehicle_id, tripId);
  }
  if (trip.assigned_driver_id) {
    await _removeDriverTripBlock(trip.assigned_driver_id._id || trip.assigned_driver_id, tripId);
  }
  return await tripRepo.updateTrip(tripId, { status: 'Cancelled', actual_end_at: new Date() });
};

const completeTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['In Transit', 'Delayed'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit", "ERR_INVALID_OPERATION");
  }
  for (const orderId of trip.order_ids) {
    const order = await orderRepo.getOrderById(orderId);
    if (order && order.status !== 'Completed') {
      await orderRepo.updateOrderStatus(orderId, 'Completed');
    }
  }
  return await tripRepo.updateTrip(tripId, { status: 'Completed', actual_end_at: new Date() });
};

// ─── Transporter: Resources ────────────────────────────────────────────────────

const getAssignableOrders = async (transporterId) => {
  const orders = await orderRepo.getOrdersByTransporter(transporterId);
  const assignable = [];
  for (const order of orders) {
    if (order.status === 'Assigned') {
      const existingTrip = await tripRepo.getTripByOrderId(order._id);
      if (!existingTrip) assignable.push(order);
    }
  }
  return assignable;
};

const getAvailableDrivers = async (transporterId) => {
  const drivers = await driverRepo.findDriversByTransporter(transporterId);
  return drivers.filter(d => d.status !== 'Unavailable');
};

const getAvailableVehicles = async (transporterId) => {
  const fleet = await truckRepo.getFleet(transporterId);
  return fleet.filter(v => v.status === 'Available' || v.status === 'Assigned');
};

// ─── Driver: Trips ─────────────────────────────────────────────────────────────

const getDriverTrips = async (driverId, queryParams) => {
  return await tripRepo.getTripsByDriver(driverId, queryParams);
};

const getDriverTripDetails = async (driverId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  return trip;
};

const startTrip = async (driverId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Scheduled') {
    throw new AppError(400, "InvalidOperation", "Trip must be scheduled", "ERR_INVALID_OPERATION");
  }

  const stops = trip.stops.map((s, i) => {
    const stop = s.toObject ? s.toObject() : { ...s };
    if (i === 0) stop.status = 'En Route';
    return stop;
  });

  for (const stop of stops) {
    if (stop.type === 'Pickup' && stop.order_id) {
      await orderRepo.updateOrderStatus(stop.order_id, 'In Transit');
    }
  }

  return await tripRepo.updateTrip(tripId, {
    status: 'In Transit', actual_start_at: new Date(), current_stop_index: 0, stops,
  });
};

const arriveAtStop = async (driverId, tripId, stopId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['In Transit', 'Delayed'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit", "ERR_INVALID_OPERATION");
  }
  const stop = trip.stops.id(stopId);
  if (!stop) throw new AppError(404, "NotFound", "Stop not found", "ERR_NOT_FOUND");
  if (stop.status !== 'En Route') {
    throw new AppError(400, "InvalidOperation", "Stop must be en route", "ERR_INVALID_OPERATION");
  }
  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Arrived', actual_arrival_at: new Date() });
  return await tripRepo.getTripById(tripId);
};

const confirmPickup = async (driverId, tripId, stopId, otp) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  const stop = trip.stops.id(stopId);
  if (!stop) throw new AppError(404, "NotFound", "Stop not found", "ERR_NOT_FOUND");
  if (stop.type !== 'Pickup') throw new AppError(400, "InvalidOperation", "Not a pickup stop", "ERR_INVALID_OPERATION");
  if (stop.status !== 'Arrived') throw new AppError(400, "InvalidOperation", "Arrive first", "ERR_INVALID_OPERATION");
  if (stop.otp !== otp) throw new AppError(400, "InvalidOperation", "Invalid OTP", "ERR_INVALID_OTP");

  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Completed', actual_departure_at: new Date(), otp: null });
  if (stop.order_id) await orderRepo.updateOrderStatus(stop.order_id, 'In Transit');
  return await _advanceToNextStop(tripId);
};

const confirmDelivery = async (driverId, tripId, stopId, otp) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  const stop = trip.stops.id(stopId);
  if (!stop) throw new AppError(404, "NotFound", "Stop not found", "ERR_NOT_FOUND");
  if (stop.type !== 'Dropoff') throw new AppError(400, "InvalidOperation", "Not a delivery stop", "ERR_INVALID_OPERATION");
  if (stop.status !== 'Arrived') throw new AppError(400, "InvalidOperation", "Arrive first", "ERR_INVALID_OPERATION");
  if (stop.otp !== otp) throw new AppError(400, "InvalidOperation", "Invalid OTP", "ERR_INVALID_OTP");

  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Completed', actual_departure_at: new Date(), otp: null });
  if (stop.order_id) await orderRepo.updateOrderStatus(stop.order_id, 'Completed');
  return await _advanceToNextStop(tripId);
};

const departFromStop = async (driverId, tripId, stopId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  const stop = trip.stops.id(stopId);
  if (!stop) throw new AppError(404, "NotFound", "Stop not found", "ERR_NOT_FOUND");
  if (stop.status !== 'Arrived') throw new AppError(400, "InvalidOperation", "Must be arrived", "ERR_INVALID_OPERATION");
  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Completed', actual_departure_at: new Date() });
  return await _advanceToNextStop(tripId);
};

// ─── Driver: Delay management ──────────────────────────────────────────────────

const declareDelay = async (driverId, tripId, delayData) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['In Transit', 'Delayed'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit", "ERR_INVALID_OPERATION");
  }

  const { delay_minutes, reason, coordinates } = delayData;
  const now = new Date();
  const delayStop = {
    sequence: 0, type: 'Delay',
    address: { street: 'Delay Stop', city: '', state: '', pin: '', coordinates: coordinates || trip.current_location?.coordinates },
    eta_at: now, actual_arrival_at: now, status: 'Arrived',
    delay_minutes, delay_reason: reason || 'Delay reported by driver',
  };

  const currentIndex = trip.current_stop_index || 0;
  const updatedTrip = await tripRepo.addStopToTrip(tripId, delayStop, currentIndex);

  const delayMs = delay_minutes * 60 * 1000;
  const stops = updatedTrip.stops.map((s, i) => {
    const stop = s.toObject ? s.toObject() : { ...s };
    if (i > currentIndex + 1 && stop.eta_at) {
      stop.eta_at = new Date(new Date(stop.eta_at).getTime() + delayMs);
    }
    return stop;
  });

  return await tripRepo.updateTrip(tripId, { status: 'Delayed', stops, current_stop_index: currentIndex + 1 });
};

const clearDelay = async (driverId, tripId, stopId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  // If no specific stopId, find the first active delay stop
  let stop;
  if (stopId) {
    stop = trip.stops.id(stopId);
  } else {
    stop = trip.stops.find(s => s.type === 'Delay' && s.status === 'Arrived');
  }
  if (!stop || stop.type !== 'Delay') {
    throw new AppError(400, "InvalidOperation", "Not a delay stop", "ERR_INVALID_OPERATION");
  }
  await tripRepo.updateStopStatus(tripId, stop._id, { status: 'Completed', actual_departure_at: new Date() });

  const updatedTrip = await tripRepo.getTripById(tripId);
  const hasActiveDelay = updatedTrip.stops.some(s => s.type === 'Delay' && s.status === 'Arrived');
  if (!hasActiveDelay) await tripRepo.updateTrip(tripId, { status: 'In Transit' });
  return await _advanceToNextStop(tripId);
};

// ─── Driver: Location ──────────────────────────────────────────────────────────

const updateTripLocation = async (driverId, tripId, coordinates) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (!['In Transit', 'Delayed'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit", "ERR_INVALID_OPERATION");
  }
  return await tripRepo.updateTripLocation(tripId, coordinates);
};

// ─── Customer: Track Order ─────────────────────────────────────────────────────

const getOrderTracking = async (customerId, orderId) => {
  const order = await orderRepo.getOrderById(orderId);
  if (!order || order.customer_id.toString() !== customerId) {
    throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
  }

  const trip = await tripRepo.getTripByOrderIdWithDetails(orderId);
  if (!trip) return { order, trip: null, stops: [] };

  const relevantStops = trip.stops.filter(s =>
    s.order_id?.toString() === orderId || s.type === 'Waypoint' || s.type === 'Delay'
  );

  return {
    order,
    trip: {
      _id: trip._id, status: trip.status,
      assigned_vehicle: trip.assigned_vehicle_id,
      assigned_driver: trip.assigned_driver_id,
      current_location: trip.current_location,
      planned_start_at: trip.planned_start_at,
      planned_end_at: trip.planned_end_at,
      actual_start_at: trip.actual_start_at,
    },
    stops: relevantStops,
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const _advanceToNextStop = async (tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  const stops = trip.stops;
  const currentIndex = trip.current_stop_index || 0;

  let nextIndex = -1;
  for (let i = currentIndex; i < stops.length; i++) {
    if (!['Completed', 'Skipped'].includes(stops[i].status)) {
      nextIndex = i;
      break;
    }
  }

  if (nextIndex === -1) {
    for (const orderId of trip.order_ids) {
      const order = await orderRepo.getOrderById(orderId);
      if (order && order.status !== 'Completed') {
        await orderRepo.updateOrderStatus(orderId, 'Completed');
      }
    }
    return await tripRepo.updateTrip(tripId, {
      status: 'Completed', actual_end_at: new Date(), current_stop_index: stops.length,
    });
  }

  await tripRepo.updateStopStatus(tripId, stops[nextIndex]._id, { status: 'En Route' });
  return await tripRepo.updateTrip(tripId, { current_stop_index: nextIndex });
};

const _removeVehicleTripBlock = async (transporterId, vehicleId, tripId) => {
  try {
    const truck = await truckRepo.getTruck(transporterId, vehicleId);
    if (truck?.scheduleBlocks) {
      const block = truck.scheduleBlocks.find(b => b.notes === `Trip ${tripId}` && b.type === 'trip');
      if (block) await truckRepo.removeFleetScheduleBlock(transporterId, vehicleId, block._id);
    }
  } catch (e) { logger.warn('Failed to remove vehicle schedule block', { error: e.message }); }
};

const _removeDriverTripBlock = async (driverId, tripId) => {
  try {
    const driver = await driverRepo.findDriverById(driverId);
    if (driver?.scheduleBlocks) {
      const block = driver.scheduleBlocks.find(b => b.notes === `Trip ${tripId}` && b.type === 'trip');
      if (block) await driverRepo.removeScheduleBlock(driverId, block._id);
    }
  } catch (e) { logger.warn('Failed to remove driver schedule block', { error: e.message }); }
};

export default {
  createTrip, getTrips, getTripDetails, updateTrip, deleteTrip,
  assignOrder, removeOrderFromTrip,
  assignVehicle, unassignVehicle, assignDriver, unassignDriver,
  scheduleTrip, cancelTrip, completeTrip,
  getDriverTrips, getDriverTripDetails, startTrip,
  arriveAtStop, confirmPickup, confirmDelivery, departFromStop,
  declareDelay, clearDelay, updateTripLocation,
  getOrderTracking,
  getAssignableOrders, getAvailableDrivers, getAvailableVehicles,
};
