import request from 'supertest';
import app from '../../../core/app.js';
import Driver from '../../../models/driver.js';
import DriverApplication from '../../../models/driverApplication.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

const futureIso = (days = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

describe('Driver Account and Schedule Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('PUT /api/drivers/profile', () => {
    it('updates profile and persists data in DB', async () => {
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .put('/api/drivers/profile')
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ firstName: 'UpdatedDriver', phone: '9765432109' })
        .expect(200);

      const updated = await Driver.findById(driver.user._id);
      expect(updated.firstName).toBe('UpdatedDriver');
      expect(updated.phone).toBe('9765432109');
    });
  });

  describe('POST /api/drivers/schedule/block', () => {
    it('adds schedule block in DB', async () => {
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .post('/api/drivers/schedule/block')
        .set('Authorization', `Bearer ${driver.token}`)
        .send({
          startTime: futureIso(3),
          endTime: futureIso(4),
          title: 'Unavailable personal work',
          notes: 'Leave block',
        })
        .expect(201);

      const afterAdd = await Driver.findById(driver.user._id);
      expect(afterAdd.scheduleBlocks).toHaveLength(1);
    });
  });

  describe('DELETE /api/drivers/schedule/block/:blockId', () => {
    it('removes schedule block in DB', async () => {
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .post('/api/drivers/schedule/block')
        .set('Authorization', `Bearer ${driver.token}`)
        .send({
          startTime: futureIso(3),
          endTime: futureIso(4),
          title: 'Unavailable personal work',
          notes: 'Leave block',
        })
        .expect(201);

      const afterAdd = await Driver.findById(driver.user._id);
      const blockId = afterAdd.scheduleBlocks[0]._id;

      await request(app)
        .delete(`/api/drivers/schedule/block/${blockId}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      const afterDelete = await Driver.findById(driver.user._id);
      expect(afterDelete.scheduleBlocks).toHaveLength(0);
    });
  });

  describe('POST /api/drivers/apply/:transporterId', () => {
    it('creates pending application record', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app);

      const applyRes = await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'Please consider my profile' })
        .expect(201);

      const application = await DriverApplication.findById(applyRes.body.data._id);
      expect(application).toBeTruthy();
      expect(application.status).toBe('Pending');
    });

    it('prevents duplicate pending application', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'First request' })
        .expect(201);

      await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'Duplicate request' })
        .expect(409);

      const records = await DriverApplication.find({
        driver_id: driver.user._id,
        transporter_id: transporter.user._id,
        status: 'Pending',
      });

      expect(records).toHaveLength(1);
    });
  });

  describe('DELETE /api/drivers/application/:applicationId', () => {
    it('withdraws pending application', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });
      const driver = await bootstrapDriverAuth(app);

      const applyRes = await request(app)
        .post(`/api/drivers/apply/${transporter.user._id}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .send({ message: 'Please consider my profile' })
        .expect(201);

      const applicationId = applyRes.body.data._id;

      await request(app)
        .delete(`/api/drivers/application/${applicationId}`)
        .set('Authorization', `Bearer ${driver.token}`)
        .expect(200);

      const application = await DriverApplication.findById(applicationId);
      expect(application).toBeNull();
    });
  });
});
