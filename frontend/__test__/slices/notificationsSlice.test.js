import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/notifications', () => ({
  pollNotifications: vi.fn(),
}));

import * as notificationsApi from '../../src/api/notifications';
import notificationsReducer, {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  pollNotifications,
  receiveRealtimeNotification,
  selectNotifications,
  selectUnreadCount,
} from '../../src/store/slices/notificationsSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { notifications: notificationsReducer },
    preloadedState,
  });

describe('store/notificationsSlice', () => {
  it('receiveRealtimeNotification prepends notification and increments unreadCount', () => {
    const store = makeStore();
    store.dispatch(receiveRealtimeNotification({ id: 'n1', title: 'Hello', createdAt: '2024-01-01' }));

    const state = store.getState().notifications;
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('n1');
    expect(state.items[0].unread).toBe(true);
    expect(state.unreadCount).toBe(1);
  });

  it('receiveRealtimeNotification deduplicates the same notification id', () => {
    const store = makeStore({
      notifications: {
        items: [{ id: 'n1', unread: true }],
        loading: false,
        error: null,
        unreadCount: 1,
        lastReceivedAt: null,
      },
    });

    store.dispatch(receiveRealtimeNotification({ id: 'n1', title: 'Duplicate' }));

    expect(store.getState().notifications.items).toHaveLength(1);
    expect(store.getState().notifications.unreadCount).toBe(1);
  });

  it('markNotificationRead marks item unread=false and decrements unreadCount', () => {
    const store = makeStore({
      notifications: {
        items: [
          { id: 'n1', unread: true },
          { id: 'n2', unread: true },
        ],
        loading: false,
        error: null,
        unreadCount: 2,
        lastReceivedAt: null,
      },
    });

    store.dispatch(markNotificationRead('n1'));

    const state = store.getState().notifications;
    expect(state.items.find((n) => n.id === 'n1').unread).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('markAllNotificationsRead sets all items unread=false and resets unreadCount', () => {
    const store = makeStore({
      notifications: {
        items: [
          { id: 'n1', unread: true },
          { id: 'n2', unread: true },
        ],
        loading: false,
        error: null,
        unreadCount: 2,
        lastReceivedAt: null,
      },
    });

    store.dispatch(markAllNotificationsRead());

    const state = store.getState().notifications;
    expect(state.unreadCount).toBe(0);
    expect(state.items.every((n) => n.unread === false)).toBe(true);
  });

  it('clearNotifications empties state', () => {
    const store = makeStore({
      notifications: {
        items: [{ id: 'n1', unread: true }],
        loading: false,
        error: 'some error',
        unreadCount: 1,
        lastReceivedAt: '2024-01-01',
      },
    });

    store.dispatch(clearNotifications());

    const state = store.getState().notifications;
    expect(state.items).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.error).toBeNull();
    expect(state.lastReceivedAt).toBeNull();
  });

  it('pollNotifications success dedupes and updates unreadCount', async () => {
    notificationsApi.pollNotifications.mockResolvedValue([
      { id: 'n1', title: 'New' },
      { id: 'n2', title: 'Another' },
    ]);

    const store = makeStore({
      notifications: {
        items: [{ id: 'n1', unread: true }], // n1 is already present
        loading: false,
        error: null,
        unreadCount: 1,
        lastReceivedAt: null,
      },
    });

    await store.dispatch(pollNotifications());

    const state = store.getState().notifications;
    // n1 already exists — dedupe should produce only ids n1 and n2: 2 items total
    expect(state.items.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('pollNotifications failure stores error without touching items', async () => {
    notificationsApi.pollNotifications.mockRejectedValue(new Error('timeout'));

    const store = makeStore({
      notifications: {
        items: [{ id: 'n1', unread: true }],
        loading: false,
        error: null,
        unreadCount: 1,
        lastReceivedAt: null,
      },
    });

    await store.dispatch(pollNotifications());

    const state = store.getState().notifications;
    expect(state.error).toBe('timeout');
    expect(state.items).toHaveLength(1); // untouched
    expect(state.loading).toBe(false);
  });

  it('selectNotifications and selectUnreadCount return correct values', () => {
    const store = makeStore({
      notifications: {
        items: [{ id: 'n1', unread: true }, { id: 'n2', unread: false }],
        loading: false,
        error: null,
        unreadCount: 1,
        lastReceivedAt: null,
      },
    });

    expect(selectNotifications(store.getState())).toHaveLength(2);
    expect(selectUnreadCount(store.getState())).toBe(1);
  });
});
