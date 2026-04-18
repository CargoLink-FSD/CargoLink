import tripModel from "../models/trip.js";
import { parsePaginationParams } from "../utils/misc.js";

const populateTrip = (query) => {
  return query
    .populate({
      path: 'order_ids',
      populate: { path: 'customer_id', select: 'firstName lastName phone email' }
    })
    .populate('assigned_vehicle_id', 'name registration truck_type capacity status')
    .populate('assigned_driver_id', 'firstName lastName phone email status');
};

const createTrip = async (tripData) => {
  const trip = new tripModel(tripData);
  const saved = await trip.save();
  return populateTrip(tripModel.findById(saved._id));
};

const getTripsByTransporter = async (transporterId, queryParams = {}) => {
  const filter = { transporter_id: transporterId };
  if (queryParams.status && queryParams.status !== 'all') filter.status = queryParams.status;
  const pagination = parsePaginationParams(queryParams, { defaultLimit: 10, maxLimit: 100 });
  const baseQuery = tripModel.find(filter).sort({ createdAt: -1 });

  let query = pagination
    ? baseQuery.skip(pagination.skip).limit(pagination.limit)
    : baseQuery;

  let items = await populateTrip(query).lean();

  // Post-populate search filter (search by vehicle reg or stop city)
  if (queryParams.search) {
    const q = queryParams.search.toLowerCase();
    items = items.filter(t =>
      t._id?.toString().toLowerCase().includes(q) ||
      t.assigned_vehicle_id?.registration?.toLowerCase().includes(q) ||
      t.stops?.some(s => s.address?.city?.toLowerCase().includes(q))
    );
  }

  if (pagination) {
    const total = await tripModel.countDocuments(filter);
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit) || 1,
      },
    };
  }

  return items;
};

const getTripsByDriver = async (driverId, queryParams = {}) => {
  const filter = { assigned_driver_id: driverId };
  if (queryParams.status && queryParams.status !== 'all') filter.status = queryParams.status;
  const pagination = parsePaginationParams(queryParams, { defaultLimit: 10, maxLimit: 100 });
  const baseQuery = tripModel.find(filter).sort({ createdAt: -1 });

  let query = pagination
    ? baseQuery.skip(pagination.skip).limit(pagination.limit)
    : baseQuery;

  let items = await populateTrip(query).lean();

  if (queryParams.search) {
    const q = queryParams.search.toLowerCase();
    items = items.filter(t =>
      t._id?.toString().toLowerCase().includes(q) ||
      t.assigned_vehicle_id?.registration?.toLowerCase().includes(q) ||
      t.stops?.some(s => s.address?.city?.toLowerCase().includes(q))
    );
  }

  if (pagination) {
    const total = await tripModel.countDocuments(filter);
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit) || 1,
      },
    };
  }

  return items;
};

const getTripById = async (tripId) => {
  return await populateTrip(tripModel.findById(tripId));
};

const updateTrip = async (tripId, updateData) => {
  const updated = await tripModel.findByIdAndUpdate(tripId, updateData, { new: true, runValidators: true });
  return updated ? populateTrip(tripModel.findById(updated._id)) : null;
};

const deleteTrip = async (tripId) => {
  return await tripModel.findByIdAndDelete(tripId);
};

const addOrderToTrip = async (tripId, orderId) => {
  await tripModel.findByIdAndUpdate(tripId, { $addToSet: { order_ids: orderId } });
  return populateTrip(tripModel.findById(tripId));
};

const addMultipleOrdersToTrip = async (tripId, orderIds) => {
  await tripModel.findByIdAndUpdate(tripId, { $addToSet: { order_ids: { $each: orderIds } } });
  return populateTrip(tripModel.findById(tripId));
};

const removeOrderFromTrip = async (tripId, orderId) => {
  await tripModel.findByIdAndUpdate(tripId, { $pull: { order_ids: orderId } });
  return populateTrip(tripModel.findById(tripId));
};

const assignVehicleToTrip = async (tripId, vehicleId) => {
  await tripModel.findByIdAndUpdate(tripId, { assigned_vehicle_id: vehicleId });
  return populateTrip(tripModel.findById(tripId));
};

const unassignVehicleFromTrip = async (tripId) => {
  await tripModel.findByIdAndUpdate(tripId, { $unset: { assigned_vehicle_id: 1 } });
  return populateTrip(tripModel.findById(tripId));
};

const assignDriverToTrip = async (tripId, driverId) => {
  await tripModel.findByIdAndUpdate(tripId, { assigned_driver_id: driverId });
  return populateTrip(tripModel.findById(tripId));
};

