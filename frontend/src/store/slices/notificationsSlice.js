import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as notificationsApi from '../../api/notifications';

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = item?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const pollNotifications = createAsyncThunk(
  'notifications/poll',
  async (_, { rejectWithValue }) => {
    try {
      const notifications = await notificationsApi.pollNotifications();
      return notifications;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  unreadCount: 0,
  lastReceivedAt: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    receiveRealtimeNotification: (state, action) => {
      const incoming = action.payload;
      if (!incoming?.id) return;

      const exists = state.items.some((item) => item.id === incoming.id);
      if (exists) return;

      state.items.unshift({ ...incoming, unread: true });
      state.unreadCount += 1;
      state.lastReceivedAt = incoming.createdAt || new Date().toISOString();
    },
    markNotificationRead: (state, action) => {
      const notificationId = action.payload;
      const item = state.items.find((n) => n.id === notificationId);
      if (!item || item.unread === false) return;
      item.unread = false;
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    markAllNotificationsRead: (state) => {
      state.items = state.items.map((n) => ({ ...n, unread: false }));
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.error = null;
      state.lastReceivedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(pollNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pollNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const incoming = Array.isArray(action.payload) ? action.payload : [];
        const normalized = incoming.map((item) => ({ ...item, unread: true }));
        state.items = dedupeById([...normalized, ...state.items]);
        state.unreadCount = state.items.filter((n) => n.unread).length;
        state.lastReceivedAt = new Date().toISOString();
      })
      .addCase(pollNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch notifications';
      });
  },
});

export const {
  receiveRealtimeNotification,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
} = notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;

export default notificationsSlice.reducer;
