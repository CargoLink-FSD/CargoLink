import http from './http';

export async function pollNotifications() {
  const response = await http.get('/api/notifications/poll');
  return response.data || [];
}

export async function getUnreadCount() {
  const response = await http.get('/api/notifications/unread-count');
  return response.data?.unreadCount || 0;
}

export default {
  pollNotifications,
  getUnreadCount,
};
