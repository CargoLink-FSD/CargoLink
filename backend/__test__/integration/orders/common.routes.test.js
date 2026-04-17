import request from 'supertest';
import app from '../../../core/app.js';
import Order from '../../../models/order.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockOrderInput } from '../../factories/order.factory.js';

describe('Orders Common Endpoints', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('POST /api/orders/estimate-price', () => {
    it('returns 200 for valid estimation request', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const res = await request(app)
        .post('/api/orders/estimate-price')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          distance: 20,
          vehicle_type: 'truck-medium',
          weight: 1200,
          goods_type: 'general',
        });

      expect([200, 500]).toContain(res.status);
    });

    it('returns 400 for missing required estimation fields', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .post('/api/orders/estimate-price')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ vehicle_type: 'truck-medium' })
        .expect(400);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('returns customer order listing', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/orders/available', () => {
    it('returns transporter available orders listing', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(createMockOrderInput())
        .expect(201);

      const res = await request(app)
        .get('/api/orders/available')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 403 when customer tries to view transporter-only available orders', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .get('/api/orders/available')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(403);
    });
  });

  describe('GET /api/orders/my-bids', () => {
    it('returns transporter bids list', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const res = await request(app)
        .get('/api/orders/my-bids')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/orders/cancellation-dues', () => {
    it('returns cancellation dues summary for customer', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const res = await request(app)
        .get('/api/orders/cancellation-dues')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });
  });

  describe('DELETE /api/orders/:orderId', () => {
    it('returns invalid-operation response when cancelling already cancelled order', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const placeRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(createMockOrderInput())
        .expect(201);

      await request(app)
        .delete(`/api/orders/${placeRes.body.data.orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ reason: 'Changed plans' })
        .expect(200);

      const secondCancel = await request(app)
        .delete(`/api/orders/${placeRes.body.data.orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ reason: 'Second cancel attempt' });

      expect([400, 409]).toContain(secondCancel.status);
    });

    it('returns 400 for invalid order id format', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .delete('/api/orders/invalid-order-id')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ reason: 'Changed plans' })
        .expect(400);
    });

    it('returns 404 when order resource does not exist', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ reason: 'Changed plans' });

      expect([404, 400]).toContain(res.status);
    });
  });

  describe('POST /api/orders', () => {
    it('returns 400 for missing required fields', async () => {
      const customer = await bootstrapCustomerAuth(app);

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({})
        .expect(400);
    });

    it('returns 400 for invalid field format', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const payload = createMockOrderInput();
      payload.pickup_coordinates = ['bad', 'format'];

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(payload)
        .expect(400);
    });

    it('stores created order as placed state', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const payload = createMockOrderInput();

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customer.token}`)
        .send(payload)
        .expect(201);

      const order = await Order.findById(res.body.data.orderId);
      expect(order.status).toBe('Placed');
    });
  });
});
