import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/driver', () => ({
  getDriverProfile: vi.fn(),
  updateDriverProfile: vi.fn(),
  updateDriverPassword: vi.fn(),
  uploadDriverProfilePicture: vi.fn(),
}));

import * as driverApi from '../../src/api/driver';
import driverReducer, {
  clearError,
  clearUpdateSuccess,
  fetchDriverProfile,
  updateDriverField,
  updateDriverPassword,
  uploadDriverProfilePicture,
} from '../../src/store/slices/driverSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { driver: driverReducer },
    preloadedState,
  });

describe('store/driverSlice', () => {
  it('fetchDriverProfile success stores profile', async () => {
    driverApi.getDriverProfile.mockResolvedValue({
      data: { _id: 'd1', firstName: 'Ravi', email: 'ravi@example.com' },
    });

    const store = makeStore();
    await store.dispatch(fetchDriverProfile());

    const state = store.getState().driver;
    expect(state.profile.firstName).toBe('Ravi');
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchDriverProfile failure stores error', async () => {
    driverApi.getDriverProfile.mockRejectedValue({ message: 'unauthorized' });

    const store = makeStore();
    await store.dispatch(fetchDriverProfile());

    expect(store.getState().driver.profile).toBeNull();
    // rejectWithValue receives error.response?.data || error.message
    // here error object is { message: 'unauthorized' }, no response key
    expect(store.getState().driver.error).toBeTruthy();
  });

  it('updateDriverField success patches profile field and sets updateSuccess', async () => {
    driverApi.updateDriverProfile.mockResolvedValue({ ok: true });

    const store = makeStore({
      driver: {
        profile: { _id: 'd1', firstName: 'Ravi' },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    });

    await store.dispatch(updateDriverField({ fieldType: 'firstName', fieldValue: 'Karan' }));

    const state = store.getState().driver;
    expect(state.profile.firstName).toBe('Karan');
    expect(state.updateSuccess).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('updateDriverPassword success sets updateSuccess=true', async () => {
    driverApi.updateDriverPassword.mockResolvedValue({ ok: true });

    const store = makeStore({
      driver: {
        profile: { _id: 'd1' },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    });

    await store.dispatch(updateDriverPassword({ oldPassword: 'old', newPassword: 'new' }));

    expect(store.getState().driver.updateSuccess).toBe(true);
  });

  it('uploadDriverProfilePicture success updates profileImage', async () => {
    driverApi.uploadDriverProfilePicture.mockResolvedValue({
      data: { profileImage: 'https://cdn.example.com/img.jpg' },
    });

    const store = makeStore({
      driver: {
        profile: { _id: 'd1', firstName: 'Ravi', profileImage: null },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    });

    await store.dispatch(uploadDriverProfilePicture(new File([], 'avatar.jpg')));

    const state = store.getState().driver;
    expect(state.profile.profileImage).toBe('https://cdn.example.com/img.jpg');
    expect(state.updateSuccess).toBe(true);
  });

  it('clearError resets error to null', () => {
    const store = makeStore({
      driver: {
        profile: null,
        addresses: [],
        loading: false,
        error: 'something went wrong',
        updateSuccess: false,
      },
    });

    store.dispatch(clearError());

    expect(store.getState().driver.error).toBeNull();
  });

  it('clearUpdateSuccess resets updateSuccess to false', () => {
    const store = makeStore({
      driver: {
        profile: null,
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: true,
      },
    });

    store.dispatch(clearUpdateSuccess());

    expect(store.getState().driver.updateSuccess).toBe(false);
  });
});
