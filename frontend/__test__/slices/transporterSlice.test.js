import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/transporter', () => ({
  getTransporterProfile: vi.fn(),
  updateTransporterProfile: vi.fn(),
  updateTransporterPassword: vi.fn(),
  getTransporterRatings: vi.fn(),
  uploadTransporterProfilePicture: vi.fn(),
}));

import * as transporterApi from '../../src/api/transporter';
import transporterReducer, {
  clearError,
  clearUpdateSuccess,
  fetchTransporterProfile,
  fetchTransporterRatings,
  resetTransporterState,
  updateTransporterField,
  updateTransporterPassword,
  uploadTransporterProfilePicture,
} from '../../src/store/slices/transporterSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { transporter: transporterReducer },
    preloadedState,
  });

describe('store/transporterSlice', () => {
  it('fetchTransporterProfile success stores profile', async () => {
    transporterApi.getTransporterProfile.mockResolvedValue({
      _id: 't1',
      name: 'Speedy Movers',
      email: 'speedy@example.com',
    });

    const store = makeStore();
    await store.dispatch(fetchTransporterProfile());

    const state = store.getState().transporter;
    expect(state.profile.name).toBe('Speedy Movers');
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchTransporterProfile failure stores error message', async () => {
    transporterApi.getTransporterProfile.mockRejectedValue(new Error('network-error'));

    const store = makeStore();
    await store.dispatch(fetchTransporterProfile());

    expect(store.getState().transporter.error).toBe('network-error');
    expect(store.getState().transporter.profile).toBeNull();
  });

  it('updateTransporterField patches profile and sets updateSuccess', async () => {
    transporterApi.updateTransporterProfile.mockResolvedValue({ ok: true });

    const store = makeStore({
      transporter: {
        profile: { _id: 't1', name: 'Old Name' },
        loading: false,
        error: null,
        updateSuccess: false,
        ratings: null,
        ratingsLoading: false,
        ratingsError: null,
      },
    });

    await store.dispatch(updateTransporterField({ fieldType: 'name', fieldValue: 'New Name' }));

    const state = store.getState().transporter;
    expect(state.profile.name).toBe('New Name');
    expect(state.updateSuccess).toBe(true);
  });

  it('updateTransporterPassword success sets updateSuccess=true', async () => {
    transporterApi.updateTransporterPassword.mockResolvedValue({ ok: true });

    const store = makeStore({
      transporter: {
        profile: { _id: 't1' },
        loading: false,
        error: null,
        updateSuccess: false,
        ratings: null,
        ratingsLoading: false,
        ratingsError: null,
      },
    });

    await store.dispatch(updateTransporterPassword({ oldPassword: 'old', newPassword: 'new' }));

    expect(store.getState().transporter.updateSuccess).toBe(true);
    expect(store.getState().transporter.loading).toBe(false);
  });

  it('fetchTransporterRatings success stores ratings payload', async () => {
    transporterApi.getTransporterRatings.mockResolvedValue({
      averageRating: 4.5,
      totalReviews: 20,
      reviews: [{ id: 'r1', rating: 5 }],
    });

    const store = makeStore();
    await store.dispatch(fetchTransporterRatings());

    const state = store.getState().transporter;
    expect(state.ratings.averageRating).toBe(4.5);
    expect(state.ratings.totalReviews).toBe(20);
    expect(state.ratingsLoading).toBe(false);
  });

  it('resetTransporterState restores initial state', () => {
    const store = makeStore({
      transporter: {
        profile: { _id: 't1', name: 'Speedy' },
        loading: false,
        error: 'some-error',
        updateSuccess: true,
        ratings: { averageRating: 4 },
        ratingsLoading: false,
        ratingsError: null,
      },
    });

    store.dispatch(resetTransporterState());

    const state = store.getState().transporter;
    expect(state.profile).toBeNull();
    expect(state.error).toBeNull();
    expect(state.updateSuccess).toBe(false);
    expect(state.ratings).toBeNull();
  });
});
