// Manager API Endpoints
// All manager-related API calls for verification dashboard

import { http } from './http';

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
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
