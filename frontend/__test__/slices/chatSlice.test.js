import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/chat', () => ({
  fetchChatHistory: vi.fn(),
  postChatMessage: vi.fn(),
}));

import * as chatApi from '../../src/api/chat';
import chatReducer, {
  clearChat,
  clearChatError,
  fetchChatMessages,
  sendChatMessage,
} from '../../src/store/slices/chatSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { chat: chatReducer },
    preloadedState,
  });

describe('store/chatSlice', () => {
  it('fetchChatMessages success stores messages and sets lastFetched', async () => {
    chatApi.fetchChatHistory.mockResolvedValue([
      { id: 'm1', content: 'Hello', senderType: 'customer' },
      { id: 'm2', content: 'Hi', senderType: 'transporter' },
    ]);

    const store = makeStore();
    await store.dispatch(fetchChatMessages('order-123'));

    const state = store.getState().chat;
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].id).toBe('m1');
    expect(state.loading).toBe(false);
    expect(state.lastFetched).not.toBeNull();
  });

  it('fetchChatMessages failure stores error', async () => {
    chatApi.fetchChatHistory.mockRejectedValue(new Error('chat-load-failed'));

    const store = makeStore();
    await store.dispatch(fetchChatMessages('order-123'));

    expect(store.getState().chat.error).toBe('chat-load-failed');
    expect(store.getState().chat.messages).toEqual([]);
  });

  it('sendChatMessage optimistically adds a temp message while pending', async () => {
    // Use a controlled promise so we can check the pending state
    let resolve;
    chatApi.postChatMessage.mockReturnValue(new Promise((res) => { resolve = res; }));

    const store = makeStore({
      chat: { messages: [], loading: false, error: null, lastFetched: null },
    });

    const dispatchPromise = store.dispatch(
      sendChatMessage({ orderId: 'o1', message: 'On my way!', userType: 'driver' })
    );

    // While still pending, a temp message should have been added
    expect(store.getState().chat.messages).toHaveLength(1);
    expect(store.getState().chat.messages[0].content).toBe('On my way!');
    expect(store.getState().chat.messages[0].id).toMatch(/^temp-/);

    resolve({ data: { id: 'm-real' } });
    await dispatchPromise;
  });

  it('sendChatMessage rejected removes all temp messages', async () => {
    chatApi.postChatMessage.mockRejectedValue(new Error('send-failed'));

    const store = makeStore({
      chat: {
        messages: [{ id: 'real-1', content: 'Existing', senderType: 'customer' }],
        loading: false,
        error: null,
        lastFetched: null,
      },
    });

    await store.dispatch(
      sendChatMessage({ orderId: 'o1', message: 'Failed msg', userType: 'customer' })
    );

    const state = store.getState().chat;
    // Only the pre-existing, non-temp message should remain
    expect(state.messages.every((m) => !String(m.id).startsWith('temp-'))).toBe(true);
    expect(state.error).toBe('send-failed');
  });

  it('clearChat resets messages, error and lastFetched', () => {
    const store = makeStore({
      chat: {
        messages: [{ id: 'm1' }],
        loading: false,
        error: 'some-error',
        lastFetched: 12345,
      },
    });

    store.dispatch(clearChat());

    const state = store.getState().chat;
    expect(state.messages).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.lastFetched).toBeNull();
  });
});
