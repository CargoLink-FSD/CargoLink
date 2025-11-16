import transporterRepo from "../repositories/transporterRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import { AppError, logger } from "../utils/misc.js";

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


export default {
  registerTransporter,
  getTransporterProfile,
  updateTransporterProfile,
  changePassword,
};
