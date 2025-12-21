import { AppError, logger } from "../utils/misc.js";
import tripRepo from "../repositories/tripRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import transporterRepo from "../repositories/transporterRepo.js";
import mongoose from "mongoose";

// Helper function to calculate ETA based on distance (0.5 hours per 50km average)
const calculateETA = (distanceKm, startTime) => {
  const averageSpeedKmph = 50;
  const travelTimeHours = distanceKm / averageSpeedKmph;
  const travelTimeMs = travelTimeHours * 60 * 60 * 1000;
  return new Date(startTime.getTime() + travelTimeMs);
};

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create Trip
const createTrip = async (transporterId, tripData) => {
  const trip = await tripRepo.createTrip({
    transporter_id: transporterId,
    ...tripData
  });
  return trip;
};

// Get Trips
const getTrips = async (transporterId, queryParams) => {
  const trips = await tripRepo.getTripsByTransporter(transporterId, queryParams);
  return trips;
};

// Get Trip Details
const getTripDetails = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  return trip;
};

// Update Trip
const updateTrip = async (transporterId, tripId, updateData) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only update planned trips", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.updateTrip(tripId, updateData);
  return updatedTrip;
};

// Delete Trip
const deleteTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only delete planned trips", "ERR_INVALID_OPERATION");
  }
  
  await tripRepo.deleteTrip(tripId);
};

// Assign Order to Trip
const assignOrder = async (transporterId, tripId, orderId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only assign orders to planned trips", "ERR_INVALID_OPERATION");
  }
  
  // Check if order exists and is assigned to this transporter
  const order = await orderRepo.getOrderById(orderId);
  if (!order || order.assigned_transporter_id?.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Order not found or not assigned to you", "ERR_NOT_FOUND");
  }
  
  if (order.status !== 'Assigned') {
    throw new AppError(400, "InvalidOperation", "Order must be in 'Assigned' status", "ERR_INVALID_OPERATION");
  }
  
  // Check if order is already in another trip
  const existingTrip = await tripRepo.getTripByOrderId(orderId);
  if (existingTrip && existingTrip._id.toString() !== tripId) {
    throw new AppError(400, "InvalidOperation", "Order is already assigned to another trip", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.addOrderToTrip(tripId, orderId);
  return updatedTrip;
};

// Remove Order from Trip
const removeOrderFromTrip = async (transporterId, tripId, orderId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only remove orders from planned trips", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.removeOrderFromTrip(tripId, orderId);
  return updatedTrip;
};

// Assign Truck to Trip
const assignTruck = async (transporterId, tripId, truckId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only assign trucks to planned trips", "ERR_INVALID_OPERATION");
  }
  
  // Check if truck belongs to transporter
  const transporter = await transporterRepo.getTransporterById(transporterId);
  const truck = transporter?.fleet?.find(t => t._id.toString() === truckId);
  if (!truck) {
    throw new AppError(404, "NotFound", "Truck not found in your fleet", "ERR_NOT_FOUND");
  }
  
  // Check if truck is available (not assigned to another active trip)
  const activeTripWithTruck = await tripRepo.getActiveTripByTruck(truckId);
  if (activeTripWithTruck && activeTripWithTruck._id.toString() !== tripId) {
    throw new AppError(400, "InvalidOperation", "Truck is already assigned to another active trip", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.assignTruckToTrip(tripId, truckId);
  return updatedTrip;
};

// Unassign Truck from Trip
const unassignTruck = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Can only unassign trucks from planned trips", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.unassignTruckFromTrip(tripId);
  return updatedTrip;
};

// Auto-assign Orders to Trip (placeholder for future algorithm)
const autoAssignOrders = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  // Get available orders for this transporter
  const availableOrders = await orderRepo.getAssignedOrdersForTransporter(transporterId);
  
  // Simple algorithm: assign orders that are not already in trips
  const orderIdsToAssign = [];
  for (const order of availableOrders) {
    const existingTrip = await tripRepo.getTripByOrderId(order._id);
    if (!existingTrip) {
      orderIdsToAssign.push(order._id);
    }
  }
  
  const updatedTrip = await tripRepo.addMultipleOrdersToTrip(tripId, orderIdsToAssign);
  return updatedTrip;
};

