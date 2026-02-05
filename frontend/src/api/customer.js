// Customer API Endpoints
// All customer-related API calls

import { http } from './http';

// Get customer profile
export const getCustomerProfile = async () => {
  const response = await http.get('/api/customers/profile');
  return response.data;
};

// Update customer profile fields
export const updateCustomerProfile = async (fieldType, fieldValue) => {
  const response = await http.put('/api/customers/profile', { [fieldType]: fieldValue });
  return response.data;
};

// Upload customer profile picture
export const uploadCustomerProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);
  const response = await http.put('/api/customers/profile', formData);
  return response.data;
};

// Update customer password
export const updateCustomerPassword = async (oldPassword, newPassword) => {
  const response = await http.patch('/api/customers/password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

// Get customer addresses
export const getCustomerAddresses = async () => {
  const response = await http.get('/api/customers/addresses');
  return response.data;
};

// Add customer address
export const addCustomerAddress = async (addressData) => {
  const response = await http.post('/api/customers/addresses', addressData);
  return response.data;
};

// Delete customer address
export const deleteCustomerAddress = async (addressId) => {
  const response = await http.del(`/api/customers/addresses/${addressId}`);
  return response.data;
};

export default {
  getCustomerProfile,
  updateCustomerProfile,
  uploadCustomerProfilePicture,
  updateCustomerPassword,
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
};
