import tripModel from "../models/trip.js";
import mongoose from "mongoose";

// Create Trip
const createTrip = async (tripData) => {
  const trip = new tripModel(tripData);
  return await trip.save();
};

// Get Trips by Transporter
const getTripsByTransporter = async (transporterId, queryParams = {}) => {
  const filter = { transporter_id: transporterId };
  
  if (queryParams.status) {
    filter.status = queryParams.status;
  }
  
  const trips = await tripModel
    .find(filter)
    .populate('order_ids', 'pickup delivery goods_type status final_price')
    .populate('assigned_vehicle_id')
    .sort({ createdAt: -1 });
  
  return trips;
};

// Get Trip by ID
const getTripById = async (tripId) => {
  return await tripModel
    .findById(tripId)
    .populate({
      path: 'order_ids',
      populate: {
        path: 'customer_id',
        select: 'name phone email'
      }
    })
    .populate('assigned_vehicle_id');
};

// Update Trip
const updateTrip = async (tripId, updateData) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    updateData,
    { new: true, runValidators: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Delete Trip
const deleteTrip = async (tripId) => {
  return await tripModel.findByIdAndDelete(tripId);
};

// Add Order to Trip
const addOrderToTrip = async (tripId, orderId) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { $addToSet: { order_ids: orderId } },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Add Multiple Orders to Trip
const addMultipleOrdersToTrip = async (tripId, orderIds) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { $addToSet: { order_ids: { $each: orderIds } } },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Remove Order from Trip
const removeOrderFromTrip = async (tripId, orderId) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { $pull: { order_ids: orderId } },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Assign Truck to Trip
const assignTruckToTrip = async (tripId, truckId) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { assigned_vehicle_id: truckId },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Unassign Truck from Trip
const unassignTruckFromTrip = async (tripId) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { $unset: { assigned_vehicle_id: 1 } },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Get Trip by Order ID
const getTripByOrderId = async (orderId) => {
  return await tripModel.findOne({ order_ids: orderId });
};

// Get Active Trip by Truck
const getActiveTripByTruck = async (truckId) => {
  return await tripModel.findOne({
    assigned_vehicle_id: truckId,
    status: { $in: ['Scheduled', 'In Transit'] }
  });
};

// Update Trip Location
const updateTripLocation = async (tripId, coordinates) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { current_location_coordinates: coordinates },
    { new: true }
  );
};

// Update Trip Status
const updateTripStatus = async (tripId, status) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { status: status },
    { new: true }
  ).populate('order_ids').populate('assigned_vehicle_id');
};

// Get Trip by Order ID with Details
const getTripByOrderIdWithDetails = async (orderId) => {
  return await tripModel
    .findOne({ order_ids: orderId })
    .populate({
      path: 'transporter_id',
      select: 'company_name phone email'
    })
    .populate('assigned_vehicle_id');
};

export default {
  createTrip,
  getTripsByTransporter,
  getTripById,
  updateTrip,
  deleteTrip,
  addOrderToTrip,
  addMultipleOrdersToTrip,
  removeOrderFromTrip,
  assignTruckToTrip,
  unassignTruckFromTrip,
  getTripByOrderId,
  getActiveTripByTruck,
  updateTripLocation,
  updateTripStatus,
  getTripByOrderIdWithDetails,
};