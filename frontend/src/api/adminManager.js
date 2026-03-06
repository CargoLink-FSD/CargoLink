// Admin API endpoints for manager management
import { http } from './http';

// Get all managers with stats
export const getAllManagers = async () => {
    const res = await http.get('/api/admin/managers');
    return res.data;
};

// Generate invitation code
export const generateInvitationCode = async ({ categories, verificationCategories = [], expiresInHours }) => {
    const res = await http.post('/api/admin/managers/invite', { categories, verificationCategories, expiresInHours });
    return res.data;
};

// Get all invitation codes
export const getAllInvitationCodes = async () => {
    const res = await http.get('/api/admin/managers/invitations');
    return res.data;
};

// Update manager status
export const updateManagerStatus = async (id, status) => {
    const res = await http.patch(`/api/admin/managers/${id}/status`, { status });
    return res.data;
};

// Update manager categories (ticket + verification)
export const updateManagerCategories = async (id, categories, verificationCategories) => {
    const res = await http.patch(`/api/admin/managers/${id}/categories`, { categories, verificationCategories });
    return res.data;
};

// Delete a manager
export const deleteManager = async (id) => {
    const res = await http.del(`/api/admin/managers/${id}`);
    return res;
};

// Get threshold configs
export const getThresholdConfigs = async () => {
    const res = await http.get('/api/admin/thresholds');
    return res.data;
};

// Update threshold config
export const updateThresholdConfig = async (category, maxTicketsPerHour) => {
    const res = await http.put('/api/admin/thresholds', { category, maxTicketsPerHour });
    return res.data;
};

// Reset threshold alert
export const resetThresholdAlert = async (category) => {
    const res = await http.post('/api/admin/thresholds/reset-alert', { category });
    return res.data;
};

// Get ticket volume by category
export const getTicketVolumeByCategory = async () => {
    const res = await http.get('/api/admin/ticket-volume');
    return res.data;
};

export default {
    getAllManagers,
    generateInvitationCode,
    getAllInvitationCodes,
    updateManagerStatus,
    updateManagerCategories,
    deleteManager,
    getThresholdConfigs,
    updateThresholdConfig,
    resetThresholdAlert,
    getTicketVolumeByCategory,
};
