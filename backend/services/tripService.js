import { AppError, logger } from "../utils/misc.js";
import tripRepo from "../repositories/tripRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import transporterRepo from "../repositories/transporterRepo.js";
import mongoose from "mongoose";



const TRIP_STATUS = {
  PLANNED: "Planned",
  SCHEDULED: "Scheduled",
  IN_TRANSIT: "InTransit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ORDER_STATUS = {
  PLACED: "Placed",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  IN_TRANSIT: "InTransit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const VEHICLE_STATUS = {
  AVAILABLE: "Available",
  ON_TRIP: "OnTrip",
  MAINTENANCE: "Maintenance",
  UNAVAILABLE: "Unavailable",
};

const STOP_STATUS = {
  PENDING: "Pending",
  ARRIVED: "Arrived",
  DONE: "Done",
};

const STOP_TYPE = {
  PICKUP: "PICKUP",
  DROPOFF: "DROPOFF",
};


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const validateTripOwnership = async (tripId, transporterId) => {
  const trip = await tripRepo.getTripById(tripId);
  
  if (!trip) {
    throw new AppError(404, "NotFound", "Trip not found", "ERR_NOT_FOUND");
  }
  
  if (trip.transporter_id._id.toString() !== transporterId) {
    throw new AppError(403, "Forbidden", "Access denied to this trip", "ERR_FORBIDDEN");
  }
  
  return trip;
};


const validateVehicleOwnership = async (transporterId, vehicleId) => {
  const transporter = await transporterRepo.getTransporterById(transporterId);
  
  if (!transporter) {
    throw new AppError(404, "NotFound", "Transporter not found", "ERR_NOT_FOUND");
  }
  
  const vehicle = transporter.fleet.id(vehicleId);
  
  if (!vehicle) {
    throw new AppError(404, "NotFound", "Vehicle not found in your fleet", "ERR_NOT_FOUND");
  }
  
  return { transporter, vehicle };
};


const createTrip = async (transporterId) => {
  const trip = await tripRepo.createTrip({
    transporter_id: transporterId,
    status: TRIP_STATUS.PLANNED,
  });
  
  logger.info(`Trip created: ${trip._id} by transporter ${transporterId}`);
  return trip;
};


const getTrips = async (transporterId, queryParams) => {
  const trips = await tripRepo.getTripsByTransporter(transporterId, queryParams);
  return trips;
};


const getTripDetails = async (transporterId, tripId) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  return trip;
};


const deleteTrip = async (transporterId, tripId) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.PLANNED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Only Planned trips can be deleted",
      "ERR_INVALID_STATUS"
    );
  }
  
  await tripRepo.deleteTrip(tripId);
  logger.info(`Trip deleted: ${tripId}`);
};


const assignVehicle = async (transporterId, tripId, vehicleId) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.PLANNED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Can only assign vehicles to Planned trips",
      "ERR_INVALID_STATUS"
    );
  }
  
  // Validate vehicle ownership and availability
  const { transporter, vehicle } = await validateVehicleOwnership(
    transporterId,
    vehicleId
  );
  
  if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
    throw new AppError(
      400,
      "InvalidOperation",
      `Vehicle is not available (current status: ${vehicle.status})`,
      "ERR_VEHICLE_UNAVAILABLE"
    );
  }
  
  // Check if vehicle is already assigned to an active trip
  const activeTrip = await tripRepo.getActiveTripByVehicle(vehicleId);
  if (activeTrip && activeTrip._id.toString() !== tripId) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Vehicle is already assigned to an active trip",
      "ERR_VEHICLE_IN_USE"
    );
  }
  
  // Assign vehicle to trip
  const updatedTrip = await tripRepo.assignVehicleToTrip(tripId, vehicleId);
  
  logger.info(`Vehicle ${vehicleId} assigned to trip ${tripId}`);
  return updatedTrip;
};


