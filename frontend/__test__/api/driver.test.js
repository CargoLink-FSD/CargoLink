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
  addScheduleBlock,
  applyToTransporter,
  getApplications,
  getDriverProfile,
  getDriverSchedule,
  removeScheduleBlock,
  uploadDriverDocuments,
  updateDriverPassword,
  updateDriverProfile,
  withdrawApplication,
} from '../../src/api/driver.js';

describe('api/driver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets and updates profile/password', async () => {
    http.get.mockResolvedValue({ data: { name: 'Driver 1' } });
    http.put.mockResolvedValue({ data: { phone: '9999999999' } });
    http.patch.mockResolvedValue({ data: { ok: true } });

    await getDriverProfile();
    await updateDriverProfile('phone', '9999999999');
    await updateDriverPassword('old', 'new');

    expect(http.get).toHaveBeenCalledWith('/api/drivers/profile');
    expect(http.put).toHaveBeenCalledWith('/api/drivers/profile', { phone: '9999999999' });
    expect(http.patch).toHaveBeenCalledWith('/api/drivers/password', {
      oldPassword: 'old',
      newPassword: 'new',
    });
  });

  it('builds schedule and block endpoints', async () => {
    http.get.mockResolvedValue({ data: [] });
    http.post.mockResolvedValue({ data: { _id: 'b1' } });
    http.del.mockResolvedValue({ success: true });

    await getDriverSchedule('2026-01-01', '2026-01-31');
    await addScheduleBlock({ start: '2026-01-10', end: '2026-01-11' });
    const removed = await removeScheduleBlock('block-1');

    expect(http.get).toHaveBeenCalledWith('/api/drivers/schedule?startDate=2026-01-01&endDate=2026-01-31');
    expect(http.post).toHaveBeenCalledWith('/api/drivers/schedule/block', { start: '2026-01-10', end: '2026-01-11' });
    expect(http.del).toHaveBeenCalledWith('/api/drivers/schedule/block/block-1');
    expect(removed).toEqual({ success: true });
  });

  it('handles transporter applications and document upload', async () => {
    http.post.mockResolvedValue({ data: { ok: true } });
    http.get.mockResolvedValue({ data: [{ _id: 'app1' }] });
    http.del.mockResolvedValue({ success: true });

    await applyToTransporter('t1', 'Please accept me');
    await getApplications();
    const response = await withdrawApplication('app1');

    const formData = new FormData();
    formData.append('license', new Blob(['x'], { type: 'text/plain' }), 'license.txt');
    await uploadDriverDocuments(formData);

    expect(http.post).toHaveBeenCalledWith('/api/drivers/apply/t1', { message: 'Please accept me' });
    expect(http.get).toHaveBeenCalledWith('/api/drivers/applications');
    expect(http.del).toHaveBeenCalledWith('/api/drivers/application/app1');
    expect(http.post).toHaveBeenCalledWith('/api/drivers/documents', formData);
    expect(response).toEqual({ success: true });
  });
});
