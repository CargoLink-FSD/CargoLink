import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/orders', () => ({
  getCustomerOrders: vi.fn(),
  getOrderDetails: vi.fn(),
  deleteOrder: vi.fn(),
  getOrderBids: vi.fn(),
  acceptBid: vi.fn(),
  rejectBid: vi.fn(),
  placeOrder: vi.fn(),
}));

import * as ordersApi from '../../src/api/orders';
import ordersReducer, {
  deleteCustomerOrder,
  fetchCustomerOrders,
  selectFilteredOrders,
  setSearchTerm,
  setStatusFilter,
} from '../../src/store/slices/ordersSlice';

const createStore = (preloadedState) => configureStore({
  reducer: { orders: ordersReducer },
  preloadedState,
});

describe('store/ordersSlice', () => {
  it('fetchCustomerOrders success updates orders and clears error', async () => {
    ordersApi.getCustomerOrders.mockResolvedValue([{ _id: 'o1', pickup: { city: 'Mumbai' }, delivery: { city: 'Pune' }, status: 'Placed' }]);
    const store = createStore();

    await store.dispatch(fetchCustomerOrders({ search: '', status: 'all' }));

    const state = store.getState().orders;
    expect(state.orders).toHaveLength(1);
    expect(state.error).toBeNull();
  });

  it('fetchCustomerOrders failure sets error', async () => {
    ordersApi.getCustomerOrders.mockRejectedValue(new Error('network-fail'));
    const store = createStore();

    await store.dispatch(fetchCustomerOrders());

    expect(store.getState().orders.error).toBe('network-fail');
  });

  it('deleteCustomerOrder removes order from state when fulfilled', async () => {
    const store = createStore({
      orders: {
        orders: [{ _id: 'o1' }, { _id: 'o2' }],
        currentOrder: null,
        orderBids: {},
        loading: false,
        error: null,
        filters: { searchTerm: '', statusFilter: 'all' },
      },
    });

    store.dispatch(deleteCustomerOrder.fulfilled({ orderId: 'o1' }, 'req-1', { orderId: 'o1' }));

    expect(store.getState().orders.orders).toEqual([{ _id: 'o2' }]);
  });

  it('selectFilteredOrders applies search and status filters', () => {
    const baseState = {
      orders: {
        orders: [
          { _id: 'o1', pickup: { city: 'Mumbai' }, delivery: { city: 'Pune' }, status: 'Placed' },
          { _id: 'o2', pickup: { city: 'Delhi' }, delivery: { city: 'Jaipur' }, status: 'Assigned' },
        ],
        currentOrder: null,
        orderBids: {},
        loading: false,
        error: null,
        filters: { searchTerm: '', statusFilter: 'all' },
      },
    };

    const store = createStore(baseState);
    store.dispatch(setSearchTerm('delhi'));
    store.dispatch(setStatusFilter('Assigned'));

    const filtered = selectFilteredOrders(store.getState());
    expect(filtered).toHaveLength(1);
    expect(filtered[0]._id).toBe('o2');
  });
});
