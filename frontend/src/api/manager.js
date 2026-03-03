// Manager API Endpoints
// All manager-related API calls for verification dashboard and registration

import { http } from './http';

// Register a new manager via invitation code
export const registerManager = async ({ name, email, password, invitationCode }) => {
  const response = await http.post('/api/manager/register', { name, email, password, invitationCode });
  return response.data;
};

// Get manager profile
export const getManagerProfile = async () => {
  const response = await http.get('/api/manager/profile');
  return response.data;
};

// Get all transporters with documents under review
export const getVerificationQueue = async () => {
  const response = await http.get('/api/manager/verification-queue');
  return response.data;
};

// Approve a specific document for a transporter
export const approveDocument = async (transporterId, docType) => {
  const response = await http.patch(`/api/manager/transporters/${transporterId}/documents/${docType}/approve`);
  return response.data;
};

// Reject a specific document for a transporter with a reason
export const rejectDocument = async (transporterId, docType, note) => {
  const response = await http.patch(`/api/manager/transporters/${transporterId}/documents/${docType}/reject`, { note });
  return response.data;
};

export default {
  registerManager,
  getManagerProfile,
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
