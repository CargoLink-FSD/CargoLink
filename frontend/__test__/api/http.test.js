import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/token', () => ({
  default: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

vi.mock('../../src/utils/tokenRefresh', () => ({
  handleTokenRefresh: vi.fn(),
}));

import tokenStorage from '../../src/utils/token';
import { handleTokenRefresh } from '../../src/utils/tokenRefresh';
import { http } from '../../src/api/http';

const mockJsonResponse = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  json: vi.fn().mockResolvedValue(payload),
});

describe('api/http', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    tokenStorage.getAccessToken.mockReturnValue('token-123');
  });

  it('adds auth header and json content-type for json requests', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse(200, { success: true, data: { value: 1 } }));

    const result = await http.post('/api/orders/estimate-price', { distance: 10 });

    expect(result.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/orders/estimate-price',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('does not force json content-type for form-data requests', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse(200, { success: true }));
    const formData = new FormData();
    formData.append('file', new Blob(['x'], { type: 'text/plain' }), 'x.txt');

    await http.post('/api/orders', formData);

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.body).toBe(formData);
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('refreshes token and retries once on 401 for non-auth endpoints', async () => {
    handleTokenRefresh.mockResolvedValue('new-token');
    globalThis.fetch
      .mockResolvedValueOnce(mockJsonResponse(401, { message: 'Expired' }))
      .mockResolvedValueOnce(mockJsonResponse(200, { success: true, data: { ok: true } }));

    const result = await http.get('/api/orders/my-orders');

    expect(handleTokenRefresh).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(result.data.ok).toBe(true);
  });

  it('does not try token refresh for auth/login endpoint on 401', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse(401, { message: 'Unauthorized' }));

    await expect(http.post('/api/auth/login', { email: 'a@b.com' })).rejects.toMatchObject({ status: 401 });
    expect(handleTokenRefresh).not.toHaveBeenCalled();
  });

  it('throws normalized error with status and payload on failed request', async () => {
    globalThis.fetch.mockResolvedValueOnce(mockJsonResponse(409, { message: 'Duplicate' }));

    await expect(http.get('/api/customers/profile')).rejects.toMatchObject({
      message: 'Duplicate',
      status: 409,
      payload: { message: 'Duplicate' },
    });
  });
});
