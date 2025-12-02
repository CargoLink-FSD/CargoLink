import transporterRepo from "../repositories/transporterRepo.js";
import orderRepo from "../repositories/orderRepo.js";
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
};
