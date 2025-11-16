import { transport } from 'pino';
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

export default {
  checkEmailExists,
  createTransporter,
  findByEmail,
  findTransporterById,
  updateTransporter,
}