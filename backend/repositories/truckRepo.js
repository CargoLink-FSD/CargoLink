import Fleet from '../models/fleet.js';
import { logger } from '../utils/misc.js';

const getFleet = async (transporterId) => {
  return await Fleet.find({ transporter_id: transporterId });
};

const getFleetCount = async (transporterId) => {
  return await Fleet.countDocuments({ transporter_id: transporterId });
};

const getTruck = async (transporterId, truckId) => {
  return await Fleet.findOne({ _id: truckId, transporter_id: transporterId });
};

const getTruckById = async (truckId) => {
  return await Fleet.findById(truckId);
};

const addTruck = async (transporterId, truckData) => {
  const truck = new Fleet({ ...truckData, transporter_id: transporterId });
  return await truck.save();
};

const addTrucks = async (transporterId, trucksArray) => {
  const docs = trucksArray.map((t) => ({ ...t, transporter_id: transporterId }));
  return await Fleet.insertMany(docs);
};

const deleteTruck = async (transporterId, truckId) => {
  await Fleet.findOneAndDelete({ _id: truckId, transporter_id: transporterId });
  return await Fleet.find({ transporter_id: transporterId });
};

const updateTruck = async (transporterId, truckId, updates) => {
  const truck = await Fleet.findOneAndUpdate(
    { _id: truckId, transporter_id: transporterId },
    { $set: updates },
    { new: true }
  );
  logger.debug('Truck updated:', { truck });
  return truck;
};

// ─── Fleet Schedule ─────────────────────────────────────────────────────────────

const getFleetScheduleBlocks = async (transporterId, truckId, startDate, endDate) => {
  const truck = await Fleet.findOne({ _id: truckId, transporter_id: transporterId });
  if (!truck) return [];

  const blocks = (truck.scheduleBlocks || []).filter((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return bEnd >= new Date(startDate) && bStart <= new Date(endDate);
  });
  return blocks;
};

const addFleetScheduleBlock = async (transporterId, truckId, block) => {
  const truck = await Fleet.findOneAndUpdate(
    { _id: truckId, transporter_id: transporterId },
    { $push: { scheduleBlocks: block } },
    { new: true }
  );
  if (!truck) return null;
  return truck.scheduleBlocks[truck.scheduleBlocks.length - 1];
};

const removeFleetScheduleBlock = async (transporterId, truckId, blockId) => {
  const truck = await Fleet.findOneAndUpdate(
    { _id: truckId, transporter_id: transporterId },
    { $pull: { scheduleBlocks: { _id: blockId } } },
    { new: true }
  );
  return truck;
};

export default {
  getFleet,
  getFleetCount,
  getTruck,
  getTruckById,
  addTruck,
  addTrucks,
  deleteTruck,
  updateTruck,
  getFleetScheduleBlocks,
  addFleetScheduleBlock,
  removeFleetScheduleBlock,
};
