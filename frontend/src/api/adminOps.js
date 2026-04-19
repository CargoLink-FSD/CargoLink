import { http } from './http';

export const getAdminVerificationQueue = async () => {
  const res = await http.get('/api/admin/verification-queue');
  const payload = res?.data || res || [];

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.queue)) return payload.queue;
  return [];
};

export const getAdminTicketDetail = async (ticketId) => {
  const res = await http.get(`/api/admin/tickets/${ticketId}`);
  return res.data;
};

export const replyAdminTicket = async (ticketId, text) => {
  const res = await http.post(`/api/admin/tickets/${ticketId}/reply`, { text });
  return res.data;
};

export const updateAdminTicketStatus = async (ticketId, status) => {
  const res = await http.patch(`/api/admin/tickets/${ticketId}/status`, { status });
  return res.data;
};

export const getAdminTrips = async (params = {}) => {
  const { status, search, transporterId, driverId, page = 1, limit = 20, sort = 'date' } = params;
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (search) query.set('search', search);
  if (transporterId) query.set('transporterId', transporterId);
  if (driverId) query.set('driverId', driverId);
  if (sort) query.set('sort', sort);
  query.set('page', String(page));
  query.set('limit', String(limit));

  const res = await http.get(`/api/admin/trips?${query.toString()}`);
  return res.data;
};

export const getAdminTripDetail = async (tripId) => {
  const res = await http.get(`/api/admin/trips/${tripId}`);
  return res.data;
};

export const getAdminPayments = async (params = {}) => {
  const { status, paymentType, search, page = 1, limit = 20, sort = 'date' } = params;
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (paymentType) query.set('paymentType', paymentType);
  if (search) query.set('search', search);
  if (sort) query.set('sort', sort);
  query.set('page', String(page));
  query.set('limit', String(limit));

  const res = await http.get(`/api/admin/payments?${query.toString()}`);
  return res.data;
};

export const getAdminPaymentDetail = async (paymentId) => {
  const res = await http.get(`/api/admin/payments/${paymentId}`);
  return res.data;
};

export const updateAdminCashoutStatus = async (cashoutId, payload) => {
  const res = await http.patch(`/api/admin/cashouts/${cashoutId}/status`, payload);
  return res.data;
};
