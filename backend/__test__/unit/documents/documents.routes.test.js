import request from 'supertest';
import app from '../../../core/app.js';
import Transporter from '../../../models/transporter.js';
import Driver from '../../../models/driver.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapDriverAuth, bootstrapManagerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgN4r2GsAAAAASUVORK5CYII=', 'base64');

const pngFile = (name) => ({ filename: name, contentType: 'image/png' });

describe('Documents Upload + Verification Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  describe('POST /api/transporters/documents', () => {
    it('uploads transporter documents and marks under review', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: false });

      await request(app)
        .post('/api/transporters/documents')
        .set('Authorization', `Bearer ${transporter.token}`)
        .attach('pan_card', pngBuffer, pngFile('pan.png'))
        .attach('driving_license', pngBuffer, pngFile('dl.png'))
        .attach('vehicle_rc_0', pngBuffer, pngFile('rc0.png'))
        .expect(200);

      const transporterDoc = await Transporter.findById(transporter.user._id);
      expect(transporterDoc.verificationStatus).toBe('under_review');
      expect(transporterDoc.documents.pan_card.url).toContain('/uploads/transporter-docs/');
      expect(transporterDoc.documents.driving_license.url).toContain('/uploads/transporter-docs/');
      expect(Array.isArray(transporterDoc.documents.vehicle_rcs)).toBe(true);
    });
  });

  describe('PATCH /api/manager/verify/:id/documents/:docType/approve', () => {
    it('approves transporter PAN document', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: false });
      const manager = await bootstrapManagerAuth(app, {
        verificationCategories: ['transporter_verification', 'vehicle_verification'],
      });

      await request(app)
        .post('/api/transporters/documents')
        .set('Authorization', `Bearer ${transporter.token}`)
        .attach('pan_card', pngBuffer, pngFile('pan.png'))
        .attach('driving_license', pngBuffer, pngFile('dl.png'))
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${transporter.user._id}/documents/pan_card/approve`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'transporter' })
        .expect(200);

      const transporterDoc = await Transporter.findById(transporter.user._id);
      expect(transporterDoc.documents.pan_card.adminStatus).toBe('approved');
    });

    it('approves driver documents and marks verified after both approvals', async () => {
      const driver = await bootstrapDriverAuth(app);
      const manager = await bootstrapManagerAuth(app, {
        verificationCategories: ['driver_verification'],
      });

      await request(app)
        .post('/api/drivers/documents')
        .set('Authorization', `Bearer ${driver.token}`)
        .attach('pan_card', pngBuffer, pngFile('driver-pan.png'))
        .attach('driving_license', pngBuffer, pngFile('driver-dl.png'))
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${driver.user._id}/documents/pan_card/approve`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'driver' })
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${driver.user._id}/documents/driving_license/approve`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'driver' })
        .expect(200);

      const driverDoc = await Driver.findById(driver.user._id);
      expect(driverDoc.documents.pan_card.adminStatus).toBe('approved');
      expect(driverDoc.documents.driving_license.adminStatus).toBe('approved');
      expect(driverDoc.verificationStatus).toBe('approved');
      expect(driverDoc.isVerified).toBe(true);
    });
  });

  describe('PATCH /api/manager/verify/:id/documents/:docType/reject', () => {
    it('rejects transporter driving license and marks rejected status', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: false });
      const manager = await bootstrapManagerAuth(app, {
        verificationCategories: ['transporter_verification', 'vehicle_verification'],
      });

      await request(app)
        .post('/api/transporters/documents')
        .set('Authorization', `Bearer ${transporter.token}`)
        .attach('pan_card', pngBuffer, pngFile('pan.png'))
        .attach('driving_license', pngBuffer, pngFile('dl.png'))
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${transporter.user._id}/documents/driving_license/reject`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'transporter', note: 'Blurred image' })
        .expect(200);

      const transporterDoc = await Transporter.findById(transporter.user._id);
      expect(transporterDoc.documents.driving_license.adminStatus).toBe('rejected');
      expect(transporterDoc.verificationStatus).toBe('rejected');
      expect(transporterDoc.isVerified).toBe(false);
    });

    it('returns 400 when rejecting already rejected document', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: false });
      const manager = await bootstrapManagerAuth(app, {
        verificationCategories: ['transporter_verification', 'vehicle_verification'],
      });

      await request(app)
        .post('/api/transporters/documents')
        .set('Authorization', `Bearer ${transporter.token}`)
        .attach('pan_card', pngBuffer, pngFile('pan.png'))
        .attach('driving_license', pngBuffer, pngFile('dl.png'))
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${transporter.user._id}/documents/driving_license/reject`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'transporter', note: 'Blurred image' })
        .expect(200);

      await request(app)
        .patch(`/api/manager/verify/${transporter.user._id}/documents/driving_license/reject`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ entityType: 'transporter' })
        .expect(400);
    });
  });

  describe('POST /api/drivers/documents', () => {
    it('uploads driver documents and marks under review', async () => {
      const driver = await bootstrapDriverAuth(app);

      await request(app)
        .post('/api/drivers/documents')
        .set('Authorization', `Bearer ${driver.token}`)
        .attach('pan_card', pngBuffer, pngFile('driver-pan.png'))
        .attach('driving_license', pngBuffer, pngFile('driver-dl.png'))
        .expect(200);

      const driverDoc = await Driver.findById(driver.user._id);
      expect(driverDoc.verificationStatus).toBe('under_review');
      expect(driverDoc.documents.pan_card.url).toContain('/uploads/driver-docs/');
    });
  });
});
