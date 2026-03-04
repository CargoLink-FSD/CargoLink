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

// ─── Schedule ──────────────────────────────────────────────────────────────────

export const getDriverSchedule = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await http.get(`/api/drivers/schedule${query}`);
  return response.data;
};

export const addScheduleBlock = async (blockData) => {
  const response = await http.post('/api/drivers/schedule/block', blockData);
  return response.data;
};

export const removeScheduleBlock = async (blockId) => {
  const response = await http.del(`/api/drivers/schedule/block/${blockId}`);
  return response;
};

// ─── Join Transporter ──────────────────────────────────────────────────────────

export const getTransportersList = async () => {
  const response = await http.get('/api/drivers/transporters');
  return response.data;
};

export const applyToTransporter = async (transporterId, message) => {
  const response = await http.post(`/api/drivers/apply/${transporterId}`, { message });
  return response.data;
};

export const getApplications = async () => {
  const response = await http.get('/api/drivers/applications');
  return response.data;
};

export const withdrawApplication = async (applicationId) => {
  const response = await http.del(`/api/drivers/application/${applicationId}`);
  return response;
};

export default {
  getDriverProfile,
  updateDriverProfile,
  uploadDriverProfilePicture,
  updateDriverPassword,
  getDriverDashboardStats,
  getDriverSchedule,
  addScheduleBlock,
  removeScheduleBlock,
  getTransportersList,
  applyToTransporter,
  getApplications,
  withdrawApplication,
};
