import request from 'supertest';
import app from '../../../core/app.js';
import Driver from '../../../models/driver.js';
import { createMockDriverInput } from '../../factories/driver.factory.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

describe('Driver Register and Read Endpoints', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('POST /api/drivers/register', () => {
    it('registers driver successfully', async () => {
      const payload = createMockDriverInput();

      const res = await request(app)
        .post('/api/drivers/register')
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);

      const driver = await Driver.findOne({ email: payload.email });
      expect(driver).toBeTruthy();
    });

    it('returns 400 for missing required fields', async () => {
      await request(app)
        .post('/api/drivers/register')
        .send({ email: 'x@example.com' })
        .expect(400);
    });

    it('returns 400 for invalid email format', async () => {
      const payload = createMockDriverInput({ email: 'bad-email' });

      await request(app)
        .post('/api/drivers/register')
        .send(payload)
        .expect(400);
    });

    it('returns 409 for duplicate email registration', async () => {
      const payload = createMockDriverInput();

      await request(app)
        .post('/api/drivers/register')
        .send(payload)
        .expect(201);

      await request(app)
        .post('/api/drivers/register')
        .send(payload)
        .expect(409);
    });
  });

//   describe('GET /api/drivers/dashboard-stats', () => {
//     it('returns driver dashboard stats', async () => {
//       const driver = await bootstrapDriverAuth(app);

//       const res = await request(app)
//         .get('/api/drivers/dashboard-stats')
//         .set('Authorization', `Bearer ${driver.token}`)
//         .expect(200);

//       expect(res.body.success).toBe(true);
//     });

//     it('returns 401 without auth token', async () => {
//       await request(app)
//         .get('/api/drivers/dashboard-stats')
//         .expect(401);
//     });
//   });

  describe('GET /api/drivers/profile', () => {
    it('returns driver profile for self', async () => {
      const driver = await bootstrapDriverAuth(app);

      const res = await request(app)
        .get('/api/drivers/profile')
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
      expect(res.body.data.password).toBeUndefined();
    });

    it('returns 403 for wrong user role', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      await request(app)
        .get('/api/drivers/profile')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(403);
    });
  });

  describe('GET /api/drivers/schedule', () => {
    it('returns driver schedule blocks', async () => {
      const driver = await bootstrapDriverAuth(app);

      const res = await request(app)
        .get('/api/drivers/schedule')
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.blocks)).toBe(true);
    });
  });

  describe('GET /api/drivers/transporters', () => {
    it('returns available transporters list for drivers', async () => {
      await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app);

      const res = await request(app)
        .get('/api/drivers/transporters')
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/drivers/verification-status', () => {
    it('returns document verification status for driver', async () => {
      const driver = await bootstrapDriverAuth(app);

      const res = await request(app)
        .get('/api/drivers/verification-status')
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });
  });
});
