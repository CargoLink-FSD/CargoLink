import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/bids', () => ({
  fetchAvailableOrders: vi.fn(),
  fetchMyBids: vi.fn(),
  submitBid: vi.fn(),
  withdrawBid: vi.fn(),
}));

import * as bidsApi from '../../src/api/bids';
import bidsReducer, {
  clearBids,
  fetchAvailableOrders,
  fetchMyBids,
  submitBid,
  withdrawBid,
} from '../../src/store/slices/bidsSlice';

const makeStore = (preloadedState) => configureStore({
  reducer: { bids: bidsReducer },
  preloadedState,
});

describe('store/bidsSlice', () => {
  it('fetchAvailableOrders stores data on success', async () => {
    bidsApi.fetchAvailableOrders.mockResolvedValue([{ _id: 'o1' }]);
    const store = makeStore();

    await store.dispatch(fetchAvailableOrders());

    expect(store.getState().bids.availableOrders).toEqual([{ _id: 'o1' }]);
    expect(store.getState().bids.error).toBeNull();
  });

  it('fetchMyBids stores rejection message on failure', async () => {
    bidsApi.fetchMyBids.mockRejectedValue(new Error('failed-to-fetch-bids'));
    const store = makeStore();

    await store.dispatch(fetchMyBids());

    expect(store.getState().bids.error).toBe('failed-to-fetch-bids');
  });

  it('submitBid marks matched order as already bid', async () => {
    bidsApi.submitBid.mockResolvedValue({ id: 'b1' });
    const store = makeStore({
      bids: {
        availableOrders: [{ _id: 'o1', already_bid: false }],
        myBids: [],
        orderBids: {},
        loading: false,
        error: null,
        submitting: false,
      },
    });

    await store.dispatch(submitBid({ orderId: 'o1', bidAmount: 5000, notes: 'quick' }));

    expect(store.getState().bids.availableOrders[0].already_bid).toBe(true);
  });

  it('withdrawBid removes bid from myBids by id', async () => {
    bidsApi.withdrawBid.mockResolvedValue({ ok: true });
    const store = makeStore({
      bids: {
        availableOrders: [],
        myBids: [{ id: 'b1' }, { id: 'b2' }],
        orderBids: {},
        loading: false,
        error: null,
        submitting: false,
      },
    });

    await store.dispatch(withdrawBid({ orderId: 'o1', bidId: 'b1' }));

    expect(store.getState().bids.myBids).toEqual([{ id: 'b2' }]);
  });

  it('clearBids resets bid collections', () => {
    const store = makeStore({
      bids: {
        availableOrders: [{ _id: 'o1' }],
        myBids: [{ id: 'b1' }],
        orderBids: { o1: [{ id: 'b1' }] },
        loading: false,
        error: 'x',
        submitting: false,
      },
    });

    store.dispatch(clearBids());

    expect(store.getState().bids.availableOrders).toEqual([]);
    expect(store.getState().bids.myBids).toEqual([]);
    expect(store.getState().bids.orderBids).toEqual({});
    expect(store.getState().bids.error).toBeNull();
  });
});
