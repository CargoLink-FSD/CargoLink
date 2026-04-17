import request from 'supertest';
import app from '../../../core/app.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import Driver from '../../../models/driver.js';
import DriverApplication from '../../../models/driverApplication.js';

describe('Driver Join Pipeline', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  it('driver applies and transporter accepts request', async () => {
    const transporter = await bootstrapTransporterAuth(app, { verified: true });
    const driver = await bootstrapDriverAuth(app);

    await request(app)
      .post(`/api/drivers/apply/${transporter.user._id}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ message: 'I have 4 years of long route driving experience' })
      .expect(201);

    const pendingRes = await request(app)
      .get('/api/transporters/driver-requests')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    expect(Array.isArray(pendingRes.body.data)).toBe(true);
    expect(pendingRes.body.data.length).toBe(1);

    const applicationId = pendingRes.body.data[0]._id;

    let application = await DriverApplication.findById(applicationId);
    expect(application).toBeTruthy();
    expect(application.status).toBe('Pending');

    const acceptRes = await request(app)
      .post(`/api/transporters/driver-requests/${applicationId}/accept`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    expect(acceptRes.body.success).toBe(true);

    application = await DriverApplication.findById(applicationId);
    expect(application.status).toBe('Accepted');

    const updatedDriver = await Driver.findById(driver.user._id);
    expect(updatedDriver.transporter_id.toString()).toBe(transporter.user._id.toString());

    const appsRes = await request(app)
      .get('/api/drivers/applications')
      .set('Authorization', `Bearer ${driver.token}`)
      .expect(200);

    expect(appsRes.body.success).toBe(true);
    expect(appsRes.body.data[0].status).toBe('Accepted');

    const listDriversRes = await request(app)
      .get('/api/transporters/drivers')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    expect(listDriversRes.body.success).toBe(true);
    expect(listDriversRes.body.data.some(d => d._id.toString() === driver.user._id.toString())).toBe(true);
  });

  it('driver applies and transporter rejects request', async () => {
    const transporter = await bootstrapTransporterAuth(app, { verified: true });
    const driver = await bootstrapDriverAuth(app, { phone: '9898989898' });

    await request(app)
      .post(`/api/drivers/apply/${transporter.user._id}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ message: 'Looking to join your fleet team' })
      .expect(201);

    const pendingRes = await request(app)
      .get('/api/transporters/driver-requests')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    const applicationId = pendingRes.body.data[0]._id;

    const outsiderTransporter = await bootstrapTransporterAuth(app, {
      verified: true,
      overrides: {
        primary_contact: '9000012345',
      },
    });

    await request(app)
      .post(`/api/transporters/driver-requests/${applicationId}/accept`)
      .set('Authorization', `Bearer ${outsiderTransporter.token}`)
      .expect(403);

    await request(app)
      .post(`/api/transporters/driver-requests/${applicationId}/reject`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .send({ rejectionReason: 'No vacancy right now' })
      .expect(200);

    const application = await DriverApplication.findById(applicationId);
    expect(application.status).toBe('Rejected');

    const driverDoc = await Driver.findById(driver.user._id);
    expect(driverDoc.transporter_id).toBeFalsy();

    const appsRes = await request(app)
      .get('/api/drivers/applications')
      .set('Authorization', `Bearer ${driver.token}`)
      .expect(200);

    expect(appsRes.body.data[0].status).toBe('Rejected');
  });

  it('driver can withdraw pending request and request is removed from DB', async () => {
    const transporter = await bootstrapTransporterAuth(app, { verified: true });
    const driver = await bootstrapDriverAuth(app, { phone: '9888777666' });

    const applyRes = await request(app)
      .post(`/api/drivers/apply/${transporter.user._id}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ message: 'Please review my profile' })
      .expect(201);

    const applicationId = applyRes.body.data._id;

    await request(app)
      .delete(`/api/drivers/application/${applicationId}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .expect(200);

    const application = await DriverApplication.findById(applicationId);
    expect(application).toBeNull();

    const pendingForTransporter = await request(app)
      .get('/api/transporters/driver-requests')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    expect(pendingForTransporter.body.data).toHaveLength(0);
  });
});
