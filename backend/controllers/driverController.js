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
      streetAddress: driver.street || '',
      city: driver.city || '',
      state: driver.state || '',
      pin: driver.pin || '',
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

// ─── Schedule ──────────────────────────────────────────────────────────────────

const getSchedule = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { startDate, endDate } = req.query;
    const schedule = await driverService.getSchedule(driverId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: schedule,
      message: 'Schedule fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const addScheduleBlock = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const blockData = req.body;
    const block = await driverService.addScheduleBlock(driverId, blockData);

    res.status(201).json({
      success: true,
      data: block,
      message: 'Schedule block added successfully',
    });
  } catch (err) {
    next(err);
  }
};

const removeScheduleBlock = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { blockId } = req.params;
    await driverService.removeScheduleBlock(driverId, blockId);

    res.status(200).json({
      success: true,
      message: 'Schedule block removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Join Transporter ──────────────────────────────────────────────────────────

const getTransporters = async (req, res, next) => {
  try {
    const transporters = await driverService.listTransporters();

    res.status(200).json({
      success: true,
      data: transporters,
      message: 'Transporters fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const applyToTransporter = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { transporterId } = req.params;
    const { message } = req.body;
    const application = await driverService.applyToTransporter(driverId, transporterId, message);

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getApplicationStatus = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const applications = await driverService.getApplicationStatus(driverId);

    res.status(200).json({
      success: true,
      data: applications,
      message: 'Applications fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const withdrawApplication = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { applicationId } = req.params;
    await driverService.withdrawApplication(driverId, applicationId);

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
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

  // Schedule
  getSchedule,
  addScheduleBlock,
  removeScheduleBlock,

  // Join Transporter
  getTransporters,
  applyToTransporter,
  getApplicationStatus,
  withdrawApplication,
}