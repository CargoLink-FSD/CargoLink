import http from './http.js';

export async function fetchAvailableOrders() {
  const response = await http.get('/api/orders/available');
  return response.data || [];
}

export async function fetchMyBids() {
  const response = await http.get('/api/orders/my-bids');
  return response.data || [];
}

export async function submitBid(orderId, bidAmount, notes = '') {
  const response = await http.post(`/api/orders/${orderId}/bids`, {
    orderId,
    bidAmount,
    notes,
  });
  return response.data || response;
}

export async function withdrawBid(orderId, bidId) {
  const response = await http.del(`/api/orders/${orderId}/bids/${bidId}`);
  return response.data || response;
}

export async function getOrderBids(orderId) {
  const response = await http.get(`/api/orders/${orderId}/bids`);
  return response.data || [];
}
