import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/http.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

import http from '../../src/api/http.js';
import {
  acceptBid,
  deleteOrder,
  estimatePrice,
  getCancellationDues,
  getCustomerOrders,
  getOrderDetails,
  placeOrder,
  rejectBid,
  settleCancellationDues,
} from '../../src/api/orders.js';

describe('api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('estimatePrice posts payload and returns response data', async () => {
    http.post.mockResolvedValue({ data: { estimatedPrice: 1200 } });

    const result = await estimatePrice({ distance: 10, weight: 100, vehicle_type: 'truck-medium' });

    expect(http.post).toHaveBeenCalledWith('/api/orders/estimate-price', expect.any(Object));
    expect(result.estimatedPrice).toBe(1200);
  });

  it('getCustomerOrders builds query params correctly', async () => {
    http.get.mockResolvedValue({ data: [] });

    await getCustomerOrders({ search: 'mumbai', status: 'Placed' });

    expect(http.get).toHaveBeenCalledWith('/api/orders/my-orders?search=mumbai&status=Placed');
  });

  it('getOrderDetails returns null when api has no data', async () => {
    http.get.mockResolvedValue({});

    const result = await getOrderDetails('o-1');

    expect(http.get).toHaveBeenCalledWith('/api/orders/o-1');
    expect(result).toBeNull();
  });

  it('deleteOrder sends cancellation payload via delete options body', async () => {
    http.del.mockResolvedValue({ success: true });

    await deleteOrder('order-1', { reasonCode: 'changed_plan', reasonText: 'Changed plan' });

    expect(http.del).toHaveBeenCalledWith('/api/orders/order-1', {
      body: { reasonCode: 'changed_plan', reasonText: 'Changed plan' },
    });
  });

  it('supports cancellation dues get and settle endpoints', async () => {
    http.get.mockResolvedValue({ data: { dueAmount: 500 } });
    http.post.mockResolvedValue({ data: { settled: true } });

    const dues = await getCancellationDues();
    const settled = await settleCancellationDues(500);

    expect(http.get).toHaveBeenCalledWith('/api/orders/cancellation-dues');
    expect(http.post).toHaveBeenCalledWith('/api/orders/cancellation-dues/settle', { amount: 500 });
    expect(dues.dueAmount).toBe(500);
    expect(settled.settled).toBe(true);
  });

  it('accept/reject bid use expected endpoints', async () => {
    http.post.mockResolvedValue({ success: true });
    http.del.mockResolvedValue({ success: true });

    await acceptBid('o1', 'b1');
    await rejectBid('o1', 'b1');

    expect(http.post).toHaveBeenCalledWith('/api/orders/o1/bids/b1/accept', { bidId: 'b1' });
    expect(http.del).toHaveBeenCalledWith('/api/orders/o1/bids/b1');
  });

  it('placeOrder builds form-data and stringifies nested fields', async () => {
    http.post.mockResolvedValue({ data: { orderId: 'o1' } });

    const file = new Blob(['image-bytes'], { type: 'image/png' });
    const payload = {
      pickup: { city: 'Mumbai' },
      delivery: { city: 'Pune' },
      pickup_coordinates: [72.8, 19.0],
      delivery_coordinates: [73.8, 18.5],
      shipments: [{ weight: 20 }],
      truck_type: 'truck-medium',
    };

    await placeOrder(payload, file);

    const [, formData] = http.post.mock.calls[0];
    expect(http.post).toHaveBeenCalledWith('/api/orders', expect.any(FormData));
    expect(formData.get('pickup')).toBe(JSON.stringify(payload.pickup));
    expect(formData.get('delivery')).toBe(JSON.stringify(payload.delivery));
    expect(formData.get('shipments')).toBe(JSON.stringify(payload.shipments));
    expect(formData.get('truck_type')).toBe('truck-medium');
    expect(formData.get('cargo_photo')).toBeTruthy();
  });
});
