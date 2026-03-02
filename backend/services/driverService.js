import driverRepo from "../repositories/driverRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import { AppError, logger } from "../utils/misc.js";

const registerDriver = async (driverData) => {

  const { address, ...driverInfo } = driverData;

  const emailExists = await driverRepo.checkEmailExists(driverInfo.email);
  if (emailExists)
    throw new AppError(409, "DuplicateKey", 'Email already in use', "ERR_DUP_EMAIL", [{field: 'email', message:  'Already exisits'}]);

  if (address) {
    driverInfo.addresses = [{
    ...address,
    address_label: 'Home',
    contact_phone: address.contact_phone || driverData.phone,
    }];
  }

  const driver = await driverRepo.createDriver(driverInfo);
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

export default {
  registerDriver,
  getDriverProfile,
  updateDriverProfile,

  changePassword,
  getDashboardStats,
}