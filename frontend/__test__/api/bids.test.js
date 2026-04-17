import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/http.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  },
}));

import http from '../../src/api/http.js';
import {
  fetchAvailableOrders,
  fetchMyBids,
  getOrderBids,
  submitBid,
  withdrawBid,
} from '../../src/api/bids.js';

describe('api/bids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches available orders list', async () => {
    http.get.mockResolvedValue({ data: [{ _id: 'o1' }] });

    const data = await fetchAvailableOrders();

    expect(http.get).toHaveBeenCalledWith('/api/orders/available');
    expect(data).toEqual([{ _id: 'o1' }]);
  });

  it('fetchMyBids returns fallback array', async () => {
    http.get.mockResolvedValue({});

    const data = await fetchMyBids();

    expect(http.get).toHaveBeenCalledWith('/api/orders/my-bids');
    expect(data).toEqual([]);
  });

  it('submitBid posts body including quote breakdown when provided', async () => {
    http.post.mockResolvedValue({ data: { id: 'b1' } });

    const data = await submitBid('o1', 7000, 'fast delivery', { base: 6000, taxes: 1000 });

    expect(http.post).toHaveBeenCalledWith('/api/orders/o1/bids', {
      bidAmount: 7000,
      notes: 'fast delivery',
      quoteBreakdown: { base: 6000, taxes: 1000 },
    });
    expect(data).toEqual({ id: 'b1' });
  });

  it('withdraws bid and returns raw response fallback', async () => {
    http.del.mockResolvedValue({ ok: true });

    const data = await withdrawBid('o1', 'b1');

    expect(http.del).toHaveBeenCalledWith('/api/orders/o1/bids/b1');
    expect(data).toEqual({ ok: true });
  });

  it('gets order bids endpoint', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'b1' }] });

    const data = await getOrderBids('o1');

    expect(http.get).toHaveBeenCalledWith('/api/orders/o1/bids');
    expect(data).toEqual([{ id: 'b1' }]);
  });
});