// Schedule Trip
const scheduleTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Planned') {
    throw new AppError(400, "InvalidOperation", "Trip must be in 'Planned' status", "ERR_INVALID_OPERATION");
  }
  
  if (!trip.assigned_vehicle_id) {
    throw new AppError(400, "InvalidOperation", "Trip must have a vehicle assigned", "ERR_INVALID_OPERATION");
  }
  
  if (trip.order_ids.length === 0) {
    throw new AppError(400, "InvalidOperation", "Trip must have at least one order", "ERR_INVALID_OPERATION");
  }
  
  // Create stops for pickup and delivery
  const stops = [];
  let sequence = 1;
  let totalDistance = 0;
  
  const orders = await orderRepo.getOrdersByIds(trip.order_ids);
  
  for (const order of orders) {
    // Add pickup stop
    stops.push({
      sequence: sequence++,
      type: 'Pickup',
      order_id: order._id,
      address: order.pickup,
      status: 'Pending'
    });
    
    // Add delivery stop
    stops.push({
      sequence: sequence++,
      type: 'Dropoff',
      order_id: order._id,
      address: order.delivery,
      status: 'Pending'
    });
    
    totalDistance += order.distance || 0;
  }
  
  // Calculate ETAs for each stop (assuming sequential execution)
  const startTime = trip.planned_start_at || new Date();
  let currentTime = startTime;
  
  for (const stop of stops) {
    stop.eta_at = new Date(currentTime);
    // Add 1 hour for pickup/delivery time + travel time to next stop
    currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
  }
  
  const estimatedEndTime = calculateETA(totalDistance, startTime);
  
  const updatedTrip = await tripRepo.updateTrip(tripId, {
    status: 'Scheduled',
    stops: stops,
    total_distance_km: totalDistance,
    planned_end_at: estimatedEndTime,
    total_duration_minutes: Math.ceil((estimatedEndTime - startTime) / (1000 * 60))
  });
  
  return updatedTrip;
};

// Start Trip
const startTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'Scheduled') {
    throw new AppError(400, "InvalidOperation", "Trip must be scheduled to start", "ERR_INVALID_OPERATION");
  }
  
  const now = new Date();
  
  // Generate OTP for the first order and update its status
  const firstOrderId = trip.order_ids[0];
  const otp = generateOTP();
  
  await orderRepo.updateOrderStatus(firstOrderId, 'In Transit', otp);
  
  const updatedTrip = await tripRepo.updateTrip(tripId, {
    status: 'In Transit',
    actual_start_at: now,
    current_stop_sequence: 1
  });
  
  return updatedTrip;
};

// Update Trip Location
const updateTripLocation = async (transporterId, tripId, locationData) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'In Transit') {
    throw new AppError(400, "InvalidOperation", "Can only update location for trips in transit", "ERR_INVALID_OPERATION");
  }
  
  const updatedTrip = await tripRepo.updateTripLocation(tripId, locationData.coordinates);
  return updatedTrip;
};

// Complete Current Order and Start Next
const completeCurrentOrder = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'In Transit') {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit", "ERR_INVALID_OPERATION");
  }
  
  // Get current order index
  const currentOrderIndex = trip.current_stop_sequence ? Math.floor((trip.current_stop_sequence - 1) / 2) : 0;
  const currentOrderId = trip.order_ids[currentOrderIndex];
  
  // Mark current order as completed
  await orderRepo.updateOrderStatus(currentOrderId, 'Completed');
  
  // Check if there are more orders
  const nextOrderIndex = currentOrderIndex + 1;
  if (nextOrderIndex < trip.order_ids.length) {
    // Start next order
    const nextOrderId = trip.order_ids[nextOrderIndex];
    const otp = generateOTP();
    
    await orderRepo.updateOrderStatus(nextOrderId, 'In Transit', otp);
    
    const updatedTrip = await tripRepo.updateTrip(tripId, {
      current_stop_sequence: (nextOrderIndex * 2) + 1
    });
    
    return updatedTrip;
  } else {
    // No more orders, complete trip
    return await completeTrip(transporterId, tripId);
  }
};

// Complete Trip
const completeTrip = async (transporterId, tripId) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  if (trip.status !== 'In Transit') {
    throw new AppError(400, "InvalidOperation", "Trip must be in transit to complete", "ERR_INVALID_OPERATION");
  }
  
  const now = new Date();
  
  // Mark all orders as completed if not already
  for (const orderId of trip.order_ids) {
    const order = await orderRepo.getOrderById(orderId);
    if (order.status !== 'Completed') {
      await orderRepo.updateOrderStatus(orderId, 'Completed');
    }
  }
  
  const updatedTrip = await tripRepo.updateTrip(tripId, {
    status: 'Completed',
    actual_end_at: now
  });
  
  return updatedTrip;
};

// Update Trip Status
const updateTripStatus = async (transporterId, tripId, status) => {
  const trip = await tripRepo.getTripById(tripId);
  if (!trip || trip.transporter_id.toString() !== transporterId) {
    throw new AppError(404, "NotFound", "Trip not found or access denied", "ERR_NOT_FOUND");
  }
  
  const updatedTrip = await tripRepo.updateTripStatus(tripId, status);
  return updatedTrip;
};

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
  completeCurrentOrder,
  completeTrip,
  updateTripStatus,
};