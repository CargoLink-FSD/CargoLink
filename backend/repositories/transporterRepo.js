import Transporter from '../models/transporter.js';
import { logger } from '../utils/misc.js'

const checkEmailExists = async (email) => {
  return await Transporter.exists({ email });
};

const createTransporter = async (transporterData) => {
  const transporter = new Transporter(transporterData);
  return await transporter.save();
};

const findByEmail = async (email) => {
  return await Transporter.findOne({ email });
};

const findTransporterById = async (id) => {
  return await Transporter.findById(id);
};

const updateTransporter = async (transporterId, updates) => {
  const transporter = await Transporter.findByIdAndUpdate(transporterId, updates, { new: true }).select('-password -fleet');
  return transporter
};


const getFleet = async (transporterId) => {
  const result = await Transporter.findById(transporterId).select('fleet');
  return result.fleet;
};

const getTruck = async (transporterId, truckId) => {
  const truckData = await Transporter.findOne({
      _id: transporterId,
      'fleet._id': truckId
    }, {'fleet.$': 1});

  return truckData ? truckData.fleet[0] : null;
};
    

const addTruck = async (transporterId, truck) => {

 const updated = await Transporter.findOneAndUpdate(
    { _id: transporterId },
    { $push: { fleet: truck } },
    { new: true }
  );
  return updated.fleet[updated.fleet.length - 1];
};

const deleteTruck = async (transporterId, truckId) => {
  
  const updated =  await Transporter.findOneAndUpdate(
    { _id: transporterId },
    { $pull: { fleet: { _id: truckId } } },
    { new: true }
  );
  logger.debug('Truck deleted, updated fleet:', { updatedFleet: updated });
  return updated.fleet;
};

const updateTruckInFleet = async (transporterId, truckId, updates) => {
  const updated = await Transporter.findOneAndUpdate(
    { _id: transporterId, 'fleet._id': truckId },
    { $set: Object.fromEntries(
        Object.entries(updates).map(([key, value]) => ([`fleet.$.${key}`, value]))
      )
    },
    { new: true }
  );
  logger.debug('Truck updated in fleet:', { updatedFleet: updated });
  return updated.fleet.id(truckId);
}

export default {
  checkEmailExists,
  createTransporter,
  findByEmail,
  findTransporterById,
  updateTransporter,
  getFleet,
  getTruck,
  addTruck,
  deleteTruck,
  updateTruckInFleet,
}