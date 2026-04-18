// Driver API Endpoints
// All driver-related API calls

import { http } from './http';

const mapDriverProfilePayload = (payload = {}) => {
  const mapped = { ...payload };
  const addressPatch = {
    ...(mapped.address && typeof mapped.address === 'object' ? mapped.address : {}),
  };

  if (Object.prototype.hasOwnProperty.call(mapped, 'address')) {
    if (typeof mapped.address === 'string') {
      addressPatch.street = mapped.address;
    }
    delete mapped.address;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'city')) {
    addressPatch.city = mapped.city;
    delete mapped.city;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'state')) {
    addressPatch.state = mapped.state;
    delete mapped.state;
  }
  if (Object.prototype.hasOwnProperty.call(mapped, 'pin')) {
    addressPatch.pin = mapped.pin;
    delete mapped.pin;
  }

  if (Object.keys(addressPatch).length > 0) {
    mapped.address = addressPatch;
  }

  return mapped;
};

// Get driver profile
export const getDriverProfile = async () => {
  const response = await http.get('/api/drivers/profile');
  return response.data;
};

// Update driver profile fields
export const updateDriverProfile = async (fieldTypeOrPayload, fieldValue) => {
  const payload =
    typeof fieldTypeOrPayload === 'object' && fieldTypeOrPayload !== null
      ? fieldTypeOrPayload
      : { [fieldTypeOrPayload]: fieldValue };

  const response = await http.put('/api/drivers/profile', mapDriverProfilePayload(payload));
  return response.data;
};

// Upload driver profile picture
export const uploadDriverProfilePicture = async (fileOrFormData) => {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
  if (!(fileOrFormData instanceof FormData)) {
    formData.append('profilePicture', fileOrFormData);
  }

  const response = await http.put('/api/drivers/profile', formData);
  return response.data;
};

// Update driver password
export const updateDriverPassword = async (oldPasswordOrPayload, newPassword) => {
  const payload =
    typeof oldPasswordOrPayload === 'object' && oldPasswordOrPayload !== null
      ? oldPasswordOrPayload
      : { oldPassword: oldPasswordOrPayload, newPassword };

  const response = await http.patch('/api/drivers/password', {
    oldPassword: payload.oldPassword,
    newPassword: payload.newPassword,
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

// ─── Document Upload & Verification ────────────────────────────────────────────

export const uploadDriverDocuments = async (formData) => {
  const response = await http.post('/api/drivers/documents', formData);
  return response;
};

export const getDriverVerificationStatus = async () => {
  const response = await http.get('/api/drivers/verification-status');
  return response.data;
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
  uploadDriverDocuments,
  getDriverVerificationStatus,
};
