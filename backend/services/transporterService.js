import transporterRepo from "../repositories/transporterRepo.js";
import truckRepo from "../repositories/truckRepo.js";
import driverRepo from "../repositories/driverRepo.js";
import Review from "../models/review.js";
import orderRepo from "../repositories/orderRepo.js";
import Order from "../models/order.js";
import Bid from "../models/bids.js";
import Trip from "../models/trip.js";
import Fleet from "../models/fleet.js";
import mongoose from "mongoose";
import { AppError, logger } from "../utils/misc.js";
import { DOMAIN_EVENTS, emitDomainEvent } from '../utils/eventEmitter.js';

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

  const transporter = await transporterRepo.createTransporter(transporterInfo);

  // Create fleet documents in the separate Fleet collection
  if (vehicles && vehicles.length > 0) {
    await truckRepo.addTrucks(transporter._id, vehicles);
  }

  return transporter;
};

const getTransporterProfile = async (transporterId) => {

  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  const orderCount = await orderRepo.countOrdersByTransporter(transporter._id);

  // Use profile picture from database if available
  const profileImage = transporter.profilePicture || null;
  
  const fleetCount = await truckRepo.getFleetCount(transporterId);

  return { transporter, orderCount, profileImage, fleetCount };
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
  logger.debug('Old password verified, updating to new password', { transporter });
  await transporter.updatePassword(newPassword);
};


const getTransporterFleet = async (transporterId) => {

  const fleet = await truckRepo.getFleet(transporterId);
  return {fleet};
};

const addFleet = async (transporterId, truckInfo) => {

  const truck = await truckRepo.addTruck(transporterId, truckInfo);

  return truck;
};

const getTruckDetails = async (transporterId, truckId) => {

  const truck = await truckRepo.getTruck(transporterId, truckId);
  logger.debug('Fetched truck details', {truck});
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  return truck;
};

const removeTruck = async (transporterId, truckId) => {

  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  const fleet = await truckRepo.deleteTruck(transporterId, truckId);

  // After deleting the vehicle and its RC, recalculate verification status
  const transporter = await transporterRepo.findTransporterById(transporterId);
  const docs = transporter.documents;
  if (docs) {
    const allApproved = checkAllDocumentsApproved(docs);
    if (allApproved) {
      await transporterRepo.updateVerificationStatus(transporterId, 'approved', true);
    }
  }

  return fleet;
};

const updateTruck = async (transporterId, truckId, updates) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck){
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }
  const updatedTruck = await truckRepo.updateTruck(transporterId, truckId, updates);
  return updatedTruck;
}

const setTruckMaintenance = async (transporterId, truckId) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
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

  const updatedTruck = await truckRepo.updateTruck(transporterId, truckId, updates);
  return updatedTruck;
};

const setTruckAvailable = async (transporterId, truckId) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const updates = {
    status: 'Available'
  };

  const updatedTruck = await truckRepo.updateTruck(transporterId, truckId, updates);
  return updatedTruck;
};

const setTruckUnavailable = async (transporterId, truckId) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const updates = {
    status: 'Unavailable'
  };

  const updatedTruck = await truckRepo.updateTruck(transporterId, truckId, updates);
  return updatedTruck;
};

const scheduleMaintenance = async (transporterId, truckId, nextServiceDate) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  if (truck.next_service_date) {
    throw new AppError(400, 'ValidationError', 'Maintenance already scheduled', 'ERR_MAINTENANCE_SCHEDULED');
  }

  const updates = {
    next_service_date: new Date(nextServiceDate)
  };

  const updatedTruck = await truckRepo.updateTruck(transporterId, truckId, updates);
  return updatedTruck;
};

// ─── Fleet Schedule ─────────────────────────────────────────────────────────────

const getFleetSchedule = async (transporterId, truckId, startDate, endDate) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const start = startDate || new Date().toISOString();
  const end = endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const blocks = await truckRepo.getFleetScheduleBlocks(transporterId, truckId, start, end);
  return { blocks, startDate: start, endDate: end, truckName: truck.name };
};

