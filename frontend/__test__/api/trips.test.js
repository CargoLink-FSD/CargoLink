import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

import { http } from '../../src/api/http';
import {
  confirmPickup,
  createTrip,
  deleteTrip,
  getDriverTrips,
  getOrderTracking,
  getTrips,
  updateTrip,
  updateTripLocation,
} from '../../src/api/trips.js';

describe('api/trips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTrips appends query params', async () => {
    http.get.mockResolvedValue({ data: [] });

    await getTrips({ status: 'planned', page: 2 });

    expect(http.get).toHaveBeenCalledWith('/api/trips?status=planned&page=2');
  });

  it('createTrip posts trip payload', async () => {
    http.post.mockResolvedValue({ data: { _id: 't1' } });

    const result = await createTrip({ name: 'Trip A' });

    expect(http.post).toHaveBeenCalledWith('/api/trips', { name: 'Trip A' });
    expect(result._id).toBe('t1');
  });

  it('updateTrip uses PUT endpoint', async () => {
    http.put.mockResolvedValue({ data: { updated: true } });

    const result = await updateTrip('t1', { status: 'in_progress' });

    expect(http.put).toHaveBeenCalledWith('/api/trips/t1', { status: 'in_progress' });
    expect(result.updated).toBe(true);
  });

  it('deleteTrip returns raw response', async () => {
    http.del.mockResolvedValue({ success: true });

    const result = await deleteTrip('t1');

    expect(http.del).toHaveBeenCalledWith('/api/trips/t1');
    expect(result).toEqual({ success: true });
  });

  it('driver endpoints build query and post payload correctly', async () => {
    http.get.mockResolvedValue({ data: [] });
    http.post.mockResolvedValue({ data: { ok: true } });

    await getDriverTrips({ status: 'active' });
    await confirmPickup('t1', 's1', '123456');
    await updateTripLocation('t1', [72.8, 19.0]);

    expect(http.get).toHaveBeenCalledWith('/api/trips/driver/my-trips?status=active');
    expect(http.post).toHaveBeenCalledWith('/api/trips/driver/t1/stops/s1/confirm-pickup', { otp: '123456' });
    expect(http.post).toHaveBeenCalledWith('/api/trips/driver/t1/location', { coordinates: [72.8, 19.0] });
  });

  it('order tracking uses customer tracking endpoint', async () => {
    http.get.mockResolvedValue({ data: { tripStatus: 'en_route' } });

    const result = await getOrderTracking('o1');

    expect(http.get).toHaveBeenCalledWith('/api/trips/track/o1');
    expect(result.tripStatus).toBe('en_route');
  });
});
