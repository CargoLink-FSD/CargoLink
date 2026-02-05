import transporterRepo from "../repositories/transporterRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import bidRepo from "../repositories/bidRepo.js";
import tripRepo from "../repositories/tripRepo.js";
import Order from "../models/order.js";
import Bid from "../models/bids.js";
import Trip from "../models/trip.js";
import mongoose from "mongoose";
import { AppError, logger } from "../utils/misc.js";
import { get } from "mongoose";

const registerTransporter = async (transporterData) => {
  
  const { vehicles, ...transporterInfo } = transporterData;

  const emailExists = await transporterRepo.checkEmailExists(transporterInfo.email);
  if (emailExists)
    throw new AppError(
      409,
      "DuplicateKey",
      "Email already in use",
      "ERR_DUP_EMAIL",
      [{ field: "email", message: "Already exisits" }]
    );
  
  transporterData = {...transporterInfo, fleet: vehicles}

  const transporter = await transporterRepo.createTransporter(transporterData);

  return transporter;
};

const getTransporterProfile = async (transporterId)  => {

  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }
  
  const orderCount = await orderRepo.countOrdersByTransporter(transporter._id);
  
  // fetch image
  const profileImage = '/img/Mr.H.jpg' 
  
  const fleetCount = transporter.fleet.length;

  return {transporter, orderCount, profileImage, fleetCount};
};

const updateTransporterProfile = async (transporterId, updates) => {

  const transporter = await transporterRepo.updateTransporter(transporterId, updates);

  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  return transporter;
};


const changePassword = async (transporterId, oldPassword, newPassword) => {

  logger.debug('Changing password for transporter', { transporterId, oldPassword, newPassword });
  
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  };

  const isMatch = await transporter.verifyPassword(oldPassword);
  if (!isMatch) {
    throw new AppError(401, 'AuthenticationError', 'Old password is incorrect', 'ERR_AUTH_INVALID');
  }
  logger.debug('Old password verified, updating to new password', {transporter});
  await transporter.updatePassword(newPassword);
};


const getTransporterFleet = async (transporterId)  => {

  const fleet = await transporterRepo.getFleet(transporterId);
  if (!fleet) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  }
  return {fleet};
};

const addFleet = async (transporterId, truckInfo) => {

  const truck = await transporterRepo.addTruck(transporterId, truckInfo);

  return truck;
};

const getTruckDetails = async (transporterId, truckId) => {

  const truck = await transporterRepo.getTruck(transporterId, truckId);
  logger.debug('Fetched truck details', {truck});
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  return truck;
};

const removeTruck = async (transporterId, truckId) => {

  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  const fleet = await transporterRepo.deleteTruck(transporterId, truckId);
  return fleet;
};

const updateTruck = async (transporterId, truckId, updates) => {
  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  const updatedTruck = transporterRepo.updateTruckInFleet(transporterId, truckId, updates);
  return updatedTruck;
}

const setTruckMaintenance = async (transporterId, truckId) => {
  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  if (truck.status === 'Assigned') {
    throw new AppError(400, 'ValidationError', 'Cannot set assigned truck to maintenance', 'ERR_TRUCK_ASSIGNED');
  }

  const updates = {
    status: 'In Maintenance',
    last_service_date: new Date(),
    next_service_date: null
  };

  const updatedTruck = await transporterRepo.updateTruckInFleet(transporterId, truckId, updates);
  return updatedTruck;
};

const setTruckAvailable = async (transporterId, truckId) => {
  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const updates = {
    status: 'Available'
  };

  const updatedTruck = await transporterRepo.updateTruckInFleet(transporterId, truckId, updates);
  return updatedTruck;
};

const setTruckUnavailable = async (transporterId, truckId) => {
  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const updates = {
    status: 'Unavailable'
  };

  const updatedTruck = await transporterRepo.updateTruckInFleet(transporterId, truckId, updates);
  return updatedTruck;
};

