import Customer from '../models/customer.js';
import { logger } from '../utils/misc.js'

const checkEmailExists = async (email) => {
  return await Customer.exists({ email });
};

const createCustomer = async (customerData) => {
  const customer = await Customer.create(customerData);
  return customer
};

const findCustomerById = async (customerId) => {
  const customer = await Customer.findById(customerId);
  return customer
};

const findByEmail = async (email) => {
  const customer = await Customer.findOne({ email })
  return customer
};

const updateCustomer = async (customerId, updates) => {
  const customer = await Customer.findByIdAndUpdate(customerId, updates, { new: true }).select('-password -addresses');
  return customer
};

const getAddresses = async (customerId) => {
  const addresses = await Customer.findById(customerId).select('addresses');
  return addresses
};

const addAddress = async (customerId, addressData) => {
  const addresses =  await Customer.findByIdAndUpdate(
    { _id: customerId },
    { $push: { addresses: addressData } },
    { new: true }
  ).select('addresses');
  return addresses
}

const removeAddress = async (customer, addressIndex) => {
  customer.addresses.splice(addressIndex, 1);
  const result = await Customer.findByIdAndUpdate(
    customer._id,
    { addresses: customer.addresses },
    { new: true, runValidators: false }
  ).select('addresses');
  return result;
};


export default {
    checkEmailExists,
    createCustomer,
    findCustomerById,
    findByEmail,
    updateCustomer,
    getAddresses,
    addAddress,
    removeAddress,
}