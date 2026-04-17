import request from 'supertest';
import app from '../../../core/app.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapAdminAuth, bootstrapCustomerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockBidInput, createMockOrderInput } from '../../factories/order.factory.js';

const setupOrderWithBid = async () => {
  const customer = await bootstrapCustomerAuth(app);
  const transporter = await bootstrapTransporterAuth(app, { verified: true });

  const placeRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send(createMockOrderInput())
    .expect(201);

  const orderId = placeRes.body.data.orderId;

  await request(app)
    .post(`/api/orders/${orderId}/bids`)
    .set('Authorization', `Bearer ${transporter.token}`)
    .send(createMockBidInput())
    .expect(201);

  return { customer, transporter, orderId };
};

describe('Admin Users and Orders Endpoints', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('GET /api/admin/users/:role/:id', () => {
    it('returns user details for a valid customer id', async () => {
      const admin = await bootstrapAdminAuth(app);
      const customer = await bootstrapCustomerAuth(app);

      const res = await request(app)
        .get(`/api/admin/users/customer/${customer.user._id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });

    it('returns 403 for non-admin user', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const anotherCustomer = await bootstrapCustomerAuth(app, { phone: '9000011111' });

      await request(app)
        .get(`/api/admin/users/customer/${anotherCustomer.user._id}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/orders/:orderId', () => {
    it('returns order details for admin', async () => {
      const admin = await bootstrapAdminAuth(app);
      const { orderId } = await setupOrderWithBid();

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });

    it('returns 400 for invalid order id format', async () => {
      const admin = await bootstrapAdminAuth(app);

      await request(app)
        .get('/api/admin/orders/invalid-order-id')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(400);
    });
  });

  describe('GET /api/admin/orders/:orderId/bids', () => {
    it('returns bids for target order', async () => {
      const admin = await bootstrapAdminAuth(app);
      const { orderId } = await setupOrderWithBid();

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}/bids`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/orders/:orderId/bid-count', () => {
    it('returns bid count summary for order', async () => {
      const admin = await bootstrapAdminAuth(app);
      const { orderId } = await setupOrderWithBid();

      const res = await request(app)
        .get(`/api/admin/orders/${orderId}/bid-count`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });
  });
});
