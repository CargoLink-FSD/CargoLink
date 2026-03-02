import http from './http';

// ─── User endpoints ──────────────────────────────────────
export const createTicket = async (data) => {
    // Use FormData if there's a photo, otherwise plain JSON
    if (data.photo) {
        const fd = new FormData();
        fd.append('category', data.category);
        fd.append('subject', data.subject);
        fd.append('message', data.message);
        fd.append('priority', data.priority || 'medium');
        if (data.orderId) fd.append('orderId', data.orderId);
        fd.append('photo', data.photo);
        const res = await http.post('/api/tickets', fd);
        return res.data;
    }
    const res = await http.post('/api/tickets', data);
    return res.data;
};

export const getMyTickets = async () => {
    const res = await http.get('/api/tickets/my');
    return res.data;
};

export const getTicketDetail = async (id) => {
    const res = await http.get(`/api/tickets/${id}`);
    return res.data;
};

export const addReply = async (id, text) => {
    const res = await http.post(`/api/tickets/${id}/reply`, { text });
    return res.data;
};

export const reopenTicket = async (id) => {
    const res = await http.post(`/api/tickets/${id}/reopen`);
    return res.data;
};

// ─── Manager endpoints ──────────────────────────────────
export const getAllTickets = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.userRole) params.append('userRole', filters.userRole);
    if (filters.priority) params.append('priority', filters.priority);
    const qs = params.toString();
    const res = await http.get(`/api/tickets/manager/all${qs ? `?${qs}` : ''}`);
    return res.data;
};

export const getTicketStats = async () => {
    const res = await http.get('/api/tickets/manager/stats');
    return res.data;
};

export const managerGetTicket = async (id) => {
    const res = await http.get(`/api/tickets/manager/${id}`);
    return res.data;
};

export const managerReply = async (id, text) => {
    const res = await http.post(`/api/tickets/manager/${id}/reply`, { text });
    return res.data;
};

export const managerUpdateStatus = async (id, status) => {
    const res = await http.patch(`/api/tickets/manager/${id}/status`, { status });
    return res.data;
};

export default {
    createTicket,
    getMyTickets,
    getTicketDetail,
    addReply,
    getAllTickets,
    getTicketStats,
    managerGetTicket,
    managerReply,
    managerUpdateStatus,
};
