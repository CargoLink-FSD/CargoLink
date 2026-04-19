import request from 'supertest';
import app from '../../../core/app.js';
import Fleet from '../../../models/fleet.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapTransporterAuth } from '../../utils/auth-flow.js';

const futureIso = (days = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe('Transporter Fleet Management Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('GET /api/transporters/fleet', () => {
    it('returns transporter fleet list', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const listRes = await request(app)
        .get('/api/transporters/fleet')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data).toBeTruthy();
    });
  });

  describe('GET /api/transporters/:transporterId/public-profile', () => {
    it('returns public profile without sensitive fields', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const customer = await bootstrapTransporterAuth(app, {
        verified: true,
        overrides: { email: 'viewer.transporter@example.com', primary_contact: '9900001234' },
      });

      const res = await request(app)
        .get(`/api/transporters/${transporter.user._id}/public-profile`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.password).toBeUndefined();
    });
  });

  describe('POST /api/transporters/fleet', () => {
    it('creates a truck record', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const createPayload = {
        name: 'new-truck',
        registration: 'TN09Z9876',
        capacity: 8000,
        manufacture_year: 2020,
        truck_type: 'truck-medium',
      };

      const createRes = await request(app)
        .post('/api/transporters/fleet')
        .set('Authorization', `Bearer ${transporter.token}`)
        .send(createPayload)
        .expect(201);

      const truck = await Fleet.findById(createRes.body.data._id);
      expect(truck).toBeTruthy();
      expect(truck.registration).toBe(createPayload.registration);
    });

    it('returns 400 for invalid payload', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .post('/api/transporters/fleet')
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ name: 'bad' })
        .expect(400);
    });
  });

  describe('GET /api/transporters/fleet/:truckId', () => {
    it('returns truck details by id', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const truckId = transporter.fleet[0]._id;

      const res = await request(app)
        .get(`/api/transporters/fleet/${truckId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid truck id', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .get('/api/transporters/fleet/invalid-id')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(400);
    });
  });

  describe('PUT /api/transporters/fleet/:truckId', () => {
    it('updates truck fields in DB', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const truckId = transporter.fleet[0]._id;

      await request(app)
        .put(`/api/transporters/fleet/${truckId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ name: 'updated-truck', capacity: 9000 })
        .expect(200);

      const truck = await Fleet.findById(truckId);
      expect(truck.name).toBe('updated-truck');
      expect(truck.capacity).toBe(9000);
    });

    it('returns 400 for invalid truck id', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .put('/api/transporters/fleet/invalid-id')
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ name: 'x' })
        .expect(400);
    });
  });

  describe('DELETE /api/transporters/fleet/:truckId', () => {
    it('deletes truck record', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const createRes = await request(app)
        .post('/api/transporters/fleet')
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({
          name: 'delete-truck',
          registration: 'TN09Z9877',
          capacity: 7000,
          manufacture_year: 2020,
          truck_type: 'truck-medium',
        })
        .expect(201);

      const truckId = createRes.body.data._id;

      await request(app)
        .delete(`/api/transporters/fleet/${truckId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const truck = await Fleet.findById(truckId);
      expect(truck).toBeNull();
    });
  });

  describe('POST /api/transporters/fleet/:truckId/schedule/block', () => {
    it('adds schedule block for truck', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const truckId = transporter.fleet[0]._id;

      await request(app)
        .post(`/api/transporters/fleet/${truckId}/schedule/block`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({
          startTime: futureIso(3),
          endTime: futureIso(4),
          type: 'maintenance',
          title: 'Service',
          notes: 'Periodic maintenance',
        })
        .expect(201);

      const truck = await Fleet.findById(truckId);
      expect(truck.scheduleBlocks).toHaveLength(1);
    });
  });

  describe('GET /api/transporters/fleet/:truckId/schedule', () => {
    it('returns schedule blocks for truck', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const truckId = transporter.fleet[0]._id;

      await request(app)
        .post(`/api/transporters/fleet/${truckId}/schedule/block`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({
          startTime: futureIso(3),
          endTime: futureIso(4),
          type: 'maintenance',
          title: 'Service',
          notes: 'Periodic maintenance',
        })
        .expect(201);

      const scheduleRes = await request(app)
        .get(`/api/transporters/fleet/${truckId}/schedule`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(scheduleRes.body.success).toBe(true);
      expect(scheduleRes.body.data.blocks.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/transporters/fleet/:truckId/schedule/block/:blockId', () => {
    it('removes schedule block for truck', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const truckId = transporter.fleet[0]._id;

      await request(app)
        .post(`/api/transporters/fleet/${truckId}/schedule/block`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({
          startTime: futureIso(3),
          endTime: futureIso(4),
          type: 'maintenance',
          title: 'Service',
          notes: 'Periodic maintenance',
        })
        .expect(201);

      const truck = await Fleet.findById(truckId);
      const blockId = truck.scheduleBlocks[0]._id;

      await request(app)
        .delete(`/api/transporters/fleet/${truckId}/schedule/block/${blockId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const afterDelete = await Fleet.findById(truckId);
      expect(afterDelete.scheduleBlocks).toHaveLength(0);
    });
  });
});