const addFleetScheduleBlock = async (transporterId, truckId, blockData) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const { startTime, endTime, title, notes, type } = blockData;
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    throw new AppError(400, 'ValidationError', 'End time must be after start time', 'ERR_VALIDATION');
  }

  // Check for overlaps with existing blocks
  const existingBlocks = truck.scheduleBlocks || [];
  const hasOverlap = existingBlocks.some((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return start < bEnd && end > bStart;
  });

  if (hasOverlap) {
    throw new AppError(409, 'ConflictError', 'Schedule block overlaps with an existing block', 'ERR_SCHEDULE_OVERLAP');
  }

  const blockType = type || 'unavailable';
  if (!['maintenance', 'unavailable', 'trip'].includes(blockType)) {
    throw new AppError(400, 'ValidationError', 'Invalid block type', 'ERR_VALIDATION');
  }

  const block = {
    title: title || blockType.charAt(0).toUpperCase() + blockType.slice(1),
    type: blockType,
    startTime: start,
    endTime: end,
    notes: notes || '',
  };

  // Update truck status based on block type if it covers current time
  const now = new Date();
  if (start <= now && end >= now) {
    let statusUpdate = null;
    if (blockType === 'maintenance') statusUpdate = 'In Maintenance';
    else if (blockType === 'unavailable') statusUpdate = 'Unavailable';
    else if (blockType === 'trip') statusUpdate = 'Assigned';

    if (statusUpdate) {
      await truckRepo.updateTruck(transporterId, truckId, { status: statusUpdate });
    }
  }

  const newBlock = await truckRepo.addFleetScheduleBlock(transporterId, truckId, block);
  return newBlock;
};

const removeFleetScheduleBlock = async (transporterId, truckId, blockId) => {
  const truck = await truckRepo.getTruck(transporterId, truckId);
  if (!truck) {
    throw new AppError(404, 'NotFoundError', 'Truck not found', 'ERR_NOT_FOUND');
  }

  const block = (truck.scheduleBlocks || []).find((b) => b._id.toString() === blockId);
  if (!block) {
    throw new AppError(404, 'NotFoundError', 'Schedule block not found', 'ERR_NOT_FOUND');
  }

  await truckRepo.removeFleetScheduleBlock(transporterId, truckId, blockId);

  // If the removed block was covering current time, reset status to Available
  const now = new Date();
  if (new Date(block.startTime) <= now && new Date(block.endTime) >= now) {
    await truckRepo.updateTruck(transporterId, truckId, { status: 'Available' });
  }
};

const getTransporterRatings = async (transporterId) => {
  const reviews = await Review.find({ transporter_id: transporterId })
    .populate('customer_id', 'firstName lastName')
    .populate('order_id', 'pickup.city delivery.city')
    .sort({ createdAt: -1 })
    .lean();

  const totalReviews = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  const averageRating = totalReviews > 0 ? (sum / totalReviews).toFixed(1) : 0;

  const formattedReviews = reviews.map(r => ({
    id: r._id,
    customerName: r.customer_id ? `${r.customer_id.firstName} ${r.customer_id.lastName}` : 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    orderInfo: {
      pickup: r.order_id?.pickup?.city || 'N/A',
      delivery: r.order_id?.delivery?.city || 'N/A'
    }
  }));

  return {
    averageRating: parseFloat(averageRating),
    totalReviews,
    reviews: formattedReviews
  };
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
  const fleet = await truckRepo.getFleet(transporterId);
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

// ─── Driver Management ─────────────────────────────────────────────────────────

const getDrivers = async (transporterId) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }
  const drivers = await driverRepo.findDriversByTransporter(transporterId);
  return drivers;
};

const getDriverRequests = async (transporterId) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }
  const requests = await driverRepo.getPendingApplicationsForTransporter(transporterId);
  return requests;
};

