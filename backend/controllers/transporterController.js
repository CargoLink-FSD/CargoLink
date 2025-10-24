import transporterService from "../services/transporterService.js";

const createTransporter = async (req, res, next) => {
  try {
    const transporterData = req.body;
    logger.debug("Transporter creation input", transporterData)
    const transporter = await transporterService.registerCustomer(transporterData);
    logger.debug("Transporter Created", transporter);
    res.status(201).json({
      success: true,
      data: transporter,
      message: 'Transporter registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getTransporterProfile = async (req, res, next) => {

  try {
    const transporterId = req.user.id;
    const {transporter, orderCount, profileImage} = await transporterService.getTransporterProfile(transporterId);

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
      fleetInfo
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
    if (!req.body || req.body == {}){
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION', 
        {type: "data", msg: "No Fields to update in request Body", location: "body"}
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
  // Placeholder for updating password
};


// Trucks
const getTrucks = async (req, res, next) => {
  // Placeholder for getting all trucks
};

const addTruck = async (req, res, next) => {
  // Placeholder for adding a truck
};

const getTruckDetails = async (req, res, next) => {
  // Placeholder for getting truck details
};

const updateTruck = async (req, res, next) => {
  // Placeholder for updating a truck
};

const removeTruck = async (req, res, next) => {
  // Placeholder for removing a truck
};

const scheduleMaintenance = async (req, res, next) => {
  // Placeholder for scheduling truck maintenance
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
  scheduleMaintenance,
  
  getServiceLocations,
  addServiceLocation,
  removeServiceLocation,
  
  getPaymentInfo,
  updatePaymentInfo,
};
