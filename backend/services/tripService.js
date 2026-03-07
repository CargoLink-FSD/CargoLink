import { AppError, logger } from "../utils/misc.js";
import tripRepo from "../repositories/tripRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import truckRepo from "../repositories/truckRepo.js";
import driverRepo from "../repositories/driverRepo.js";
import { calculateRoute } from "../utils/osrm.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const LOADING_DELAY_MINUTES = 30; // fixed delay per pickup/dropoff for loading/unloading

// ─── Transporter: Create Trip ──────────────────────────────────────────────────

const createTrip = async (transporterId, tripData) => {
  const { order_ids, stops, planned_start_at, assigned_vehicle_id, assigned_driver_id } = tripData;

  // ── Validate orders ──
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

  // ── Validate vehicle ──
  let vehicleId = assigned_vehicle_id || null;
  if (vehicleId) {
    const truck = await truckRepo.getTruck(transporterId, vehicleId);
    if (!truck) throw new AppError(404, "NotFound", "Vehicle not found", "ERR_NOT_FOUND");
  }

  // ── Validate driver ──
  let driverId = assigned_driver_id || null;
  if (driverId) {
    const driver = await driverRepo.findDriverById(driverId);
    if (!driver || driver.transporter_id?.toString() !== transporterId) {
      throw new AppError(404, "NotFound", "Driver not found or not in your team", "ERR_NOT_FOUND");
    }
  }

  // ── Calculate route from OSRM using stop coordinates ──
  let processedStops = (stops || []).map((s, i) => ({
    ...s,
    sequence: s.sequence || i + 1,
    address: { ...(s.address || {}) },
  }));
  let totalDistanceKm = tripData.total_distance_km || 0;
  let totalDurationMinutes = tripData.total_duration_minutes || 0;
  let plannedEndAt = tripData.planned_end_at;

  const stopsWithCoords = processedStops.filter(
    s => s.address?.coordinates?.lat !== undefined && s.address?.coordinates?.lng !== undefined
  );

  if (stopsWithCoords.length >= 2) {
    try {
      const coords = processedStops
        .filter(s => s.address?.coordinates?.lat !== undefined && s.address?.coordinates?.lng !== undefined)
        .map(s => [s.address.coordinates.lng, s.address.coordinates.lat]);

      const routeData = await calculateRoute(coords);
      totalDistanceKm = routeData.distance_km;

      // Count loading stops for total delay
      const loadingStopCount = processedStops.filter(
        s => s.type === 'Pickup' || s.type === 'Dropoff'
      ).length;
      totalDurationMinutes = routeData.duration_minutes + loadingStopCount * LOADING_DELAY_MINUTES;

      // Calculate ETA for each stop
      if (planned_start_at) {
        const startTime = new Date(planned_start_at);
        let cumulativeMinutes = 0;
        let legIdx = 0;

        processedStops = processedStops.map((stop, idx) => {
          // Driving time from the previous stop
          if (idx > 0 && stop.address?.coordinates?.lat !== undefined && stop.address?.coordinates?.lng !== undefined) {
            if (routeData.legs[legIdx]) {
              cumulativeMinutes += routeData.legs[legIdx].duration_minutes;
              legIdx++;
            }
          }
          // Add loading/unloading delay for the previous stop
          if (idx > 0 && (processedStops[idx - 1].type === 'Pickup' || processedStops[idx - 1].type === 'Dropoff')) {
            cumulativeMinutes += LOADING_DELAY_MINUTES;
          }

          const eta = new Date(startTime.getTime() + cumulativeMinutes * 60 * 1000);
          return { ...stop, eta_at: eta, scheduled_arrival_at: eta };
        });

        // Calculate planned end: last stop ETA + loading delay if it's pickup/dropoff
        const lastStop = processedStops[processedStops.length - 1];
        if (lastStop?.eta_at) {
          const lastDelay = (lastStop.type === 'Pickup' || lastStop.type === 'Dropoff')
            ? LOADING_DELAY_MINUTES * 60 * 1000 : 0;
          plannedEndAt = new Date(new Date(lastStop.eta_at).getTime() + lastDelay);
        } else {
          plannedEndAt = new Date(startTime.getTime() + totalDurationMinutes * 60 * 1000);
        }
      }
    } catch (err) {
      logger.warn('OSRM route calculation failed, using frontend values', { error: err.message });
    }
  }

  // ── Check driver availability (schedule overlap) ──
  if (driverId && planned_start_at && plannedEndAt) {
    const driverBlocks = await driverRepo.getScheduleBlocks(
      driverId, new Date(planned_start_at).toISOString(), new Date(plannedEndAt).toISOString()
    );
    const hasOverlap = driverBlocks.some(b =>
      new Date(b.startTime) < new Date(plannedEndAt) && new Date(b.endTime) > new Date(planned_start_at)
    );
    if (hasOverlap) {
      throw new AppError(409, "ConflictError", "Driver has a schedule conflict during this time period", "ERR_SCHEDULE_OVERLAP");
    }
  }

  // ── Check vehicle availability (schedule overlap) ──
  if (vehicleId && planned_start_at && plannedEndAt) {
    const vehicleBlocks = await truckRepo.getFleetScheduleBlocks(
      transporterId, vehicleId, new Date(planned_start_at).toISOString(), new Date(plannedEndAt).toISOString()
    );
    const hasOverlap = vehicleBlocks.some(b =>
      new Date(b.startTime) < new Date(plannedEndAt) && new Date(b.endTime) > new Date(planned_start_at)
    );
    if (hasOverlap) {
      throw new AppError(409, "ConflictError", "Vehicle has a schedule conflict during this time period", "ERR_SCHEDULE_OVERLAP");
    }
  }

  // ── Create the trip ──
  const trip = await tripRepo.createTrip({
    transporter_id: transporterId,
    order_ids: order_ids || [],
    assigned_vehicle_id: vehicleId,
    assigned_driver_id: driverId,
    stops: processedStops,
    planned_start_at,
    planned_end_at: plannedEndAt,
    total_distance_km: totalDistanceKm,
    total_duration_minutes: totalDurationMinutes,
    status: 'Scheduled',
  });

  // ── Update all orders to "Scheduled" ──
  if (order_ids && order_ids.length > 0) {
    for (const orderId of order_ids) {
      await orderRepo.updateOrderStatus(orderId, 'Scheduled');
    }
  }

  // ── Add schedule blocks for driver & vehicle ──
  if (driverId && planned_start_at && plannedEndAt) {
    await driverRepo.addScheduleBlock(driverId, {
      title: 'Trip', type: 'trip',
      startTime: new Date(planned_start_at),
      endTime: new Date(plannedEndAt),
      order_id: order_ids?.[0],
      notes: `Trip ${trip._id}`,
    });
  }
  if (vehicleId && planned_start_at && plannedEndAt) {
    await truckRepo.addFleetScheduleBlock(transporterId, vehicleId, {
      title: 'Trip', type: 'trip',
      startTime: new Date(planned_start_at),
      endTime: new Date(plannedEndAt),
      order_id: order_ids?.[0],
      notes: `Trip ${trip._id}`,
    });
  }

  return trip;
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
  if (trip.status !== 'Scheduled') {
    throw new AppError(400, "InvalidOperation", "Can only update scheduled trips", "ERR_INVALID_OPERATION");
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
  if (trip.status !== 'Scheduled') {
    throw new AppError(400, "InvalidOperation", "Can only delete scheduled trips", "ERR_INVALID_OPERATION");
  }
  // Revert orders back to Assigned
  for (const orderId of trip.order_ids) {
    const order = await orderRepo.getOrderById(orderId);
    if (order && order.status === 'Scheduled') {
      await orderRepo.updateOrderStatus(orderId, 'Assigned');
    }
  }
  if (trip.assigned_vehicle_id) {
    await _removeVehicleTripBlock(transporterId, trip.assigned_vehicle_id._id || trip.assigned_vehicle_id, tripId);
  }
  if (trip.assigned_driver_id) {
    await _removeDriverTripBlock(trip.assigned_driver_id._id || trip.assigned_driver_id, tripId);
  }
  await tripRepo.deleteTrip(tripId);
};

const cancelTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (['Completed', 'Cancelled'].includes(trip.status)) {
    throw new AppError(400, "InvalidOperation", "Cannot cancel", "ERR_INVALID_OPERATION");
  }
  // Revert orders back to Assigned
  for (const orderId of trip.order_ids) {
    const order = await orderRepo.getOrderById(orderId);
    if (order && !['Completed', 'Cancelled'].includes(order.status)) {
      await orderRepo.updateOrderStatus(orderId, 'Assigned');
    }
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
  if (trip.status !== 'Active') {
    throw new AppError(400, "InvalidOperation", "Trip must be active", "ERR_INVALID_OPERATION");
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

  // Set the first stop's order to 'Started' (pickup is the current stop)
  const firstStop = stops[0];
  if (firstStop?.type === 'Pickup' && firstStop?.order_id) {
    const firstOrderId = firstStop.order_id?._id || firstStop.order_id;
    await orderRepo.updateOrderStatus(firstOrderId, 'Started');
  }

  return await tripRepo.updateTrip(tripId, {
    status: 'Active', actual_start_at: new Date(), current_stop_index: 0, stops,
  });
};

const confirmPickup = async (driverId, tripId, stopId, otp) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  const stop = trip.stops.id(stopId);
  if (!stop) throw new AppError(404, "NotFound", "Stop not found", "ERR_NOT_FOUND");
  if (stop.type !== 'Pickup') throw new AppError(400, "InvalidOperation", "Not a pickup stop", "ERR_INVALID_OPERATION");

  // Verify OTP against the order's pickup_otp
  const orderId = stop.order_id?._id || stop.order_id;
  if (!orderId) throw new AppError(400, "InvalidOperation", "No order linked to this stop", "ERR_INVALID_OPERATION");
  const order = await orderRepo.getOrderById(orderId);
  if (!order || order.pickup_otp !== otp) {
    throw new AppError(400, "InvalidOperation", "Invalid OTP", "ERR_INVALID_OTP");
  }

  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Completed', actual_departure_at: new Date() });
  // Pickup confirmed → order is now "In Transit"
  await orderRepo.updateOrderStatus(orderId, 'In Transit');
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

  // Verify OTP against the order's delivery_otp
  const orderId = stop.order_id?._id || stop.order_id;
  if (!orderId) throw new AppError(400, "InvalidOperation", "No order linked to this stop", "ERR_INVALID_OPERATION");
  const order = await orderRepo.getOrderById(orderId);
  if (!order || order.delivery_otp !== otp) {
    throw new AppError(400, "InvalidOperation", "Invalid OTP", "ERR_INVALID_OTP");
  }

  await tripRepo.updateStopStatus(tripId, stopId, { status: 'Completed', actual_departure_at: new Date() });
  await orderRepo.updateOrderStatus(orderId, 'Completed');
  return await _advanceToNextStop(tripId);
};

// ─── Driver: Delay management ──────────────────────────────────────────────────

const declareDelay = async (driverId, tripId, delayData) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Active') {
    throw new AppError(400, "InvalidOperation", "Trip must be active", "ERR_INVALID_OPERATION");
  }

  const { delay_minutes, reason, coordinates } = delayData;
  const now = new Date();
  const delayStop = {
    sequence: 0, type: 'Delay',
    address: {
      street: 'Delay Stop', city: '', state: '', pin: '',
      coordinates: coordinates || trip.current_location?.coordinates,
    },
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

  return await tripRepo.updateTrip(tripId, { stops, current_stop_index: currentIndex + 1 });
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
  return await _advanceToNextStop(tripId);
};

