import http from './http.js';

export async function fetchChatHistory(orderId) {
  const response = await http.get(`/api/chat/orders/${orderId}`);
  return response.data || [];
}

export async function postChatMessage(orderId, message) {
  const response = await http.post(`/api/chat/orders/${orderId}`, {message});
  return response.data || response;
}