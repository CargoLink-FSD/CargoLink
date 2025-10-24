import transporterRepo from "../repositories/transporterRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import { AppError, logger } from "../utils/misc.js";

const registerTransporter = async (transporterData) => {
  
  const { vehicles, ...transpoterInfo } = transporterData;

  const emailExists = await transporterRepo.checkEmailExists(transporterInfo.email);
  if (emailExists)
    throw new AppError(
      409,
      "DuplicateKey",
      "Email already in use",
      "ERR_DUP_EMAIL",
      [{ field: "email", message: "Already exisits" }]
    );
  
  transporterData = {...transpoterInfo, fleet: vehicles}

  const transporter = await transporterRepo.createTransporter(transporterData);

  return transporter;
};

const getTransporterProfile = async (transporterId)  => {

  const transporter = await transporterRepo.findTransporterById(tranpsorterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }
  
  const orderCount = await orderRepo.countOrdersByTransporter(transporter._id);
  
  // fetch image
  const profileImage = '/img/Mr.H.jpg' 

  const {fleet, ...transporterInfo} = transporter

  const fleetInfo = {
    count: fleet.length,
    
  }

  return {transporterInfo, orderCount, profileImage, fleetInfo};
};

export default {
  registerTransporter,
  getTransporterProfile
};
