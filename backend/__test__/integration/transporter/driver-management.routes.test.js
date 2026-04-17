import request from 'supertest';
import app from '../../../core/app.js';
import Driver from '../../../models/driver.js';
import DriverApplication from '../../../models/driverApplication.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

describe('Transporter Driver Management Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  const setupPendingApplication = async () => {
    const transporter = await bootstrapTransporterAuth(app, { verified: true });
    const driver = await bootstrapDriverAuth(app);

    await request(app)
      .post(`/api/drivers/apply/${transporter.user._id}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ message: 'Looking to join' })
      .expect(201);

    const requestsRes = await request(app)
      .get('/api/transporters/driver-requests')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    return {
      transporter,
      driver,
      applicationId: requestsRes.body.data[0]._id,
    };
  };

  describe('GET /api/transporters/driver-requests', () => {
    it('lists pending applications', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'Looking to join' })
        .expect(201);

      const requestsRes = await request(app)
        .get('/api/transporters/driver-requests')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(requestsRes.body.success).toBe(true);
      expect(requestsRes.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/transporters/driver-requests/:applicationId/accept', () => {
    it('accepts application and associates driver', async () => {
      const { transporter, driver, applicationId } = await setupPendingApplication();

      await request(app)
        .post(`/api/transporters/driver-requests/${applicationId}/accept`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const application = await DriverApplication.findById(applicationId);
      expect(application.status).toBe('Accepted');

      const driverDoc = await Driver.findById(driver.user._id);
      expect(driverDoc.transporter_id.toString()).toBe(transporter.user._id.toString());
    });
  });

  describe('GET /api/transporters/drivers', () => {
    it('lists accepted drivers', async () => {
      const { transporter, driver, applicationId } = await setupPendingApplication();

      await request(app)
        .post(`/api/transporters/driver-requests/${applicationId}/accept`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const driversRes = await request(app)
        .get('/api/transporters/drivers')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const acceptedDriver = driversRes.body.data.find((d) => d._id.toString() === driver.user._id.toString());
      expect(acceptedDriver).toBeTruthy();
    });
  });

  describe('GET /api/transporters/drivers/:driverId/schedule', () => {
    it('returns schedule blocks for associated driver', async () => {
      const { transporter, driver, applicationId } = await setupPendingApplication();

      await request(app)
        .post(`/api/transporters/driver-requests/${applicationId}/accept`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const scheduleRes = await request(app)
        .get(`/api/transporters/drivers/${driver.user._id}/schedule`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      expect(scheduleRes.body.success).toBe(true);
      expect(Array.isArray(scheduleRes.body.data.blocks)).toBe(true);
    });
  });

  describe('POST /api/transporters/driver-requests/:applicationId/reject', () => {
    it('rejects request and keeps driver unassociated', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app, { phone: '9777666555' });

      await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'Please approve' })
        .expect(201);

      const requestsRes = await request(app)
        .get('/api/transporters/driver-requests')
        .set('Authorization', `Bearer ${transporter.token}`)
        .expect(200);

      const applicationId = requestsRes.body.data[0]._id;

      await request(app)
        .post(`/api/transporters/driver-requests/${applicationId}/reject`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ rejectionReason: 'No openings' })
        .expect(200);

      const application = await DriverApplication.findById(applicationId);
      expect(application.status).toBe('Rejected');

      const driverDoc = await Driver.findById(driver.user._id);
      expect(driverDoc.transporter_id).toBeFalsy();
    });
  });
});
