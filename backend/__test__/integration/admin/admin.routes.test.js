import request from 'supertest';
import app from '../../../core/app.js';
import ThresholdConfig from '../../../models/thresholdConfig.js';
import InvitationCode from '../../../models/invitationCode.js';
import Manager from '../../../models/manager.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapAdminAuth, bootstrapCustomerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

describe('Admin Routes Coverage Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  const seedAdminData = async () => {
    const admin = await bootstrapAdminAuth(app);
    await bootstrapCustomerAuth(app);
    await bootstrapTransporterAuth(app, { verified: true });
    return admin;
  };

  describe('Dashboard endpoints', () => {
    const paths = [
      '/api/admin/dashboard/stats',
      '/api/admin/dashboard/orders-per-day',
      '/api/admin/dashboard/revenue-per-day',
      '/api/admin/dashboard/top-transporters',
      '/api/admin/dashboard/order-status',
      '/api/admin/dashboard/fleet-utilization',
      '/api/admin/dashboard/new-customers',
      '/api/admin/dashboard/truck-types',
      '/api/admin/dashboard/order-ratio',
      '/api/admin/dashboard/avg-bid',
    ];

    for (const path of paths) {
      it(`GET ${path} returns success`, async () => {
        const admin = await seedAdminData();
        const res = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);
        expect(res.body.success).toBe(true);
      });
    }
  });

  describe('GET /api/admin/orders', () => {
    it('returns admin order list', async () => {
      const admin = await seedAdminData();
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/users', () => {
    it('returns admin users list', async () => {
      const admin = await seedAdminData();
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/fleet', () => {
    it('returns admin fleet list', async () => {
      const admin = await seedAdminData();
      const res = await request(app)
        .get('/api/admin/fleet')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/tickets', () => {
    it('returns admin tickets list', async () => {
      const admin = await seedAdminData();
      const res = await request(app)
        .get('/api/admin/tickets')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/ticket-volume', () => {
    it('returns ticket volume analytics', async () => {
      const admin = await seedAdminData();
      const res = await request(app)
        .get('/api/admin/ticket-volume')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  const createManagerViaInvite = async () => {
    const admin = await bootstrapAdminAuth(app);
    const inviteRes = await request(app)
      .post('/api/admin/managers/invite')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        categories: ['Technical Issue'],
        verificationCategories: ['driver_verification'],
        expiresInHours: 24,
      })
      .expect(201);

    const code = inviteRes.body.data.code;
    await request(app)
      .post('/api/manager/register')
      .send({
        name: 'Admin Managed Manager',
        email: 'admin.managed.manager@example.com',
        password: 'Password1',
        invitationCode: code,
      })
      .expect(201);

    const manager = await Manager.findOne({ email: 'admin.managed.manager@example.com' });
    return { admin, code, manager };
  };

  describe('POST /api/admin/managers/invite', () => {
    it('creates invitation code entry', async () => {
      const admin = await bootstrapAdminAuth(app);

      const inviteRes = await request(app)
        .post('/api/admin/managers/invite')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          categories: ['Technical Issue'],
          verificationCategories: ['driver_verification'],
          expiresInHours: 24,
        })
        .expect(201);

      const invite = await InvitationCode.findOne({ code: inviteRes.body.data.code });
      expect(invite).toBeTruthy();
    });
  });

  describe('GET /api/admin/managers/invitations', () => {
    it('returns invitation listing', async () => {
      const { admin } = await createManagerViaInvite();
      const res = await request(app)
        .get('/api/admin/managers/invitations')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/managers', () => {
    it('returns managers list', async () => {
      const { admin } = await createManagerViaInvite();
      const res = await request(app)
        .get('/api/admin/managers')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /api/admin/managers/:id/status', () => {
    it('updates manager status', async () => {
      const { admin, manager } = await createManagerViaInvite();

      await request(app)
        .patch(`/api/admin/managers/${manager._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'inactive' })
        .expect(200);

      const managerDoc = await Manager.findById(manager._id);
      expect(managerDoc.status).toBe('inactive');
    });
  });

  describe('PATCH /api/admin/managers/:id/categories', () => {
    it('updates manager category assignment', async () => {
      const { admin, manager } = await createManagerViaInvite();

      await request(app)
        .patch(`/api/admin/managers/${manager._id}/categories`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ categories: ['Payment Issue'], verificationCategories: ['transporter_verification'] })
        .expect(200);

      const managerDoc = await Manager.findById(manager._id);
      expect(managerDoc.categories).toContain('Payment Issue');
    });
  });

  describe('PUT /api/admin/thresholds', () => {
    it('upserts threshold config', async () => {
      const admin = await bootstrapAdminAuth(app);

      await request(app)
        .put('/api/admin/thresholds')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ category: 'Technical Issue', maxTicketsPerHour: 12 })
        .expect(200);

      const threshold = await ThresholdConfig.findOne({ category: 'Technical Issue' });
      expect(threshold.maxTicketsPerHour).toBe(12);
    });
  });

  describe('POST /api/admin/thresholds/reset-alert', () => {
    it('resets threshold alert flag', async () => {
      const admin = await bootstrapAdminAuth(app);

      await request(app)
        .put('/api/admin/thresholds')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ category: 'Technical Issue', maxTicketsPerHour: 12 })
        .expect(200);

      await request(app)
        .post('/api/admin/thresholds/reset-alert')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ category: 'Technical Issue' })
        .expect(200);

      const threshold = await ThresholdConfig.findOne({ category: 'Technical Issue' });
      expect(threshold.alertSent).toBe(false);
    });
  });

  describe('GET /api/admin/thresholds', () => {
    it('returns threshold configuration list', async () => {
      const admin = await bootstrapAdminAuth(app);
      const res = await request(app)
        .get('/api/admin/thresholds')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/managers/:id', () => {
    it('deletes manager record', async () => {
      const { admin, manager } = await createManagerViaInvite();

      await request(app)
        .delete(`/api/admin/managers/${manager._id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const managerDoc = await Manager.findById(manager._id);
      expect(managerDoc).toBeNull();
    });
  });
});
