import Driver from '../models/driver.js';
import DriverApplication from '../models/driverApplication.js';
import { logger } from '../utils/misc.js'

const checkEmailExists = async (email) => {
  return await Driver.exists({ email });
};

const createDriver = async (driverData) => {
  const driver = await Driver.create(driverData);
  return driver
};

const findDriverById = async (driverId) => {
  const driver = await Driver.findById(driverId);
  return driver
};

const findByEmail = async (email) => {
  const driver = await Driver.findOne({ email })
  return driver
};

const updateDriver = async (driverId, updates) => {
  const driver = await Driver.findByIdAndUpdate(driverId, updates, { new: true }).select('-password -addresses');
  return driver
};

// ─── Schedule Block Methods ────────────────────────────────────────────────────

const getScheduleBlocks = async (driverId, startDate, endDate) => {
  const driver = await Driver.findById(driverId).select('scheduleBlocks');
  if (!driver) return [];
  return driver.scheduleBlocks.filter(
    (b) => new Date(b.endTime) >= new Date(startDate) && new Date(b.startTime) <= new Date(endDate)
  );
};

const addScheduleBlock = async (driverId, block) => {
  const driver = await Driver.findByIdAndUpdate(
    driverId,
    { $push: { scheduleBlocks: block } },
    { new: true }
  ).select('scheduleBlocks');
  return driver.scheduleBlocks[driver.scheduleBlocks.length - 1];
};

const removeScheduleBlock = async (driverId, blockId) => {
  const driver = await Driver.findByIdAndUpdate(
    driverId,
    { $pull: { scheduleBlocks: { _id: blockId } } },
    { new: true }
  ).select('scheduleBlocks');
  return driver;
};

// ─── Application Methods ───────────────────────────────────────────────────────

const createApplication = async (applicationData) => {
  const application = await DriverApplication.create(applicationData);
  return application;
};

const findApplicationById = async (applicationId) => {
  return await DriverApplication.findById(applicationId)
    .populate('driver_id', 'firstName lastName email phone licenseNumber profilePicture')
    .populate('transporter_id', 'name email city state');
};

const findPendingApplication = async (driverId, transporterId) => {
  return await DriverApplication.findOne({
    driver_id: driverId,
    transporter_id: transporterId,
    status: 'Pending',
  });
};

const getDriverApplications = async (driverId) => {
  return await DriverApplication.find({ driver_id: driverId })
    .populate('transporter_id', 'name email city state profilePicture')
    .sort({ createdAt: -1 });
};

const updateApplicationStatus = async (applicationId, status, rejectionReason) => {
  const update = { status };
  if (rejectionReason) update.rejectionReason = rejectionReason;
  return await DriverApplication.findByIdAndUpdate(applicationId, update, { new: true })
    .populate('driver_id', 'firstName lastName email phone licenseNumber profilePicture')
    .populate('transporter_id', 'name email city state');
};

const deleteApplication = async (applicationId) => {
  return await DriverApplication.findByIdAndDelete(applicationId);
};

// ─── Transporter‐side driver queries ──────────────────────────────────────────

const findDriversByTransporter = async (transporterId) => {
  return await Driver.find({ transporter_id: transporterId })
    .select('-password')
    .sort({ createdAt: -1 });
};

const getPendingApplicationsForTransporter = async (transporterId) => {
  return await DriverApplication.find({
    transporter_id: transporterId,
    status: 'Pending',
  })
    .populate('driver_id', 'firstName lastName email phone licenseNumber profilePicture city state')
    .sort({ createdAt: -1 });
};

const setDriverTransporter = async (driverId, transporterId) => {
  return await Driver.findByIdAndUpdate(
    driverId,
    { transporter_id: transporterId },
    { new: true }
  ).select('-password');
};

const removeDriverFromTransporter = async (driverId) => {
  return await Driver.findByIdAndUpdate(
    driverId,
    { transporter_id: null },
    { new: true }
  ).select('-password');
};

// ─── Document Verification Methods ─────────────────────────────────────────────

const saveDocuments = async (driverId, docData) => {
  return await Driver.findByIdAndUpdate(
    driverId,
    { $set: docData },
    { new: true }
  );
};

const getDriversForVerification = async (includeAllStatuses = false) => {
  if (includeAllStatuses) {
    return await Driver.find({
      $or: [
        { 'documents.pan_card': { $exists: true } },
        { 'documents.driving_license': { $exists: true } },
        { verificationStatus: { $in: ['under_review', 'approved', 'rejected'] } },
      ],
    }).select('firstName lastName email phone licenseNumber documents verificationStatus city state createdAt');
  }

  return await Driver.find({
    $or: [
      { verificationStatus: { $in: ['under_review', 'rejected'] } },
      { 'documents.pan_card.adminStatus': { $in: ['pending', 'rejected'] } },
      { 'documents.driving_license.adminStatus': { $in: ['pending', 'rejected'] } },
    ],
  }).select('firstName lastName email phone licenseNumber documents verificationStatus city state createdAt');
};

const updateDocumentStatus = async (driverId, docPath, status, note) => {
  const updateObj = { [`${docPath}.adminStatus`]: status };
  if (note) updateObj[`${docPath}.adminNote`] = note;
  return await Driver.findByIdAndUpdate(driverId, { $set: updateObj }, { new: true });
};

const updateVerificationStatus = async (driverId, verificationStatus, isVerified) => {
  return await Driver.findByIdAndUpdate(
    driverId,
    { $set: { verificationStatus, isVerified } },
    { new: true }
  );
};

export default {
  checkEmailExists,
  createDriver,
  findDriverById,
  findByEmail,
  updateDriver,

  // Schedule
  getScheduleBlocks,
  addScheduleBlock,
  removeScheduleBlock,

  // Applications
  createApplication,
  findApplicationById,
  findPendingApplication,
  getDriverApplications,
  updateApplicationStatus,
  deleteApplication,

  // Transporter-side
  findDriversByTransporter,
  getPendingApplicationsForTransporter,
  setDriverTransporter,
  removeDriverFromTransporter,

  // Document verification
  saveDocuments,
  getDriversForVerification,
  updateDocumentStatus,
  updateVerificationStatus,
}