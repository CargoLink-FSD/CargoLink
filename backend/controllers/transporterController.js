import transporterService from "../services/transporterService.js";
import authService from "../services/authService.js";
import mongoose from "mongoose";
import { logger, AppError } from "../utils/misc.js";

const createTransporter = async (req, res, next) => {
  try {
    const transporterData = req.body;
    logger.debug("Transporter creation input", transporterData)
    const transporter = await transporterService.registerTransporter(transporterData);
    transporter.password = undefined;
    logger.debug("Transporter Created", transporter);
    const { accessToken, refreshToken } = authService.generateTokens(transporter, 'transporter');
    
    res.status(201).json({
      success: true,
      data: { accessToken, refreshToken },
      message: 'Transporter registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getTransporterProfile = async (req, res, next) => {

  try {
    const transporterId = req.user.id;
    const { transporter, orderCount, profileImage, fleetCount } = await transporterService.getTransporterProfile(transporterId);

    const transporterProfile = {
      companyName: transporter.name,
      email: transporter.email,
      phone: transporter.primary_contact,
      secondaryContact: transporter.secondary_contact,
      gstNumber: transporter.gst_in,
      panNumber: transporter.pan,
      address: transporter.street,
      city: transporter.city,
      state: transporter.state,
      pin: transporter.pin,
      memberSince: transporter.createdAt,
      profileImage,
      orderCount,
      fleetCount
    };

    logger.debug("Transporter Fetched Successfully", transporterProfile);

    res.status(200).json({
      success: true,
      data: transporterProfile,
      message: 'Transporter profile fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const updateTransporterProfile = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "data", msg: "No Fields to update in request Body", location: "body" }
      );
    }
    const updates = req.body;

    const transporter = await transporterService.updateTransporterProfile(transporterId, updates);

    res.status(200).json({
      success: true,
      data: transporter,
      message: 'Transporter profile updated successfully',
    });

  } catch (err) {
    next(err);
  }
};

const deleteTransporter = async (req, res, next) => {
  // Placeholder for soft deleting transporter profile
};

const updatePassword = async (req, res, next) => {
  try {
    logger.debug('Update password request received', { user: req.user, body: req.body });
    const transporterId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    await transporterService.changePassword(transporterId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (err) {
    next(err);
  }
};


// Trucks
const getTrucks = async (req, res, next) => {
  try {
    const transportId = req.user.id;
    const transporterFleet = await transporterService.getTransporterFleet(transportId);

    res.status(200).json({
      success: true,
      data: transporterFleet,
      message: 'Transporter fleet fetched successfully',
    });

  } catch (err) {
    next(err);
  }
};


const addTruck = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const truckData = req.body;

    const truck = {
      transporterId,
      name: truckData.name,
      registration: truckData.registration,
      capacity: parseFloat(truckData.capacity),
      manufacture_year: parseInt(truckData.manufacture_year),
      truck_type: truckData.truck_type,
      status: 'Available',
      last_service_date: truckData.last_service_date
    };

    const fleet = await transporterService.addFleet(transporterId, truck);

    res.status(201).json({
      success: true,
      data: fleet,
      message: 'Transporter Truck added successfully',
    });

  } catch (err) {
    next(err);
  }
};


const getTruckDetails = async (req, res, next) => {
  try {
    const transportId = req.user.id;
    const truckId = req.params.truckId;
    if (!mongoose.Types.ObjectId.isValid(truckId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: truckId, msg: "Not a valid truck ID", path: "truckId", location: "params" }
      );
    }
    const transporterFleet = await transporterService.getTruckDetails(transportId, truckId);

    res.status(200).json({
      success: true,
      data: transporterFleet,
      message: 'Transporter fleet details fetched successfully',
    });

  } catch (err) {
    next(err);
  }
};

const updateTruck = async (req, res, next) => {
  try{
    const transporterId = req.user.id;
    const truckId = req.params.truckId;
    if (!mongoose.Types.ObjectId.isValid(truckId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: truckId, msg: "Not a valid truck ID", path: "truckId", location: "params" }
      );
    }
    const updates = req.body;

    const updatedTruck = await transporterService.updateTruck(transporterId, truckId, updates);

    res.status(200).json({
      success: true,
      data: updatedTruck,
      message: 'Transporter Truck updated successfully',
    });
  }catch(err){
    next(err);
  }
};

const removeTruck = async (req, res, next) => {
  try {
    const transportId = req.user.id;
    const truckId = req.params.truckId;
    if (!mongoose.Types.ObjectId.isValid(truckId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: truckId, msg: "Not a valid truck ID", path: "truckId", location: "params" }
      );
    }
    const transporterFleet = await transporterService.removeTruck(transportId, truckId);

    res.status(200).json({
      success: true,
      data: transporterFleet,
      message: 'Transporter Truck deleted successfully',
    });

  } catch (err) {
    next(err);
  }
};




// Service Locations
const getServiceLocations = async (req, res, next) => {
  // Placeholder for getting service locations
};

const addServiceLocation = async (req, res, next) => {
  // Placeholder for adding a service location
};

const removeServiceLocation = async (req, res, next) => {
  // Placeholder for removing a service location
};

// Payment Info
const getPaymentInfo = async (req, res, next) => {
  // Placeholder for fetching payment info
};

const updatePaymentInfo = async (req, res, next) => {
  // Placeholder for updating payment info
};






// Export all functions
export default {
  createTransporter,
  getTransporterProfile,
  updateTransporterProfile,
  deleteTransporter,
  updatePassword,

  getTrucks,
  addTruck,
  getTruckDetails,
  updateTruck,
  removeTruck,

  getServiceLocations,
  addServiceLocation,
  removeServiceLocation,

  getPaymentInfo,
  updatePaymentInfo,
};
