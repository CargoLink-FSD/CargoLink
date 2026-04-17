import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

import { http } from '../../src/api/http';
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerDashboardStats,
  getCustomerProfile,
  updateCustomerPassword,
  updateCustomerProfile,
  uploadCustomerProfilePicture,
} from '../../src/api/customer.js';

describe('api/customer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches profile and dashboard stats', async () => {
    http.get
      .mockResolvedValueOnce({ data: { name: 'Customer 1' } })
      .mockResolvedValueOnce({ data: { activeOrders: 3 } });

    const profile = await getCustomerProfile();
    const stats = await getCustomerDashboardStats();

    expect(http.get).toHaveBeenCalledWith('/api/customers/profile');
    expect(http.get).toHaveBeenCalledWith('/api/customers/dashboard-stats');
    expect(profile.name).toBe('Customer 1');
    expect(stats.activeOrders).toBe(3);
  });

  it('updates profile and password via PUT/PATCH', async () => {
    http.put.mockResolvedValue({ data: { phone: '9999999999' } });
    http.patch.mockResolvedValue({ data: { ok: true } });

    await updateCustomerProfile('phone', '9999999999');
    await updateCustomerPassword('old123', 'new123');

    expect(http.put).toHaveBeenCalledWith('/api/customers/profile', { phone: '9999999999' });
    expect(http.patch).toHaveBeenCalledWith('/api/customers/password', {
      oldPassword: 'old123',
      newPassword: 'new123',
    });
  });

  it('uploads profile picture as FormData', async () => {
    http.put.mockResolvedValue({ data: { profilePicture: 'url' } });

    const file = new Blob(['image-bytes'], { type: 'image/png' });
    await uploadCustomerProfilePicture(file);

    const [, body] = http.put.mock.calls[0];
    expect(http.put).toHaveBeenCalledWith('/api/customers/profile', expect.any(FormData));
    expect(body.get('profilePicture')).toBeTruthy();
  });

  it('manages customer addresses', async () => {
    http.get.mockResolvedValue({ data: [{ _id: 'a1' }] });
    http.post.mockResolvedValue({ data: [{ _id: 'a1' }, { _id: 'a2' }] });
    http.del.mockResolvedValue({ data: [{ _id: 'a2' }] });

    const addresses = await getCustomerAddresses();
    const added = await addCustomerAddress({ city: 'Pune' });
    const removed = await deleteCustomerAddress('a1');

    expect(http.get).toHaveBeenCalledWith('/api/customers/addresses');
    expect(http.post).toHaveBeenCalledWith('/api/customers/addresses', { city: 'Pune' });
    expect(http.del).toHaveBeenCalledWith('/api/customers/addresses/a1');
    expect(addresses).toEqual([{ _id: 'a1' }]);
    expect(added).toEqual([{ _id: 'a1' }, { _id: 'a2' }]);
    expect(removed).toEqual([{ _id: 'a2' }]);
  });
});
