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

// Get unified verification queue (transporters + drivers)
export const getVerificationQueue = async () => {
  const response = await http.get('/api/manager/verification-queue');
  return response.data;
};

// Approve a specific document (entityType: 'transporter' or 'driver')
export const approveDocument = async (entityId, docType, entityType = 'transporter') => {
  const response = await http.patch(`/api/manager/verify/${entityId}/documents/${docType}/approve`, { entityType });
  return response.data;
};

// Reject a specific document with a reason (entityType: 'transporter' or 'driver')
export const rejectDocument = async (entityId, docType, note, entityType = 'transporter') => {
  const response = await http.patch(`/api/manager/verify/${entityId}/documents/${docType}/reject`, { note, entityType });
  return response.data;
};

export default {
  registerManager,
  getManagerProfile,
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
