import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/transporterOrders', () => ({
  getTransporterOrders: vi.fn(),
  getAvailableOrders: vi.fn(),
  getTransporterOrderDetails: vi.fn(),
  submitBid: vi.fn(),
  withdrawBid: vi.fn(),
  getTransporterBids: vi.fn(),
}));

import * as transporterOrdersApi from '../../src/api/transporterOrders';
import transporterOrdersReducer, {
  clearCurrentOrder,
  clearError,
  fetchAvailableOrders,
  fetchTransporterBids,
  fetchTransporterOrderDetails,
  fetchTransporterOrders,
  selectAllTransporterOrders,
  selectAvailableOrders,
  selectCurrentTransporterOrder,
  selectTransporterBids,
} from '../../src/store/slices/transporterOrdersSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { transporterOrders: transporterOrdersReducer },
    preloadedState,
  });

describe('store/transporterOrdersSlice', () => {
  it('fetchTransporterOrders success stores orders array', async () => {
    transporterOrdersApi.getTransporterOrders.mockResolvedValue([
      { _id: 'o1', status: 'Assigned' },
      { _id: 'o2', status: 'Completed' },
    ]);

    const store = makeStore();
    await store.dispatch(fetchTransporterOrders({ search: '', status: 'all' }));

    const state = store.getState().transporterOrders;
    expect(state.orders).toHaveLength(2);
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('fetchTransporterOrders failure stores error and clears orders', async () => {
    transporterOrdersApi.getTransporterOrders.mockRejectedValue(new Error('orders-fetch-fail'));

    const store = makeStore();
    await store.dispatch(fetchTransporterOrders());

    const state = store.getState().transporterOrders;
    expect(state.error).toBe('orders-fetch-fail');
    expect(state.orders).toEqual([]);
  });

  it('fetchAvailableOrders success populates available orders', async () => {
    transporterOrdersApi.getAvailableOrders.mockResolvedValue([
      { _id: 'a1', status: 'Placed' },
    ]);

    const store = makeStore();
    await store.dispatch(fetchAvailableOrders());

    expect(store.getState().transporterOrders.availableOrders).toHaveLength(1);
  });

  it('fetchTransporterOrderDetails success sets currentOrder', async () => {
    transporterOrdersApi.getTransporterOrderDetails.mockResolvedValue({
      _id: 'o1',
      status: 'Assigned',
      pickup: { city: 'Mumbai' },
    });

    const store = makeStore();
    await store.dispatch(fetchTransporterOrderDetails('o1'));

    const state = store.getState().transporterOrders;
    expect(state.currentOrder._id).toBe('o1');
    expect(state.loading).toBe(false);
  });

  it('clearCurrentOrder and clearError work as synchronous reducers', () => {
    const store = makeStore({
      transporterOrders: {
        orders: [],
        availableOrders: [],
        currentOrder: { _id: 'o1' },
        bids: [],
        loading: false,
        error: 'some-error',
      },
    });

    store.dispatch(clearCurrentOrder());
    expect(store.getState().transporterOrders.currentOrder).toBeNull();

    store.dispatch(clearError());
    expect(store.getState().transporterOrders.error).toBeNull();
  });
});