const unassignDriverFromTrip = async (tripId) => {
  await tripModel.findByIdAndUpdate(tripId, { $unset: { assigned_driver_id: 1 } });
  return populateTrip(tripModel.findById(tripId));
};

const getTripByOrderId = async (orderId) => {
  return await tripModel.findOne({ order_ids: orderId });
};

const getOrderIdsWithActiveTrips = async (orderIds = []) => {
  if (!orderIds.length) return [];

  const trips = await tripModel.find({
    order_ids: { $in: orderIds },
    status: { $in: ['Scheduled', 'Active'] },
  }).select('order_ids').lean();

  return trips.flatMap((trip) => trip.order_ids || []);
};

const getActiveTripByVehicle = async (vehicleId) => {
  return await tripModel.findOne({
    assigned_vehicle_id: vehicleId,
    status: { $in: ['Scheduled', 'In Transit', 'Delayed'] }
  });
};

const getActiveTripByDriver = async (driverId) => {
  return await tripModel.findOne({
    assigned_driver_id: driverId,
    status: { $in: ['Scheduled', 'In Transit', 'Delayed'] }
  });
};

const updateTripLocation = async (tripId, coordinates) => {
  return await tripModel.findByIdAndUpdate(
    tripId,
    { 'current_location.coordinates': coordinates, 'current_location.updated_at': new Date() },
    { new: true }
  );
};

const updateTripStatus = async (tripId, status) => {
  await tripModel.findByIdAndUpdate(tripId, { status });
  return populateTrip(tripModel.findById(tripId));
};

const updateStopStatus = async (tripId, stopId, updates) => {
  const setObj = {};
  for (const [key, val] of Object.entries(updates)) {
    setObj[`stops.$.${key}`] = val;
  }
  return await tripModel.findOneAndUpdate(
    { _id: tripId, 'stops._id': stopId },
    { $set: setObj },
    { new: true }
  );
};

const addStopToTrip = async (tripId, stop, afterIndex) => {
  const trip = await tripModel.findById(tripId);
  if (!trip) return null;
  trip.stops.splice(afterIndex + 1, 0, stop);
  trip.stops.forEach((s, i) => { s.sequence = i + 1; });
  await trip.save();
  return populateTrip(tripModel.findById(tripId));
};

const getTripByOrderIdWithDetails = async (orderId) => {
  return await tripModel
    .findOne({ order_ids: orderId, status: { $in: ['Scheduled', 'Active', 'In Transit', 'Delayed', 'Completed'] } })
    .populate({ path: 'transporter_id', select: 'name primary_contact email' })
    .populate('assigned_vehicle_id', 'name registration truck_type')
    .populate('assigned_driver_id', 'firstName lastName phone');
};

const getCompletedTripsByDriver = async (driverId) => {
  return await tripModel.countDocuments({ assigned_driver_id: driverId, status: 'Completed' });
};

const getDriverDashboardStats = async (driverId, options = {}) => {
  const { now = new Date(), sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } = options;

  const statuses = ['Scheduled', 'Active', 'Completed', 'Cancelled'];
  const counts = await Promise.all(
    statuses.map(status => tripModel.countDocuments({ assigned_driver_id: driverId, status }))
  );

  const statusBreakdown = {
    Scheduled: counts[0],
    Active: counts[1],
    Completed: counts[2],
    Cancelled: counts[3]
  };

  const activeTripsCount = statusBreakdown.Scheduled + statusBreakdown.Active;

  const upcomingTrips = await tripModel.find({
    assigned_driver_id: driverId,
    status: 'Scheduled',
    planned_start_at: { $gte: now, $lte: sevenDaysFromNow }
  })
    .sort({ planned_start_at: 1 })
    .limit(5)
    .lean();

  return {
    statusBreakdown,
    activeTripsCount,
    completedTripsCount: statusBreakdown.Completed,
    upcomingTripsCount: upcomingTrips.length,
    upcomingTrips
  };
};

export default {
  createTrip,
  getTripsByTransporter,
  getTripsByDriver,
  getTripById,
  updateTrip,
  deleteTrip,
  addOrderToTrip,
  addMultipleOrdersToTrip,
  removeOrderFromTrip,
  assignVehicleToTrip,
  unassignVehicleFromTrip,
  assignDriverToTrip,
  unassignDriverFromTrip,
  getTripByOrderId,
  getOrderIdsWithActiveTrips,
  getActiveTripByVehicle,
  getActiveTripByDriver,
  updateTripLocation,
  updateTripStatus,
  updateStopStatus,
  addStopToTrip,
  getTripByOrderIdWithDetails,
  getCompletedTripsByDriver,
  getDriverDashboardStats,
};