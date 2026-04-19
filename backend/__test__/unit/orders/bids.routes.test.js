import request from 'supertest';
import app from '../../../core/app.js';
import Order from '../../../models/order.js';
import Bid from '../../../models/bids.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockBidInput, createMockOrderInput } from '../../factories/order.factory.js';

const setupPlacedOrder = async () => {
  const customer = await bootstrapCustomerAuth(app);
  const placeRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send(createMockOrderInput())
    .expect(201);

  return { customer, orderId: placeRes.body.data.orderId };
};

const setupOrderWithBid = async () => {
  const { customer, orderId } = await setupPlacedOrder();
  const transporter = await bootstrapTransporterAuth(app, { verified: true });

  const bidRes = await request(app)
    .post(`/api/orders/${orderId}/bids`)
    .set('Authorization', `Bearer ${transporter.token}`)
    .send(createMockBidInput())
    .expect(201);

  return { customer, transporter, orderId, bidId: bidRes.body.data.bidId };
};

describe('Orders and Bids Endpoint Tests', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('POST /api/orders', () => {
    it('creates order and persists placed status', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const payload = createMockOrderInput();

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(payload)
        .expect(201);

      const order = await Order.findById(res.body.data.orderId);
      expect(order).toBeTruthy();
      expect(order.status).toBe('Placed');
      expect(order.customer_id.toString()).toBe(customer.user._id.toString());
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('returns order details for owner', async () => {
      const { customer, orderId } = await setupPlacedOrder();

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(orderId.toString());
    });

    it('returns 400 for invalid order id', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .get('/api/orders/invalid-order-id')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(400);
    });

    it('returns 403 when unrelated customer requests another user order', async () => {
      const { orderId } = await setupPlacedOrder();
      const outsider = await bootstrapCustomerAuth(app, { phone: '9555511111' });

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/orders/:orderId/bids', () => {
    it('returns bids for order owner', async () => {
      const { customer, orderId } = await setupPlacedOrder();
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createMockBidInput())
        .expect(201);

      const res = await request(app)
        .get(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('blocks unrelated customer from viewing bids', async () => {
      const { orderId } = await setupPlacedOrder();
      const outsider = await bootstrapCustomerAuth(app, { phone: '9555522222' });

      const res = await request(app)
        .get(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/orders/:orderId/bids/:bidId/quote-pdf', () => {
    it('blocks unrelated customer from downloading bid quote', async () => {
      const { orderId, bidId } = await setupOrderWithBid();
      const outsider = await bootstrapCustomerAuth(app, { phone: '9555533333' });

      const res = await request(app)
        .get(`/api/orders/${orderId}/bids/${bidId}/quote-pdf`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/orders/:orderId/bids', () => {
    it('allows verified transporter to submit bid', async () => {
      const { orderId } = await setupPlacedOrder();
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const res = await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createMockBidInput())
        .expect(201);

      const bid = await Bid.findById(res.body.data.bidId);
      expect(bid).toBeTruthy();
      expect(bid.order_id.toString()).toBe(orderId.toString());
    });

    it('rejects unverified transporter bid submission', async () => {
      const { orderId } = await setupPlacedOrder();
      const transporter = await bootstrapTransporterAuth(app, { verified: false });

      await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createMockBidInput())
        .expect(403);

      const bids = await Bid.find({ order_id: orderId });
      expect(bids).toHaveLength(0);
    });

    it('rejects duplicate active bid submission from same transporter', async () => {
      const { orderId } = await setupPlacedOrder();
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createMockBidInput())
        .expect(201);

      const secondRes = await request(app)
        .post(`/api/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createMockBidInput({ bidAmount: 23000 }));

      expect([400, 409]).toContain(secondRes.status);

      const bids = await Bid.find({ order_id: orderId, transporter_id: transporter.user._id });
      expect(bids.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/orders/:orderId/bids/:bidId (customer reject)', () => {
    it('removes selected bid', async () => {
      const { customer, orderId, bidId } = await setupOrderWithBid();

      await request(app)
        .delete(`/api/orders/${orderId}/bids/${bidId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      const bid = await Bid.findById(bidId);
      expect(bid).toBeNull();
    });
  });

  describe('POST /api/orders/:orderId/bids/:bidId/accept', () => {
    it('assigns transporter and otp details to order', async () => {
      const { customer, transporter, orderId, bidId } = await setupOrderWithBid();

      await request(app)
        .post(`/api/orders/${orderId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      const order = await Order.findById(orderId);
      expect(order.status).toBe('Assigned');
      expect(order.assigned_transporter_id.toString()).toBe(transporter.user._id.toString());
      expect(order.pickup_otp).toBeTruthy();
      expect(order.delivery_otp).toBeTruthy();
    });

    it('returns 400 for invalid order and bid ids', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .post('/api/orders/invalid-order-id/bids/invalid-bid-id/accept')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(400);
    });

    it('returns invalid-operation response when bid is accepted twice', async () => {
      const { customer, orderId, bidId } = await setupOrderWithBid();

      await request(app)
        .post(`/api/orders/${orderId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      const secondAccept = await request(app)
        .post(`/api/orders/${orderId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect([400, 404, 409]).toContain(secondAccept.status);
    });
  });
});
