import Trip from "../models/trip.js";
import mongoose from "mongoose";


const createTrip = async (tripData) => {
  const trip = new Trip(tripData);
  return await trip.save();
};


const getTripById = async (tripId) => {
  if (!mongoose.Types.ObjectId.isValid(tripId)) {
    return null;
  }
  
  return await Trip.findById(tripId)
    .populate("transporter_id", "name email primary_contact")
    .populate({
      path: "stops.order_id",
      select: "pickup delivery goods_type weight truck_type customer_id status",
      populate: {
        path: "customer_id",
        select: "firstName lastName phone email",
      },
    });
};


const getTripsByTransporter = async (transporterId, filters = {}) => {
  const query = { transporter_id: transporterId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.vehicle_id) {
    query.vehicle_id = filters.vehicle_id;
  }

  return await Trip.find(query)
    .populate("vehicle_id")
    .populate({
      path: "stops.order_id",
      select: "pickup delivery goods_type final_price status",
    })
    .sort({ createdAt: -1 });
};

/**
 * Find active trip for a specific vehicle
 */
const getActiveTripByVehicle = async (vehicleId) => {
  return await Trip.findOne({
    vehicle_id: vehicleId,
    status: { $in: ["Scheduled", "InTransit"] },
  });
};

/**
 * Find trip containing a specific order
 */
const getTripByOrderId = async (orderId) => {
  return await Trip.findOne({
    "stops.order_id": orderId,
    status: { $ne: "Cancelled" },
  });
};


const updateTrip = async (tripId, updateData) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate({
    path: "stops.order_id",
    select: "pickup delivery goods_type customer_id",
  });
};


const assignVehicleToTrip = async (tripId, vehicleId) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    { $set: { vehicle_id: vehicleId } },
    { new: true, runValidators: true }
  );
};

const addStopsToTrip = async (tripId, stops) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    { $set: { stops: stops } },
    { new: true, runValidators: true }
  ).populate({
    path: "stops.order_id",
    select: "pickup delivery goods_type customer_id",
  });
};


const updateTripStop = async (tripId, seq, updateData) => {
  const update = {};
  
  if (updateData.status) {
    update["stops.$[stop].status"] = updateData.status;
  }
  
  if (updateData.arrived_at) {
    update["stops.$[stop].arrived_at"] = updateData.arrived_at;
  }
  
  if (updateData.done_at) {
    update["stops.$[stop].done_at"] = updateData.done_at;
  }
  
  if (updateData.otp) {
    update["stops.$[stop].otp"] = updateData.otp;
  }

  return await Trip.findByIdAndUpdate(
    tripId,
    { $set: update },
    {
      arrayFilters: [{ "stop.seq": seq }],
      new: true,
      runValidators: true,
    }
  ).populate({
    path: "stops.order_id",
    select: "pickup delivery goods_type customer_id",
  });
};

const startTrip = async (tripId) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    {
      $set: {
        status: "InTransit",
        started_at: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
};

const completeTrip = async (tripId) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    {
      $set: {
        status: "Completed",
        completed_at: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
};

const cancelTrip = async (tripId) => {
  return await Trip.findByIdAndUpdate(
    tripId,
    {
      $set: {
        status: "Cancelled",
        completed_at: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
};


const deleteTrip = async (tripId) => {
  return await Trip.findByIdAndDelete(tripId);
};


const countTripsByStatus = async (transporterId, status) => {
  return await Trip.countDocuments({
    transporter_id: transporterId,
    status: status,
  });
};


const getOrdersInTrip = async (tripId) => {
  const trip = await Trip.findById(tripId).select("stops");
  if (!trip) return [];
  
  return trip.stops.map((stop) => stop.order_id);
};

export default {
  createTrip,
  getTripById,
  getTripsByTransporter,
  getActiveTripByVehicle,
  getTripByOrderId,
  updateTrip,
  assignVehicleToTrip,
  addStopsToTrip,
  updateTripStop,
  startTrip,
  completeTrip,
  cancelTrip,
  deleteTrip,
  countTripsByStatus,
  getOrdersInTrip,
};