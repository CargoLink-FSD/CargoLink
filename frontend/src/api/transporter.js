// Transporter API Endpoints
// All transporter-related API calls

import { http } from './http';

// Get transporter profile
export const getTransporterProfile = async () => {
  const response = await http.get('/api/transporters/profile');
  return response.data;
};

// Update transporter profile fields
export const updateTransporterProfile = async (fieldType, fieldValue) => {
  const response = await http.put('/api/transporters/profile', { [fieldType]: fieldValue });
  return response.data;
};

// Update transporter password
export const updateTransporterPassword = async (oldPassword, newPassword) => {
  const response = await http.patch('/api/transporters/password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

// Get transporter dashboard statistics
export const getTransporterDashboardStats = async () => {
  const response = await http.get('/api/transporters/dashboard-stats');
  return response.data;
};

export default {
  getTransporterProfile,
  updateTransporterProfile,
  updateTransporterPassword,
  getTransporterDashboardStats,
};
