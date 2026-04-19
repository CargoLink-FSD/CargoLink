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

const setupAssignedOrder = async () => {
  const customer = await bootstrapCustomerAuth(app);
  const transporter = await bootstrapTransporterAuth(app, { verified: true });
  const driver = await bootstrapDriverAuth(app);

  await request(app)
    .post(`/api/drivers/apply/${transporter.user._id}`)
    .set('Authorization', `Bearer ${driver.token}`)
    .send({ message: 'Trip ready' })
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

  return { customer, transporter, driver, orderId, orderDoc };
};

const createTripFixture = async () => {
  const { customer, transporter, driver, orderId, orderDoc } = await setupAssignedOrder();

  const createTrip = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${transporter.token}`)
    .send({
      order_ids: [orderId],
      assigned_vehicle_id: transporter.fleet[0]._id,
      assigned_driver_id: driver.user._id,
      planned_start_at: futureIso(2),
      stops: [
        {
          type: 'Pickup',
          order_id: orderId,
          address: orderDoc.pickup,
        },
        {
          type: 'Dropoff',
          order_id: orderId,
          address: orderDoc.delivery,
        },
      ],
    })
    .expect(201);

  return { customer, transporter, driver, orderId, tripId: createTrip.body.data._id };
};

describe('Trips Routes Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('POST /api/trips', () => {
    it('creates trip with scheduled status', async () => {
      const { tripId } = await createTripFixture();
      const trip = await Trip.findById(tripId);
      expect(trip).toBeTruthy();
      expect(trip.status).toBe('Scheduled');
    });
  });

  describe('GET /api/trips', () => {
    it('lists transporter trips', async () => {
      const { transporter } = await createTripFixture();

      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/trips/:tripId', () => {
    it('returns trip details', async () => {
      const { transporter, tripId } = await createTripFixture();

      const res = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(tripId.toString());
    });

    it('does not expose trip details to unrelated driver', async () => {
      const { tripId } = await createTripFixture();
      const outsiderDriver = await bootstrapDriverAuth(app, { phone: '9888811111' });

      const res = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${outsiderDriver.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/trips/:tripId', () => {
    it('updates trip planning fields', async () => {
      const { transporter, tripId } = await createTripFixture();

      await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ planned_end_at: futureIso(4) })
        .expect(200);

      const trip = await Trip.findById(tripId);
      expect(trip.planned_end_at).toBeTruthy();
    });

    it('returns invalid-operation response when trip is not scheduled', async () => {
      const { transporter, tripId } = await createTripFixture();
      await Trip.findByIdAndUpdate(tripId, { $set: { status: 'Active' } });

      const res = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ planned_end_at: futureIso(5) });

      expect([400, 409]).toContain(res.status);
    });
  });

  describe('DELETE /api/trips/:tripId', () => {
    it('deletes trip from DB', async () => {
      const { transporter, tripId } = await createTripFixture();

      await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const trip = await Trip.findById(tripId);
      expect(trip).toBeNull();
    });
  });

  describe('GET /api/trips/driver/my-trips', () => {
    it('lists trips for assigned driver', async () => {
      const { driver } = await createTripFixture();

      const res = await request(app)
        .get('/api/trips/driver/my-trips')
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/trips/driver/:tripId', () => {
    it('returns trip details for assigned driver', async () => {
      const { driver, tripId } = await createTripFixture();

      const res = await request(app)
        .get(`/api/trips/driver/${tripId}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(tripId.toString());
    });

    it('returns not-found/forbidden for non-assigned driver', async () => {
      const { tripId } = await createTripFixture();
      const outsiderDriver = await bootstrapDriverAuth(app, { phone: '9888822222' });

      const res = await request(app)
        .get(`/api/trips/driver/${tripId}`)
        .set('Authorization', `Bearer ${outsiderDriver.token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/trips/driver/:tripId/start', () => {
    it('moves trip status to Active', async () => {
      const { driver, tripId } = await createTripFixture();

      await request(app)
        .post(`/api/trips/driver/${tripId}/start`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      const trip = await Trip.findById(tripId);
      expect(trip.status).toBe('Active');
    });

    it('returns invalid-operation when starting an already active trip', async () => {
      const { driver, tripId } = await createTripFixture();

      await request(app)
        .post(`/api/trips/driver/${tripId}/start`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      const secondStart = await request(app)
        .post(`/api/trips/driver/${tripId}/start`)
        .set('Authorization', `Bearer ${driver.token}`);

      expect([400, 409]).toContain(secondStart.status);
    });
  });

  describe('POST /api/trips/driver/:tripId/stops/:stopId/confirm-pickup', () => {
    it('updates linked order status to In Transit', async () => {
      const { driver, tripId, orderId } = await createTripFixture();

      await request(app)
        .post(`/api/trips/driver/${tripId}/start`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      const trip = await Trip.findById(tripId);
      const pickupStop = trip.stops.find((s) => s.type === 'Pickup');
      const order = await Order.findById(orderId);

      await request(app)
        .post(`/api/trips/driver/${tripId}/stops/${pickupStop._id}/confirm-pickup`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ otp: order.pickup_otp })
        .expect(200);

      const inTransitOrder = await Order.findById(orderId);
      expect(inTransitOrder.status).toBe('In Transit');
    });
  });

  describe('POST /api/trips/driver/:tripId/delay', () => {
    it('adds delay stop information', async () => {
      const { driver, tripId } = await createTripFixture();

      await Trip.findByIdAndUpdate(tripId, { $set: { status: 'Active' } });

      await request(app)
        .post(`/api/trips/driver/${tripId}/delay`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ delay_minutes: 20, reason: 'Traffic', coordinates: [77.6, 12.9] })
        .expect(200);

      const trip = await Trip.findById(tripId);
      expect(trip.stops.some((s) => s.type === 'Delay')).toBe(true);
    });
  });

  describe('POST /api/trips/driver/:tripId/location', () => {
    it('updates trip live location', async () => {
      const { driver, tripId } = await createTripFixture();

      await Trip.findByIdAndUpdate(tripId, { $set: { status: 'Active' } });

      await request(app)
        .post(`/api/trips/driver/${tripId}/location`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ coordinates: [77.61, 12.91] })
        .expect(200);

      const trip = await Trip.findById(tripId);
      expect(trip.current_location.coordinates[0]).toBeCloseTo(77.61);
    });
  });

  describe('POST /api/trips/:tripId/complete', () => {
    it('returns validation error when trip is not ready to complete', async () => {
      const { transporter, tripId } = await createTripFixture();

      await request(app)
        .post(`/api/trips/${tripId}/complete`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(400);
    });
  });
});