const addOrders = async (transporterId, tripId, orderIds) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.PLANNED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Can only add orders to Planned trips",
      "ERR_INVALID_STATUS"
    );
  }
  
  // Validate all orders
  const orders = await orderRepo.getOrdersByIds(orderIds);
  
  if (orders.length !== orderIds.length) {
    throw new AppError(404, "NotFound", "One or more orders not found", "ERR_NOT_FOUND");
  }
  
  for (const order of orders) {
    // Check ownership
    if (order.assigned_transporter_id?.toString() !== transporterId) {
      throw new AppError(
        403,
        "Forbidden",
        `Order ${order._id} is not assigned to you`,
        "ERR_FORBIDDEN"
      );
    }
    
    // Check status
    if (order.status !== ORDER_STATUS.ASSIGNED) {
      throw new AppError(
        400,
        "InvalidOperation",
        `Order ${order._id} must be in Assigned status (current: ${order.status})`,
        "ERR_INVALID_ORDER_STATUS"
      );
    }
    
    // Check if already in another trip
    const existingTrip = await tripRepo.getTripByOrderId(order._id);
    if (existingTrip && existingTrip._id.toString() !== tripId) {
      throw new AppError(
        400,
        "InvalidOperation",
        `Order ${order._id} is already in another trip`,
        "ERR_ORDER_IN_TRIP"
      );
    }
  }
  
  
  
  logger.info(`Orders prepared for trip ${tripId}: ${orderIds.join(", ")}`);
  return trip;
};


const scheduleTrip = async (transporterId, tripId, orderIds) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.PLANNED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be in Planned status",
      "ERR_INVALID_STATUS"
    );
  }
  
  if (!trip.vehicle_id) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must have a vehicle assigned",
      "ERR_NO_VEHICLE"
    );
  }
  
  if (!orderIds || orderIds.length === 0) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must have at least one order",
      "ERR_NO_ORDERS"
    );
  }
  
  // Validate all orders
  const orders = await orderRepo.getOrdersByIds(orderIds);
  
  if (orders.length !== orderIds.length) {
    throw new AppError(404, "NotFound", "One or more orders not found", "ERR_NOT_FOUND");
  }
  
  for (const order of orders) {
    if (order.assigned_transporter_id?.toString() !== transporterId) {
      throw new AppError(
        403,
        "Forbidden",
        `Order ${order._id} is not assigned to you`,
        "ERR_FORBIDDEN"
      );
    }
    
    if (order.status !== ORDER_STATUS.ASSIGNED) {
      throw new AppError(
        400,
        "InvalidOperation",
        `Order ${order._id} must be in Assigned status`,
        "ERR_INVALID_ORDER_STATUS"
      );
    }
  }
  
  // Generate stops: PICKUP then DROPOFF for each order
  const stops = [];
  let seq = 1;
  
  for (const order of orders) {
    // Generate OTP for pickup stop
    const otp = generateOTP();
    
    stops.push({
      order_id: order._id,
      type: STOP_TYPE.PICKUP,
      seq: seq++,
      status: STOP_STATUS.PENDING,
      otp: otp,
    });
    
    stops.push({
      order_id: order._id,
      type: STOP_TYPE.DROPOFF,
      seq: seq++,
      status: STOP_STATUS.PENDING,
      otp: null,
    });
  }
  
  // Update trip with stops and set to Scheduled
  const updatedTrip = await tripRepo.addStopsToTrip(tripId, stops);
  await tripRepo.updateTrip(tripId, { status: TRIP_STATUS.SCHEDULED });
  
  // Update all orders to Scheduled status and link to trip
  for (const order of orders) {
    await orderRepo.assignTripToOrder(order._id, tripId);
  }
  
  // Update vehicle status to OnTrip
  const { transporter } = await validateVehicleOwnership(transporterId, trip.vehicle_id);
  const vehicle = transporter.fleet.id(trip.vehicle_id);
  vehicle.status = VEHICLE_STATUS.ON_TRIP;
  vehicle.current_trip_id = tripId;
  await transporter.save();
  
  logger.info(`Trip ${tripId} scheduled with ${stops.length} stops`);
  return await tripRepo.getTripById(tripId);
};

const startTrip = async (transporterId, tripId) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.SCHEDULED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be Scheduled to start",
      "ERR_INVALID_STATUS"
    );
  }
  
  if (trip.stops.length === 0) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip has no stops",
      "ERR_NO_STOPS"
    );
  }
  
  // Start trip
  const updatedTrip = await tripRepo.startTrip(tripId);
  
  // Update first order to InTransit
  const firstStop = trip.stops.find(s => s.type === STOP_TYPE.PICKUP);
  if (firstStop) {
    await orderRepo.updateOrderStatus(firstStop.order_id, ORDER_STATUS.IN_TRANSIT);
  }
  
  logger.info(`Trip ${tripId} started`);
  return updatedTrip;
};

/**
 * Mark arrival at a stop
 */
