import http from './http.js';

export async function fetchChatHistory(orderId) {
  const response = await http.get(`/api/chat/orders/${orderId}`);
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.messages)) {
    return response.messages;
  }

  if (Array.isArray(response?.data?.messages)) {
    return response.data.messages;
  }

  return [];
}

export async function postChatMessage(orderId, message) {
  const response = await http.post(`/api/chat/orders/${orderId}`, {message});
  return response.data || response;
}