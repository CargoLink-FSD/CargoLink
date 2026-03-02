// Driver API Endpoints
// All driver-related API calls

import { http } from './http';

// Get driver profile
export const getDriverProfile = async () => {
  const response = await http.get('/api/drivers/profile');
  return response.data;
};

// Update driver profile fields
export const updateDriverProfile = async (fieldType, fieldValue) => {
  const response = await http.put('/api/drivers/profile', { [fieldType]: fieldValue });
  return response.data;
};

// Upload driver profile picture
export const uploadDriverProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);
  const response = await http.put('/api/drivers/profile', formData);
  return response.data;
};

// Update driver password
export const updateDriverPassword = async (oldPassword, newPassword) => {
  const response = await http.patch('/api/drivers/password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

// Get driver dashboard statistics
export const getDriverDashboardStats = async () => {
  const response = await http.get('/api/drivers/dashboard-stats');
  return response.data;
};

export default {
  getDriverProfile,
  updateDriverProfile,
  uploadDriverProfilePicture,
  updateDriverPassword,
  getDriverDashboardStats,
};
