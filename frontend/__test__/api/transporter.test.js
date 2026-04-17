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
  acceptDriverRequest,
  getDriverRequests,
  getDriverSchedule,
  getDrivers,
  getTransporterProfile,
  rejectDriverRequest,
  removeDriver,
  updateTransporterPassword,
  updateTransporterProfile,
} from '../../src/api/transporter.js';

describe('api/transporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets and updates transporter profile/password', async () => {
    http.get.mockResolvedValue({ data: { companyName: 'CargoLink' } });
    http.put.mockResolvedValue({ data: { contact: '9999999999' } });
    http.patch.mockResolvedValue({ data: { ok: true } });

    await getTransporterProfile();
    await updateTransporterProfile('contact', '9999999999');
    await updateTransporterPassword('old', 'new');

    expect(http.get).toHaveBeenCalledWith('/api/transporters/profile');
    expect(http.put).toHaveBeenCalledWith('/api/transporters/profile', { contact: '9999999999' });
    expect(http.patch).toHaveBeenCalledWith('/api/transporters/password', {
      oldPassword: 'old',
      newPassword: 'new',
    });
  });

  it('covers driver management GET/POST/DELETE endpoints', async () => {
    http.get.mockResolvedValue({ data: [] });
    http.post.mockResolvedValue({ data: { ok: true } });
    http.del.mockResolvedValue({ success: true });

    await getDrivers();
    await getDriverRequests();
    await acceptDriverRequest('app-1');
    await rejectDriverRequest('app-1', 'Incomplete docs');
    const removed = await removeDriver('d1');

    expect(http.get).toHaveBeenCalledWith('/api/transporters/drivers');
    expect(http.get).toHaveBeenCalledWith('/api/transporters/driver-requests');
    expect(http.post).toHaveBeenCalledWith('/api/transporters/driver-requests/app-1/accept');
    expect(http.post).toHaveBeenCalledWith('/api/transporters/driver-requests/app-1/reject', {
      rejectionReason: 'Incomplete docs',
    });
    expect(http.del).toHaveBeenCalledWith('/api/transporters/drivers/d1');
    expect(removed).toEqual({ success: true });
  });

  it('builds driver schedule query params', async () => {
    http.get.mockResolvedValue({ data: [] });

    await getDriverSchedule('driver-1', '2026-01-01', '2026-01-31');

    expect(http.get).toHaveBeenCalledWith('/api/transporters/drivers/driver-1/schedule?startDate=2026-01-01&endDate=2026-01-31');
  });
});
