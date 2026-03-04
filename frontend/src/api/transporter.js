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

// ─── Driver Management ─────────────────────────────────────────────────────────

export const getDrivers = async () => {
  const response = await http.get('/api/transporters/drivers');
  return response.data;
};

export const getDriverRequests = async () => {
  const response = await http.get('/api/transporters/driver-requests');
  return response.data;
};

export const acceptDriverRequest = async (applicationId) => {
  const response = await http.post(`/api/transporters/driver-requests/${applicationId}/accept`);
  return response.data;
};

export const rejectDriverRequest = async (applicationId, rejectionReason) => {
  const response = await http.post(`/api/transporters/driver-requests/${applicationId}/reject`, { rejectionReason });
  return response.data;
};

export const removeDriver = async (driverId) => {
  const response = await http.del(`/api/transporters/drivers/${driverId}`);
  return response;
};

export const getDriverSchedule = async (driverId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await http.get(`/api/transporters/drivers/${driverId}/schedule${query}`);
// Upload verification documents (FormData with files)
export const uploadDocuments = async (formData) => {
  const response = await http.post('/api/transporters/documents', formData);
  return response.data;
};

// Get verification status
export const getVerificationStatus = async () => {
  const response = await http.get('/api/transporters/verification-status');
  return response.data;
};

export default {
  getTransporterProfile,
  updateTransporterProfile,
  uploadTransporterProfilePicture,
  updateTransporterPassword,
  getTransporterRatings,
  getTransporterDashboardStats,
  getDrivers,
  getDriverRequests,
  acceptDriverRequest,
  rejectDriverRequest,
  removeDriver,
  getDriverSchedule,
  uploadDocuments,
  getVerificationStatus,
};