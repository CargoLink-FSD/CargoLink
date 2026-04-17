import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/http', () => ({
  http: {
    post: vi.fn(),
  },
}));

vi.mock('../../src/utils/token', () => ({
  default: {
    getRefreshToken: vi.fn(),
  },
}));

import { http } from '../../src/api/http';
import tokenStorage from '../../src/utils/token';
import { login, logout, refreshToken, signup } from '../../src/api/auth.js';

describe('api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login posts credentials and returns nested data', async () => {
    http.post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r' } });

    const result = await login({ email: 'u@example.com', password: 'Pass1', role: 'customer' });

    expect(http.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'u@example.com',
      password: 'Pass1',
      role: 'customer',
    });
    expect(result.accessToken).toBe('a');
  });

  it('signup adds verification header when provided', async () => {
    http.post.mockResolvedValue({ data: { accessToken: 'a' } });

    await signup({
      signupData: { email: 'x@example.com' },
      userType: 'customer',
      signupVerificationToken: 'verify-token',
    });

    expect(http.post).toHaveBeenCalledWith(
      '/api/customers/register',
      { email: 'x@example.com' },
      { headers: { 'x-signup-verification-token': 'verify-token' } },
    );
  });

  it('logout sends refresh token from token storage', async () => {
    tokenStorage.getRefreshToken.mockReturnValue('refresh-123');
    http.post.mockResolvedValue({ success: true });

    await logout();

    expect(http.post).toHaveBeenCalledWith('/api/auth/logout', { refreshToken: 'refresh-123' });
  });

  it('refreshToken posts with token storage value and returns data', async () => {
    tokenStorage.getRefreshToken.mockReturnValue('refresh-xyz');
    http.post.mockResolvedValue({ data: { accessToken: 'new-access' } });

    const result = await refreshToken();

    expect(http.post).toHaveBeenCalledWith('/api/auth/refresh-token', { refreshToken: 'refresh-xyz' });
    expect(result.accessToken).toBe('new-access');
  });
});