const acceptDriverRequest = async (transporterId, applicationId) => {
  const application = await driverRepo.findApplicationById(applicationId);
  if (!application) {
    throw new AppError(404, 'NotFoundError', 'Application not found', 'ERR_NOT_FOUND');
  }
  if (application.transporter_id._id.toString() !== transporterId) {
    throw new AppError(403, 'ForbiddenError', 'Not your application to manage', 'ERR_FORBIDDEN');
  }
  if (application.status !== 'Pending') {
    throw new AppError(400, 'ValidationError', 'Application is no longer pending', 'ERR_VALIDATION');
  }

  // Accept the application
  const updated = await driverRepo.updateApplicationStatus(applicationId, 'Accepted');
  // Associate driver with transporter
  await driverRepo.setDriverTransporter(application.driver_id._id, transporterId);

  emitDomainEvent(DOMAIN_EVENTS.DRIVER_APPLICATION_ACCEPTED, {
    type: 'driver.application.accepted',
    title: 'Application accepted',
    message: 'Your application to join transporter was accepted',
    recipients: [{ userId: application.driver_id._id.toString(), role: 'driver' }],
    actor: { userId: transporterId, role: 'transporter' },
    meta: {
      applicationId,
      transporterId,
    },
  });

  return updated;
};

const rejectDriverRequest = async (transporterId, applicationId, rejectionReason) => {
  const application = await driverRepo.findApplicationById(applicationId);
  if (!application) {
    throw new AppError(404, 'NotFoundError', 'Application not found', 'ERR_NOT_FOUND');
  }
  if (application.transporter_id._id.toString() !== transporterId) {
    throw new AppError(403, 'ForbiddenError', 'Not your application to manage', 'ERR_FORBIDDEN');
  }
  if (application.status !== 'Pending') {
    throw new AppError(400, 'ValidationError', 'Application is no longer pending', 'ERR_VALIDATION');
  }

  const updated = await driverRepo.updateApplicationStatus(applicationId, 'Rejected', rejectionReason);

  emitDomainEvent(DOMAIN_EVENTS.DRIVER_APPLICATION_REJECTED, {
    type: 'driver.application.rejected',
    title: 'Application rejected',
    message: 'Your application to join transporter was rejected',
    recipients: [{ userId: application.driver_id._id.toString(), role: 'driver' }],
    actor: { userId: transporterId, role: 'transporter' },
    meta: {
      applicationId,
      transporterId,
      rejectionReason: rejectionReason || '',
    },
  });

  return updated;
};

const removeDriver = async (transporterId, driverId) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }
  if (!driver.transporter_id || driver.transporter_id.toString() !== transporterId) {
    throw new AppError(400, 'ValidationError', 'Driver is not associated with your company', 'ERR_VALIDATION');
  }

  await driverRepo.removeDriverFromTransporter(driverId);
};

const getDriverSchedule = async (transporterId, driverId, startDate, endDate) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }
  if (!driver.transporter_id || driver.transporter_id.toString() !== transporterId) {
    throw new AppError(403, 'ForbiddenError', 'Driver is not associated with your company', 'ERR_FORBIDDEN');
  }

  const start = startDate || new Date().toISOString();
  const end = endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const blocks = await driverRepo.getScheduleBlocks(driverId, start, end);
  return { blocks, startDate: start, endDate: end, driverName: `${driver.firstName} ${driver.lastName}` };
};


const uploadDocuments = async (transporterId, files) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  const docData = {
    'documents.pan_card': undefined,
    'documents.driving_license': undefined,
    'documents.vehicle_rcs': [],
  };

  // Process pan_card
  if (files.pan_card && files.pan_card[0]) {
    docData['documents.pan_card'] = {
      url: `/uploads/transporter-docs/${files.pan_card[0].filename}`,
      uploadedAt: new Date(),
      autoVerified: true,
      adminStatus: 'pending',
    };
  }

  // Process driving_license
  if (files.driving_license && files.driving_license[0]) {
    docData['documents.driving_license'] = {
      url: `/uploads/transporter-docs/${files.driving_license[0].filename}`,
      uploadedAt: new Date(),
      autoVerified: true,
      adminStatus: 'pending',
    };
  }

  // Process vehicle_rcs — files named vehicle_rc_0, vehicle_rc_1, etc.
  const vehicleRcs = [];
  const fleet = transporter.fleet || [];
  for (let i = 0; i < fleet.length; i++) {
    const fieldName = `vehicle_rc_${i}`;
    if (files[fieldName] && files[fieldName][0]) {
      const rcUrl = `/uploads/transporter-docs/${files[fieldName][0].filename}`;
      vehicleRcs.push({
        url: rcUrl,
        uploadedAt: new Date(),
        autoVerified: true,
        adminStatus: 'pending',
        vehicleId: fleet[i]._id,
      });

      // Also update the fleet item's rc_url/rc_status so fleet cards show it
      await transporterRepo.uploadVehicleRc(transporterId, fleet[i]._id.toString(), rcUrl);
    }
  }
  docData['documents.vehicle_rcs'] = vehicleRcs;

  // Set verification status to under_review
  docData['verificationStatus'] = 'under_review';

  const updated = await transporterRepo.saveDocuments(transporterId, docData);
  return updated;
};

