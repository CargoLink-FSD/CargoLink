import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/customer', () => ({
  getCustomerProfile: vi.fn(),
  updateCustomerProfile: vi.fn(),
  updateCustomerPassword: vi.fn(),
  addCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(),
  uploadCustomerProfilePicture: vi.fn(),
}));

import * as customerApi from '../../src/api/customer';
import customerReducer, {
  addCustomerAddress,
  fetchCustomerProfile,
  updateCustomerField,
  deleteCustomerAddress,
} from '../../src/store/slices/customerSlice';

const makeStore = (preloadedState) => configureStore({
  reducer: { customer: customerReducer },
  preloadedState,
});

describe('store/customerSlice', () => {
  it('fetchCustomerProfile stores profile and addresses from nested payload', async () => {
    customerApi.getCustomerProfile.mockResolvedValue({
      data: { _id: 'c1', name: 'Alice', addresses: [{ _id: 'a1' }] },
    });
    const store = makeStore();

    await store.dispatch(fetchCustomerProfile());

    expect(store.getState().customer.profile.name).toBe('Alice');
    expect(store.getState().customer.addresses).toEqual([{ _id: 'a1' }]);
  });

  it('updateCustomerField updates existing profile field', async () => {
    customerApi.updateCustomerProfile.mockResolvedValue({ ok: true });
    const store = makeStore({
      customer: {
        profile: { _id: 'c1', name: 'Alice' },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    });

    await store.dispatch(updateCustomerField({ fieldType: 'name', fieldValue: 'Bob' }));

    expect(store.getState().customer.profile.name).toBe('Bob');
    expect(store.getState().customer.updateSuccess).toBe(true);
  });

  it('add/delete address keeps addresses synced with profile', async () => {
    customerApi.addCustomerAddress.mockResolvedValue([{ _id: 'a1' }, { _id: 'a2' }]);
    customerApi.deleteCustomerAddress.mockResolvedValue([{ _id: 'a2' }]);

    const store = makeStore({
      customer: {
        profile: { _id: 'c1', addresses: [] },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    });

    await store.dispatch(addCustomerAddress({ city: 'Pune' }));
    expect(store.getState().customer.addresses).toEqual([{ _id: 'a1' }, { _id: 'a2' }]);

    await store.dispatch(deleteCustomerAddress('a1'));
    expect(store.getState().customer.addresses).toEqual([{ _id: 'a2' }]);
    expect(store.getState().customer.profile.addresses).toEqual([{ _id: 'a2' }]);
  });
});
