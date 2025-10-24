import customerService from "../services/customerService.js";
import { AppError, logger } from "../utils/misc.js";

const createCustomer = async (req, res, next) => {
  try {
    const customerData = req.body;
    logger.debug("Customer creation input", customerData)
    const customer = await customerService.registerCustomer(customerData);
    logger.debug("Customer Created", customer);
    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer registered successfully',
    });
  } catch (err) {
    next(err);
  }
};


const getCustomerProfile = async (req, res, next) => {

  try {
    const customerId = req.user.id;
    const {customer, orderCount, profileImage} = await customerService.getCustomerProfile(customerId);

    const customerProfile = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      dob: customer.dob, 
      memberSince: customer.createdAt, 
      gender: customer.gender,
      addresses: customer.addresses,
      profileImage,
      orderCount,
    }

    logger.debug("Customer Fetched Successfully", customerProfile);

    res.status(200).json({
      success: true,
      data: customerProfile,
      message: 'Customer profile fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};


const updateCustomerProfile = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    if (!req.body || req.body == {}){
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION', 
        {type: "data", msg: "No Fields to update in request Body", location: "body"}
      );
    }

    const updates = req.body;

    const customer = await customerService.updateCustomerProfile(customerId, updates);

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer profile updated successfully',
    });

  } catch (err) {
    next(err);
  }
};

const getAddresses = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const customerAddresses = await customerService.getCustomerAddresses(customerId);


    res.status(200).json({
      success: true,
      data: customerAddresses,
      message: 'Customer addresses fetched successfully',
    });

  } catch (err) {
    next(err);
  }
};

const addAddress = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const addressData = req.body;

    const addresses = await customerService.addCustomerAddress(customerId, addressData);

    res.status(200).json({
      success: true,
      data: addresses,
      message: 'Customer address added successfully',
    });

  } catch (err) {
    next(err);
  }
};

const removeAddress = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const addressIndex = parseInt(req.params.addressId);
    if (!(/^[0-9]+$/.test(req.params.addressId) && Number.isSafeInteger(addressIndex))){
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION', 
        { type: "field", value: req.params.addressId, msg: "Not a valid Index for addresses", path: "addressIndex", location: "params"}
      );
    }

    const addresses = await customerService.removeCustomerAddress(customerId, addressIndex);

    res.status(200).json({
      success: true,
      data: addresses,
      message: 'Customer address removed successfully',
    });

  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const {oldPassword, newPassword} = req.user.body;

    await customerService.updateCustomerPassword(customerId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (err) {
    next(err);
  }
};


const deleteCustomer = async (req, res, next) => {};

const getPaymentMethods = async (req, res, next) => {};
const addPaymentMethod = async (req, res, next) => {};
const removePaymentMethod = async (req, res, next) => {};


export default {
    createCustomer,

    getCustomerProfile,
    updateCustomerProfile,
    deleteCustomer,
    updatePassword,
    
    getAddresses,
    addAddress,
    removeAddress,
    
    getPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
}