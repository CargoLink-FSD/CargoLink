import driverRepo from "../repositories/driverRepo.js";
import transporterRepo from "../repositories/transporterRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import { AppError, logger } from "../utils/misc.js";

const registerDriver = async (driverData) => {

  const { address, ...driverInfo } = driverData;

  const emailExists = await driverRepo.checkEmailExists(driverInfo.email);
  if (emailExists)
    throw new AppError(409, "DuplicateKey", 'Email already in use', "ERR_DUP_EMAIL", [{field: 'email', message:  'Already exisits'}]);

  const driver = await driverRepo.createDriver(driverData);
  return driver;
};

const getDriverProfile = async (driverId)  => {

  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }
  
  // const tripsCount = await tripsRepo.countTripsByDriver(driver._id);
  const tripsCount = 0;

  // Use profile picture from database if available
  const profileImage = driver.profilePicture || null;

  return {driver, tripsCount, profileImage};
};

const updateDriverProfile = async (driverId, updates) => {

  const driver = await driverRepo.updateDriver(driverId, updates);

  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  return driver;
};

const changePassword = async (driverId, oldPassword, newPassword) => {

  logger.debug('Changing password for driver', { driverId, oldPassword, newPassword });
  
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  };

  const isMatch = await driver.verifyPassword(oldPassword);
  if (!isMatch) {
    throw new AppError(401, 'AuthenticationError', 'Old password is incorrect', 'ERR_AUTH_INVALID');
  }
  logger.debug('Old password verified, updating to new password', {driver});
  await driver.updatePassword(newPassword);
};

/**
 * Get dashboard statistics for a driver
 * @param {string} driverId - The driver's ID
 * @returns {Object} Dashboard statistics
 */
const getDashboardStats = async (driverId) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  // Define active statuses
  const activeStatuses = ['Placed', 'Assigned', 'In Transit', 'Started'];
  
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Get upcoming pickups window (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Aggregation pipeline for comprehensive stats
  const statsAggregation = await orderRepo.getDriverDashboardStats(driverId, {
    activeStatuses,
    startOfMonth,
    endOfMonth,
    now,
    sevenDaysFromNow
  });

  return statsAggregation;
};

// ─── Schedule ──────────────────────────────────────────────────────────────────

const getSchedule = async (driverId, startDate, endDate) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  const start = startDate || new Date().toISOString();
  const end = endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const blocks = await driverRepo.getScheduleBlocks(driverId, start, end);
  return { blocks, startDate: start, endDate: end };
};

const addScheduleBlock = async (driverId, blockData) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  if (new Date(blockData.startTime) >= new Date(blockData.endTime)) {
    throw new AppError(400, 'ValidationError', 'Start time must be before end time', 'ERR_VALIDATION');
  }

  // Check for overlapping blocks
  const existingBlocks = await driverRepo.getScheduleBlocks(driverId, blockData.startTime, blockData.endTime);
  const overlap = existingBlocks.some((b) => {
    return new Date(b.startTime) < new Date(blockData.endTime) && new Date(b.endTime) > new Date(blockData.startTime);
  });

  if (overlap) {
    throw new AppError(409, 'ConflictError', 'Schedule block overlaps with an existing block', 'ERR_SCHEDULE_OVERLAP');
  }

  const block = await driverRepo.addScheduleBlock(driverId, {
    title: blockData.title || 'Unavailable',
    type: 'unavailable',
    startTime: new Date(blockData.startTime),
    endTime: new Date(blockData.endTime),
    notes: blockData.notes || '',
  });

  return block;
};

const removeScheduleBlock = async (driverId, blockId) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  // Only allow removing 'unavailable' type blocks (not trip blocks)
  const block = driver.scheduleBlocks.id(blockId);
  if (!block) {
    throw new AppError(404, 'NotFoundError', 'Schedule block not found', 'ERR_NOT_FOUND');
  }
  if (block.type === 'trip') {
    throw new AppError(400, 'ValidationError', 'Cannot remove trip-assigned schedule blocks', 'ERR_TRIP_BLOCK');
  }

  await driverRepo.removeScheduleBlock(driverId, blockId);
};

// ─── Join Transporter ──────────────────────────────────────────────────────────

const listTransporters = async () => {
  const transporters = await transporterRepo.findAllTransporters();
  return transporters;
};

const applyToTransporter = async (driverId, transporterId, message) => {
  const driver = await driverRepo.findDriverById(driverId);
  if (!driver) {
    throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
  }

  if (driver.transporter_id) {
    throw new AppError(400, 'ValidationError', 'You are already associated with a transporter. Leave first before applying.', 'ERR_ALREADY_ASSOCIATED');
  }

  const existingApplication = await driverRepo.findPendingApplication(driverId, transporterId);
  if (existingApplication) {
    throw new AppError(409, 'ConflictError', 'You already have a pending application to this transporter', 'ERR_DUP_APPLICATION');
  }

  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  const application = await driverRepo.createApplication({
    driver_id: driverId,
    transporter_id: transporterId,
    message: message || '',
  });

  return application;
};

const getApplicationStatus = async (driverId) => {
  const applications = await driverRepo.getDriverApplications(driverId);
  return applications;
};

const withdrawApplication = async (driverId, applicationId) => {
  const application = await driverRepo.findApplicationById(applicationId);
  if (!application) {
    throw new AppError(404, 'NotFoundError', 'Application not found', 'ERR_NOT_FOUND');
  }
  if (application.driver_id._id.toString() !== driverId) {
    throw new AppError(403, 'ForbiddenError', 'Not your application', 'ERR_FORBIDDEN');
  }
  if (application.status !== 'Pending') {
    throw new AppError(400, 'ValidationError', 'Can only withdraw pending applications', 'ERR_VALIDATION');
  }

  await driverRepo.deleteApplication(applicationId);
};

export default {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,

  changePassword,
  getDashboardStats,

  // Schedule
  getSchedule,
  addScheduleBlock,
  removeScheduleBlock,

  // Join Transporter
  listTransporters,
  applyToTransporter,
  getApplicationStatus,
  withdrawApplication,
}