const uploadVehicleRc = async (transporterId, vehicleId, file) => {
  if (!file) {
    throw new AppError(400, 'ValidationError', 'RC file is required', 'ERR_VALIDATION');
  }
  const rcUrl = `/uploads/transporter-docs/${file.filename}`;
  const result = await transporterRepo.uploadVehicleRc(transporterId, vehicleId, rcUrl);
  if (!result) {
    throw new AppError(404, 'NotFoundError', 'Vehicle not found', 'ERR_NOT_FOUND');
  }

  // Set verificationStatus to under_review so this transporter appears in the manager queue
  // Keep isVerified unchanged — don't block bidding for previously verified transporters
  await transporterRepo.updateVerificationStatus(transporterId, 'under_review', result.isVerified ?? false);

  return { rc_url: rcUrl };
};

// Helper: check if all submitted documents are approved
function checkAllDocumentsApproved(docs) {
  if (!docs) return false;
  if (!docs.pan_card || docs.pan_card.adminStatus !== 'approved') return false;
  if (!docs.driving_license || docs.driving_license.adminStatus !== 'approved') return false;
  // All remaining vehicle_rcs must be approved (empty array is OK — means no vehicles left)
  if (docs.vehicle_rcs && docs.vehicle_rcs.length > 0) {
    for (const rc of docs.vehicle_rcs) {
      if (rc.adminStatus !== 'approved') return false;
    }
  }
  return true;
}

const getTransporterPublicProfile = async (transporterId) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  // Get ratings
  const reviews = await Review.find({ transporter_id: transporterId })
    .populate('customer_id', 'firstName lastName')
    .populate('order_id', 'pickup.city delivery.city')
    .sort({ createdAt: -1 })
    .lean();

  const totalReviews = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  const averageRating = totalReviews > 0 ? parseFloat((sum / totalReviews).toFixed(1)) : 0;

  // Star distribution
  const starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) starDistribution[r.rating]++; });

  // Completed orders count
  const completedOrders = await Order.countDocuments({
    assigned_transporter_id: transporterId,
    status: 'Completed'
  });

  const formattedReviews = reviews.slice(0, 10).map(r => ({
    id: r._id,
    customerName: r.customer_id ? `${r.customer_id.firstName} ${r.customer_id.lastName}` : 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    orderInfo: {
      pickup: r.order_id?.pickup?.city || 'N/A',
      delivery: r.order_id?.delivery?.city || 'N/A'
    }
  }));

  return {
    name: transporter.name,
    city: transporter.city || null,
    state: transporter.state || null,
    profilePicture: transporter.profilePicture || null,
    fleetSize: (transporter.fleet || []).length,
    memberSince: transporter.createdAt,
    completedOrders,
    averageRating,
    totalReviews,
    starDistribution,
    reviews: formattedReviews,
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
  getFleetSchedule,
  addFleetScheduleBlock,
  removeFleetScheduleBlock,
  getTransporterRatings,
  getTransporterPublicProfile,
  getDashboardStats,

  // Driver Management
  getDrivers,
  getDriverRequests,
  acceptDriverRequest,
  rejectDriverRequest,
  removeDriver,
  getDriverSchedule,
  uploadDocuments,
  uploadVehicleRc,
};
