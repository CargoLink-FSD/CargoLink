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

// Upload transporter profile picture
export const uploadTransporterProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('profilePicture', file);
  const response = await http.put('/api/transporters/profile', formData);
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

// ── NEW ── Get transporter ratings / reviews
export const getTransporterRatings = async () => {
  const response = await http.get('/api/transporters/ratings');
  return response.data;     // or response.data.data — match your backend response shape
};

// Get transporter dashboard stats
export const getTransporterDashboardStats = async () => {
  const response = await http.get('/api/transporters/dashboard-stats');
  return response.data;
};

export default {
  getTransporterProfile,
  updateTransporterProfile,
  uploadTransporterProfilePicture,
  updateTransporterPassword,
  getTransporterRatings,    // ← don't forget to add it here too
  getTransporterDashboardStats,
};