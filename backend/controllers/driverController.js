import driverService from "../services/driverService.js";
import authService from "../services/authService.js";
import { AppError, logger } from "../utils/misc.js";

const createDriver = async (req, res, next) => {
  try {
    const driverData = req.body;
    logger.debug("Driver creation input", driverData);
    const driver = await driverService.registerDriver(driverData);
    driver.password = undefined;
    logger.debug("Driver Created", driver);
    const { accessToken, refreshToken } = authService.generateTokens(driver, 'driver'); //tokens for auto login after signup.

    res.status(201).json({
      success: true,
      data: { accessToken, refreshToken },
      message: 'Driver registered successfully',
    });
  } catch (err) {
    next(err);
  }
};


const getDriverProfile = async (req, res, next) => {

  try {
    const driverId = req.user.id;
    const { driver, orderCount, profileImage } = await driverService.getDriverProfile(driverId);

    const driverProfile = {
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      dob: driver.dob,
      memberSince: driver.createdAt,
      gender: driver.gender,
      licenseNumber: driver.licenseNumber,
      streetAddress: driver.address?.street || '',
      city: driver.address?.city || '',
      state: driver.address?.state || '',
      pin: driver.address?.pin || '',
      profileImage,
      orderCount,
    }

    logger.debug("Driver Fetched Successfully", driverProfile);

    res.status(200).json({
      success: true,
      data: driverProfile,
      message: 'Driver profile fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};


const updateDriverProfile = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    if ((!req.body || Object.keys(req.body).length === 0) && !req.file) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "data", msg: "No Fields to update in request Body", location: "body" }
      );
    }

    const updates = req.body;
    
    // If a profile picture was uploaded, add the path to updates
    if (req.file) {
      updates.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
    }

    const driver = await driverService.updateDriverProfile(driverId, updates);

    res.status(200).json({
      success: true,
      data: driver,
      message: 'Driver profile updated successfully',
    });

  } catch (err) {
    next(err);
  }
};


const updatePassword = async (req, res, next) => {
  try {
    logger.debug('Update password request received', { user: req.user, body: req.body });
    const driverId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    await driverService.changePassword(driverId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (err) {
    next(err);
  }
};


const deleteDriver = async (req, res, next) => { };

/**
 * Get dashboard statistics for the authenticated driver
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const stats = await driverService.getDashboardStats(driverId);

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Dashboard statistics fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};


export default {
  createDriver,

  getDriverProfile,
  updateDriverProfile,
  deleteDriver,
  updatePassword,
  getDashboardStats,
}