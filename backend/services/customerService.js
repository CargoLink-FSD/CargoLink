import customerRepo from "../repositories/customerRepo.js";
import orderRepo from "../repositories/orderRepo.js";
import { AppError, logger } from "../utils/misc.js";

const registerCustomer = async (customerData) => {

  const { address, ...customerInfo } = customerData;

  const emailExists = await customerRepo.checkEmailExists(customerInfo.email);
  if (emailExists)
    throw new AppError(409, "DuplicateKey", 'Email already in use', "ERR_DUP_EMAIL", [{field: 'email', message:  'Already exisits'}]);

  if (address) {
    customerInfo.addresses = [{
    ...address,
    address_label: 'Home',
    contact_phone: address.contact_phone || customerData.phone,
    }];
  }

  const customer = await customerRepo.createCustomer(customerInfo);
  return customer;
};

const getCustomerProfile = async (customerId)  => {

  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  }
  
  const orderCount = await orderRepo.countOrdersByCustomer(customer._id);
  
  // Use profile picture from database if available
  const profileImage = customer.profilePicture || null;

  return {customer, orderCount, profileImage};
};

const updateCustomerProfile = async (customerId, updates) => {

  const customer = await customerRepo.updateCustomer(customerId, updates);

  if (!customer) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  }

  return customer;
};

const getCustomerAddresses = async (customerId)  => {

  const customerAddresses = await customerRepo.getAddresses(customerId);
  if (!customerAddresses) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  }
  return {customerAddresses};
};

const addCustomerAddress = async (customerId, addressData) => {

  const addresses = await customerRepo.addAddress(customerId, addressData);

  return addresses;
};

const removeCustomerAddress = async (customerId, addressIndex) => {
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  };
      
  if (addressIndex < 0 || addressIndex >= customer.addresses.length) {
    throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION', 
      { type: "field", value: addressIndex, msg: "Not a valid Index for addresses", path: "addressIndex", location: "body"}
    );
  }

  const result = await customerRepo.removeAddress(customer, addressIndex);
  return result.addresses;
};

const changePassword = async (customerId, oldPassword, newPassword) => {

  logger.debug('Changing password for customer', { customerId, oldPassword, newPassword });
  
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    throw new AppError(404, 'NotFoundError', 'Customer not found', 'ERR_NOT_FOUND');
  };

  const isMatch = await customer.verifyPassword(oldPassword);
  if (!isMatch) {
    throw new AppError(401, 'AuthenticationError', 'Old password is incorrect', 'ERR_AUTH_INVALID');
  }
  logger.debug('Old password verified, updating to new password', {customer});
  await customer.updatePassword(newPassword);
};


export default {
  registerCustomer,
  getCustomerProfile,
  updateCustomerProfile,

  getCustomerAddresses,
  addCustomerAddress,
  removeCustomerAddress,

  changePassword,
}