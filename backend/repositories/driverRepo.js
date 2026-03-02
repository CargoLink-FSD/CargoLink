import Driver from '../models/driver.js';
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

export default {
    checkEmailExists,
    createDriver,
    findDriverById,
    findByEmail,
    updateDriver,
}