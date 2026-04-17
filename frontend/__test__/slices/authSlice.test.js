import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/auth', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
}));

vi.mock('../../src/utils/token', () => ({
  default: {
    getUserFromToken: vi.fn(),
    getAccessToken: vi.fn(),
    isTokenExpired: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

import * as authApi from '../../src/api/auth';
import tokenStorage from '../../src/utils/token';
import authReducer, {
  loginUser,
  logoutUser,
  refreshAccessToken,
  restoreSession,
  signupUser,
} from '../../src/store/slices/authSlice';

const makeStore = () => configureStore({ reducer: { auth: authReducer } });

describe('store/authSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.getAccessToken.mockReturnValue(null);
    tokenStorage.getUserFromToken.mockReturnValue(null);
    tokenStorage.isTokenExpired.mockReturnValue(true);
  });

  it('login success stores tokens and authenticates', async () => {
    authApi.login.mockResolvedValue({ accessToken: 'a1', refreshToken: 'r1' });
    tokenStorage.getUserFromToken.mockReturnValue({ id: 'u1', role: 'customer' });

    const store = makeStore();
    await store.dispatch(loginUser({ email: 'a@a.com', password: 'x', role: 'customer' }));

    const state = store.getState().auth;
    expect(tokenStorage.setTokens).toHaveBeenCalledWith('a1', 'r1');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'u1', role: 'customer' });
  });

  it('login with requires2FA does not authenticate yet', async () => {
    authApi.login.mockResolvedValue({ requires2FA: true });

    const store = makeStore();
    await store.dispatch(loginUser({ email: 'a@a.com', password: 'x', role: 'customer' }));

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(tokenStorage.setTokens).not.toHaveBeenCalled();
  });

  it('signup failure stores error and clears tokens', async () => {
    authApi.signup.mockRejectedValue(new Error('signup-failed'));

    const store = makeStore();
    await store.dispatch(signupUser({ signupData: { email: 'x' }, userType: 'customer' }));

    expect(store.getState().auth.error).toBe('signup-failed');
    expect(tokenStorage.clearTokens).toHaveBeenCalled();
  });

  it('logout always clears auth state and tokens', async () => {
    authApi.logout.mockResolvedValue(null);
    const store = makeStore();

    await store.dispatch(logoutUser());

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(tokenStorage.clearTokens).toHaveBeenCalled();
  });

  it('refresh token success updates user and auth flag', async () => {
    authApi.refreshToken.mockResolvedValue({ accessToken: 'newA', refreshToken: 'newR' });
    tokenStorage.getUserFromToken.mockReturnValue({ id: 'u1', role: 'driver' });

    const store = makeStore();
    await store.dispatch(refreshAccessToken());

    expect(tokenStorage.setTokens).toHaveBeenCalledWith('newA', 'newR');
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it('restoreSession clears invalid tokens', () => {
    tokenStorage.getUserFromToken.mockReturnValue({ id: 'u1' });
    tokenStorage.getAccessToken.mockReturnValue('expired');
    tokenStorage.isTokenExpired.mockReturnValue(true);

    const store = makeStore();
    store.dispatch(restoreSession());

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(tokenStorage.clearTokens).toHaveBeenCalled();
  });
});
