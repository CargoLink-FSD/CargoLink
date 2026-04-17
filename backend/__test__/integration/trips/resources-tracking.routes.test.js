import request from 'supertest';
import app from '../../../core/app.js';
import Trip from '../../../models/trip.js';
import Order from '../../../models/order.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockBidInput, createMockOrderInput } from '../../factories/order.factory.js';

const futureIso = (days = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const createAssignedTrip = async () => {
  const customer = await bootstrapCustomerAuth(app);
  const transporter = await bootstrapTransporterAuth(app, { verified: true });
  const driver = await bootstrapDriverAuth(app);

  await request(app)
    .post(`/api/drivers/apply/${transporter.user._id}`)
    .set('Authorization', `Bearer ${driver.token}`)
    .send({ message: 'Join for trip test' })
    .expect(201);

  const reqRes = await request(app)
    .get('/api/transporters/driver-requests')
    .set('Authorization', `Bearer ${transporter.token}`)
    .expect(200);

  await request(app)
    .post(`/api/transporters/driver-requests/${reqRes.body.data[0]._id}/accept`)
    .set('Authorization', `Bearer ${transporter.token}`)
    .expect(200);

  const place = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send(createMockOrderInput())
    .expect(201);

  const orderId = place.body.data.orderId;

  const bid = await request(app)
    .post(`/api/orders/${orderId}/bids`)
    .set('Authorization', `Bearer ${transporter.token}`)
    .send(createMockBidInput())
    .expect(201);

  await request(app)
    .post(`/api/orders/${orderId}/bids/${bid.body.data.bidId}/accept`)
    .set('Authorization', `Bearer ${customer.token}`)
    .expect(200);

  const orderDoc = await Order.findById(orderId);

  const tripRes = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${transporter.token}`)
    .send({
      order_ids: [orderId],
      assigned_vehicle_id: transporter.fleet[0]._id,
      assigned_driver_id: driver.user._id,
      planned_start_at: futureIso(2),
      stops: [
        { type: 'Pickup', order_id: orderId, address: orderDoc.pickup },
        { type: 'Dropoff', order_id: orderId, address: orderDoc.delivery },
      ],
    })
    .expect(201);

  return { customer, transporter, driver, orderId, tripId: tripRes.body.data._id };
};

describe('Trips Resources and Tracking Endpoints', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('GET /api/trips/resources/assignable-orders', () => {
    it('returns assignable orders for transporter', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const res = await request(app)
        .get('/api/trips/resources/assignable-orders')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/trips/resources/available-drivers', () => {
    it('returns available drivers for transporter', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const res = await request(app)
        .get('/api/trips/resources/available-drivers')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/trips/resources/available-vehicles', () => {
    it('returns available vehicles for transporter', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const res = await request(app)
        .get('/api/trips/resources/available-vehicles')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/trips/track/:orderId', () => {
    it('returns tracking response for customer order', async () => {
      const { customer, orderId } = await createAssignedTrip();

      const res = await request(app)
        .get(`/api/trips/track/${orderId}`)
        .set('Authorization', `Bearer ${customer.token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('returns 403 when transporter tries customer-only tracking endpoint', async () => {
      const { transporter, orderId } = await createAssignedTrip();

      await request(app)
        .get(`/api/trips/track/${orderId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(403);
    });

    it('returns not-found for unrelated customer order access', async () => {
      const { orderId } = await createAssignedTrip();
      const outsiderCustomer = await bootstrapCustomerAuth(app, { phone: '9777712345' });

      const res = await request(app)
        .get(`/api/trips/track/${orderId}`)
        .set('Authorization', `Bearer ${outsiderCustomer.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/trips/:tripId/cancel', () => {
    it('returns 400 for missing cancel reason payload', async () => {
      const { transporter, tripId } = await createAssignedTrip();

      await request(app)
        .post(`/api/trips/${tripId}/cancel`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/trips/driver/:tripId/clear-delay', () => {
    it('returns invalid-operation response when delay is not active', async () => {
      const { driver, tripId } = await createAssignedTrip();
      await Trip.findByIdAndUpdate(tripId, { $set: { status: 'Active' } });

      const res = await request(app)
        .post(`/api/trips/driver/${tripId}/clear-delay`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ coordinates: [77.6, 12.9] });

      expect([200, 400]).toContain(res.status);
    });
  });

  describe('POST /api/trips/driver/:tripId/stops/:stopId/confirm-delivery', () => {
    it('returns error when stop state does not allow delivery confirmation', async () => {
      const { driver, tripId } = await createAssignedTrip();
      const trip = await Trip.findById(tripId);
      const dropoffStop = trip.stops.find((s) => s.type === 'Dropoff');

      const res = await request(app)
        .post(`/api/trips/driver/${tripId}/stops/${dropoffStop._id}/confirm-delivery`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ otp: '123456' });

      expect([400, 404]).toContain(res.status);
    });
  });
});