const arriveAtStop = async (transporterId, tripId, seq) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.IN_TRANSIT) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be InTransit",
      "ERR_INVALID_STATUS"
    );
  }
  
  const stop = trip.stops.find(s => s.seq === parseInt(seq));
  if (!stop) {
    throw new AppError(404, "NotFound", "Stop not found", "ERR_STOP_NOT_FOUND");
  }
  
  if (stop.status !== STOP_STATUS.PENDING) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Stop is not pending",
      "ERR_INVALID_STOP_STATUS"
    );
  }
  
  // Update stop to Arrived
  const updatedTrip = await tripRepo.updateTripStop(tripId, seq, {
    status: STOP_STATUS.ARRIVED,
    arrived_at: new Date(),
  });
  
  logger.info(`Arrived at stop ${seq} of trip ${tripId}`);
  return updatedTrip;
};

/**
 * Confirm pickup with OTP validation
 */
const confirmPickup = async (transporterId, tripId, seq, otp) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.IN_TRANSIT) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be InTransit",
      "ERR_INVALID_STATUS"
    );
  }
  
  const stop = trip.stops.find(s => s.seq === parseInt(seq));
  if (!stop) {
    throw new AppError(404, "NotFound", "Stop not found", "ERR_STOP_NOT_FOUND");
  }
  
  if (stop.type !== STOP_TYPE.PICKUP) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Stop is not a pickup stop",
      "ERR_INVALID_STOP_TYPE"
    );
  }
  
  if (stop.status !== STOP_STATUS.ARRIVED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Must arrive at stop before confirming pickup",
      "ERR_STOP_NOT_ARRIVED"
    );
  }
  
  // Validate OTP
  if (stop.otp !== otp) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Invalid OTP",
      "ERR_INVALID_OTP"
    );
  }
  
  // Update stop to Done
  const updatedTrip = await tripRepo.updateTripStop(tripId, seq, {
    status: STOP_STATUS.DONE,
    done_at: new Date(),
  });
  
  logger.info(`Pickup confirmed at stop ${seq} of trip ${tripId}`);
  return updatedTrip;
};

/**
 * Confirm dropoff (no OTP required)
 */
const confirmDropoff = async (transporterId, tripId, seq) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.IN_TRANSIT) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be InTransit",
      "ERR_INVALID_STATUS"
    );
  }
  
  const stop = trip.stops.find(s => s.seq === parseInt(seq));
  if (!stop) {
    throw new AppError(404, "NotFound", "Stop not found", "ERR_STOP_NOT_FOUND");
  }
  
  if (stop.type !== STOP_TYPE.DROPOFF) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Stop is not a dropoff stop",
      "ERR_INVALID_STOP_TYPE"
    );
  }
  
  if (stop.status !== STOP_STATUS.ARRIVED) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Must arrive at stop before confirming dropoff",
      "ERR_STOP_NOT_ARRIVED"
    );
  }
  
  // Verify corresponding pickup was completed
  const pickupStop = trip.stops.find(
    s => s.order_id.toString() === stop.order_id.toString() && s.type === STOP_TYPE.PICKUP
  );
  
  if (!pickupStop || pickupStop.status !== STOP_STATUS.DONE) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Pickup must be completed before dropoff",
      "ERR_PICKUP_NOT_DONE"
    );
  }
  
  // Update stop to Done
  const updatedTrip = await tripRepo.updateTripStop(tripId, seq, {
    status: STOP_STATUS.DONE,
    done_at: new Date(),
  });
  
  // Update order to Completed
  await orderRepo.updateOrderStatus(stop.order_id, ORDER_STATUS.COMPLETED);
  
  logger.info(`Dropoff confirmed at stop ${seq} of trip ${tripId}`);
  return updatedTrip;
};


const completeTrip = async (transporterId, tripId) => {
  const trip = await validateTripOwnership(tripId, transporterId);
  
  if (trip.status !== TRIP_STATUS.IN_TRANSIT) {
    throw new AppError(
      400,
      "InvalidOperation",
      "Trip must be InTransit to complete",
      "ERR_INVALID_STATUS"
    );
  }
  
  // Verify all stops are completed
  const incompleteStops = trip.stops.filter(s => s.status !== STOP_STATUS.DONE);
  if (incompleteStops.length > 0) {
    throw new AppError(
      400,
      "InvalidOperation",
      `${incompleteStops.length} stop(s) not yet completed`,
      "ERR_STOPS_INCOMPLETE"
    );
  }
  
  // Complete trip
  const updatedTrip = await tripRepo.completeTrip(tripId);
  
  // Free vehicle
  const { transporter } = await validateVehicleOwnership(transporterId, trip.vehicle_id);
  const vehicle = transporter.fleet.id(trip.vehicle_id);
  vehicle.status = VEHICLE_STATUS.AVAILABLE;
  vehicle.current_trip_id = null;
  await transporter.save();
  
  logger.info(`Trip ${tripId} completed`);
  return updatedTrip;
};


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