const scheduleMaintenance = async (transporterId, truckId, nextServiceDate) => {
  const truck = await transporterRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  if (truck.next_service_date) {
    throw new AppError(400, 'ValidationError', 'Maintenance already scheduled', 'ERR_MAINTENANCE_SCHEDULED');
  }

  const updates = {
    next_service_date: new Date(nextServiceDate)
  };

  const updatedTruck = await transporterRepo.updateTruckInFleet(transporterId, truckId, updates);
  return updatedTruck;
};

/**
 * Get comprehensive dashboard statistics for a transporter
 * @param {string} transporterId - The transporter's ID
 * @returns {Object} Dashboard statistics
 */
const getDashboardStats = async (transporterId) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  const transporterObjectId = typeof transporterId === 'string' 
    ? new mongoose.Types.ObjectId(transporterId) 
    : transporterId;

  // Define active statuses (including 'Started' defensively)
  const activeStatuses = ['Assigned', 'In Transit', 'Started'];
  
  // Get current date/time values
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  // ================== ORDERS STATS ==================
  // Aggregation for order stats by status
  const orderStatsAggregation = await Order.aggregate([
    { $match: { assigned_transporter_id: transporterObjectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform to breakdown object
  const statusBreakdown = {
    Placed: 0,
    Assigned: 0,
    'In Transit': 0,
    Started: 0,
    Completed: 0,
    Cancelled: 0
  };

  let totalAssignedOrders = 0;
  orderStatsAggregation.forEach(item => {
    if (statusBreakdown.hasOwnProperty(item._id)) {
      statusBreakdown[item._id] = item.count;
    }
    totalAssignedOrders += item.count;
  });

  // Active orders count
  const activeOrders = activeStatuses.reduce((sum, status) => {
    return sum + (statusBreakdown[status] || 0);
  }, 0);

  // Completed orders this month
  const completedThisMonthResult = await Order.countDocuments({
    assigned_transporter_id: transporterObjectId,
    status: 'Completed',
    updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Cancelled orders
  const cancelledOrders = statusBreakdown.Cancelled || 0;

  // Upcoming pickups (next 7 days, active statuses)
  const upcomingPickupsCount = await Order.countDocuments({
    assigned_transporter_id: transporterObjectId,
    status: { $in: activeStatuses },
    scheduled_at: { $gte: now, $lte: sevenDaysFromNow }
  });

  // Needs vehicle assignment (active orders without vehicle_id)
  const needsVehicleAssignmentCount = await Order.countDocuments({
    assigned_transporter_id: transporterObjectId,
    status: { $in: activeStatuses },
    $or: [
      { 'assignment.vehicle_id': { $exists: false } },
      { 'assignment.vehicle_id': null }
    ]
  });

  // ================== BIDS STATS ==================
  // Get transporter's active bids
  const bidsWithOrders = await Bid.aggregate([
    { $match: { transporter_id: transporterObjectId } },
    {
      $lookup: {
        from: 'orders',
        localField: 'order_id',
        foreignField: '_id',
        as: 'order'
      }
    },
    { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        totalBids: { $sum: 1 },
        activeBids: {
          $sum: {
            $cond: [{ $eq: ['$order.status', 'Placed'] }, 1, 0]
          }
        },
        totalBidAmount: { $sum: '$bid_amount' }
      }
    }
  ]);

  const bidsStats = bidsWithOrders[0] || { totalBids: 0, activeBids: 0, totalBidAmount: 0 };
  const activeBidsCount = bidsStats.activeBids || 0;
  const avgBidAmount = bidsStats.totalBids > 0 
    ? Math.round(bidsStats.totalBidAmount / bidsStats.totalBids) 
    : 0;

  // ================== FLEET STATS ==================
  const fleet = transporter.fleet || [];
  const totalVehicles = fleet.length;
  
  const fleetStatusBreakdown = {
    Available: 0,
    Assigned: 0,
    'In Maintenance': 0,
    Unavailable: 0
  };

  fleet.forEach(vehicle => {
    const status = vehicle.status || 'Available';
    if (fleetStatusBreakdown.hasOwnProperty(status)) {
      fleetStatusBreakdown[status]++;
    }
  });

  // ================== EARNINGS STATS ==================
  // Estimated earnings this month (completed orders this month)
  const earningsAggregation = await Order.aggregate([
    {
      $match: {
        assigned_transporter_id: transporterObjectId,
        status: 'Completed',
        updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        estimatedEarningsThisMonth: { $sum: { $ifNull: ['$final_price', 0] } }
      }
    }
  ]);

  const estimatedEarningsThisMonth = earningsAggregation[0]?.estimatedEarningsThisMonth || 0;

  // Pipeline value (active/in-transit orders with final_price)
  const pipelineAggregation = await Order.aggregate([
    {
      $match: {
        assigned_transporter_id: transporterObjectId,
        status: { $in: ['Assigned', 'In Transit', 'Started'] },
        final_price: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        pipelineValue: { $sum: '$final_price' }
      }
    }
  ]);

  const pipelineValue = pipelineAggregation[0]?.pipelineValue || 0;

  // ================== AVAILABLE JOBS STATS ==================
  // Count of orders currently open for bidding (same criteria as /api/orders/available)
  const availableJobsCount = await Order.countDocuments({
    status: 'Placed',
    scheduled_at: { $gte: twoDaysFromNow }
  });

  // ================== TRIPS STATS ==================
  const activeTripsStatuses = ['Scheduled', 'In Transit', 'Delayed'];
  
  const tripsAggregation = await Trip.aggregate([
    { $match: { transporter_id: transporterObjectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  let activeTripsCount = 0;
  let delayedTripsCount = 0;
  
  tripsAggregation.forEach(item => {
    if (activeTripsStatuses.includes(item._id)) {
      activeTripsCount += item.count;
    }
    if (item._id === 'Delayed') {
      delayedTripsCount = item.count;
    }
  });

  // Get next stop from nearest upcoming trip
  let nextStop = null;
  if (activeTripsCount > 0) {
    const activeTrip = await Trip.findOne({
      transporter_id: transporterObjectId,
      status: { $in: activeTripsStatuses }
    })
    .sort({ 'stops.scheduled_arrival_at': 1 })
    .select('stops current_stop_sequence')
    .lean();

    if (activeTrip && activeTrip.stops && activeTrip.stops.length > 0) {
      const currentSeq = activeTrip.current_stop_sequence || 0;
      const upcomingStop = activeTrip.stops.find(s => s.sequence > currentSeq && s.status !== 'Departed');
      if (upcomingStop) {
        nextStop = {
          type: upcomingStop.type,
          city: upcomingStop.address?.city,
          state: upcomingStop.address?.state,
          eta: upcomingStop.eta_at || upcomingStop.scheduled_arrival_at
        };
      }
    }
  }

  // ================== RETURN STATS ==================
  return {
    orders: {
      totalAssignedOrders,
      activeOrders,
      completedOrdersThisMonth: completedThisMonthResult,
      cancelledOrders,
      statusBreakdown,
      upcomingPickupsCount,
      needsVehicleAssignmentCount
    },
    bids: {
      activeBidsCount,
      avgBidAmount
    },
    fleet: {
      totalVehicles,
      fleetStatusBreakdown
    },
    earnings: {
      estimatedEarningsThisMonth,
      pipelineValue
    },
    jobs: {
      availableJobsCount
    },
    trips: {
      activeTripsCount,
      delayedTripsCount,
      nextStop
    }
  };
};


export default {
  registerTransporter,
  getTransporterProfile,
  updateTransporterProfile,
  changePassword,
  getTransporterFleet,
  getTruckDetails,
  addFleet,
  removeTruck,
  updateTruck,
  setTruckMaintenance,
  setTruckAvailable,
  setTruckUnavailable,
  scheduleMaintenance,
  getDashboardStats,
};
