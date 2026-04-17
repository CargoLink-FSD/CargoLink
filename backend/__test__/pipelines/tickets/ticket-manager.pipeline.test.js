import request from 'supertest';
import app from '../../../core/app.js';
import Ticket from '../../../models/ticket.js';
import Manager from '../../../models/manager.js';
import InvitationCode from '../../../models/invitationCode.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth } from '../../utils/auth-flow.js';

describe('Ticket + Manager Pipeline', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  it('admin invite -> manager register -> customer ticket -> manager handles -> customer reopens', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cargolink.com',
        password: 'admin@123',
        role: 'admin',
      })
      .expect(200);

    const adminToken = adminLogin.body.data.accessToken;

    const inviteRes = await request(app)
      .post('/api/admin/managers/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categories: ['Technical Issue', 'Account Issue'],
        verificationCategories: ['driver_verification'],
        expiresInHours: 24,
      })
      .expect(201);

    expect(inviteRes.body.success).toBe(true);
    const invitationCode = inviteRes.body.data.code;

    const inviteDoc = await InvitationCode.findOne({ code: invitationCode });
    expect(inviteDoc).toBeTruthy();
    expect(inviteDoc.used).toBe(false);

    const managerRegister = await request(app)
      .post('/api/manager/register')
      .send({
        name: 'Manager One',
        email: 'manager.one@example.com',
        password: 'Password1',
        invitationCode,
      })
      .expect(201);

    const managerToken = managerRegister.body.data.accessToken;

    const manager = await Manager.findOne({ email: 'manager.one@example.com' });
    expect(manager).toBeTruthy();
    expect(manager.status).toBe('active');
    expect(manager.categories).toContain('Technical Issue');

    const consumedInviteDoc = await InvitationCode.findOne({ code: invitationCode });
    expect(consumedInviteDoc.used).toBe(true);
    expect(consumedInviteDoc.usedBy.toString()).toBe(manager._id.toString());

    const customer = await bootstrapCustomerAuth(app);

    const ticketCreate = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        category: 'Technical Issue',
        subject: 'App issue while loading orders',
        message: 'The app hangs on dashboard load',
        priority: 'high',
      })
      .expect(201);

    expect(ticketCreate.body.success).toBe(true);
    const ticketId = ticketCreate.body.data._id;

    let ticketDoc = await Ticket.findById(ticketId);
    expect(ticketDoc).toBeTruthy();
    expect(ticketDoc.assignedManager.toString()).toBe(manager._id.toString());
    expect(ticketDoc.messages).toHaveLength(1);
    expect(ticketDoc.messages[0].sender).toBe('customer');

    const managerAll = await request(app)
      .get('/api/tickets/manager/all')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerAll.body.success).toBe(true);
    expect(managerAll.body.data.some((t) => t._id.toString() === ticketId.toString())).toBe(true);

    await request(app)
      .post(`/api/tickets/manager/${ticketId}/reply`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ text: 'We are checking this issue. Please share browser version.' })
      .expect(200);

    ticketDoc = await Ticket.findById(ticketId);
    expect(ticketDoc.status).toBe('in_progress');
    expect(ticketDoc.messages[ticketDoc.messages.length - 1].sender).toBe('manager');

    await request(app)
      .patch(`/api/tickets/manager/${ticketId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'closed' })
      .expect(200);

    ticketDoc = await Ticket.findById(ticketId);
    expect(ticketDoc.status).toBe('closed');

    await request(app)
      .post(`/api/tickets/${ticketId}/reopen`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);

    ticketDoc = await Ticket.findById(ticketId);
    expect(ticketDoc.status).toBe('in_progress');

    const anotherCustomer = await bootstrapCustomerAuth(app, { phone: '9111222333' });

    await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${anotherCustomer.token}`)
      .expect(403);
  });
});