// ─── Driver: Location ──────────────────────────────────────────────────────────

const updateTripLocation = async (driverId, tripId, coordinates) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || (trip.assigned_driver_id?._id || trip.assigned_driver_id)?.toString() !== driverId) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  if (trip.status !== 'Active') {
    throw new AppError(400, "InvalidOperation", "Trip must be active", "ERR_INVALID_OPERATION");
  }
  if (!coordinates || typeof coordinates !== 'object' || coordinates.lat === undefined || coordinates.lng === undefined) {
    throw new AppError(400, "ValidationError", "Invalid coordinates payload", "ERR_VALIDATION");
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

  // If the next stop is a Pickup, set its order to 'Started' (pickup is the current stop)
  const nextStop = stops[nextIndex];
  if (nextStop?.type === 'Pickup' && nextStop?.order_id) {
    const nextOrderId = nextStop.order_id?._id || nextStop.order_id;
    const order = await orderRepo.getOrderById(nextOrderId);
    if (order && order.status === 'Scheduled') {
      await orderRepo.updateOrderStatus(nextOrderId, 'Started');
    }
  }

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
  cancelTrip, completeTrip,
  getDriverTrips, getDriverTripDetails, startTrip,
  confirmPickup, confirmDelivery,
  declareDelay, clearDelay, updateTripLocation,
  getOrderTracking,
  getAssignableOrders, getAvailableDrivers, getAvailableVehicles,
};
