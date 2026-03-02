import Transporter from '../models/transporter.js';
import Fleet from '../models/fleet.js';

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

const findAllTransporters = async () => {
  const transporters = await Transporter.find({})
    .select('name email city state primary_contact profilePicture')
    .lean();

  // Attach fleet counts from the separate Fleet collection
  const transporterIds = transporters.map((t) => t._id);
  const fleetCounts = await Fleet.aggregate([
    { $match: { transporter_id: { $in: transporterIds } } },
    { $group: { _id: '$transporter_id', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(fleetCounts.map((fc) => [fc._id.toString(), fc.count]));

  return transporters.map((t) => ({
    ...t,
    fleetCount: countMap[t._id.toString()] || 0,
  }));
};

const updateTransporter = async (transporterId, updates) => {
  const transporter = await Transporter.findByIdAndUpdate(transporterId, updates, { new: true }).select('-password');
  return transporter
};

const getTransporterById = async (id) => {
  return await Transporter.findById(id);
};

export default {
  checkEmailExists,
  createTransporter,
  findByEmail,
  findTransporterById,
  findAllTransporters,
  updateTransporter,
  getTransporterById,
}