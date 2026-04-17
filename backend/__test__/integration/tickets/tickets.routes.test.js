import request from 'supertest';
import app from '../../../core/app.js';
import Ticket from '../../../models/ticket.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapManagerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';

const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgN4r2GsAAAAASUVORK5CYII=', 'base64');

describe('Tickets Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  const createCustomerTicket = async () => {
    const customer = await bootstrapCustomerAuth(app);
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        category: 'Account Issue',
        subject: 'Need account help',
        message: 'Please help',
      })
      .expect(201);

    return { customer, ticketId: createRes.body.data._id };
  };

  describe('POST /api/tickets', () => {
    it('creates ticket with attachment and persists initial message', async () => {
      const customer = await bootstrapCustomerAuth(app);

      const createRes = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customer.token}`)
        .field('category', 'Technical Issue')
        .field('subject', 'Cannot open dashboard')
        .field('message', 'App shows blank screen')
        .attach('photo', pngBuffer, { filename: 'ticket.png', contentType: 'image/png' })
        .expect(201);

      const ticket = await Ticket.findById(createRes.body.data._id);
      expect(ticket).toBeTruthy();
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].attachment).toContain('/uploads/ticket-attachments/');
    });

    it('supports transporter role as ticket owner', async () => {
      const transporter = await bootstrapTransporterAuth(app, { verified: true });

      const createRes = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({
          category: 'Payment Issue',
          subject: 'Payout missing',
          message: 'No payout visible yet',
        })
        .expect(201);

      const ticket = await Ticket.findById(createRes.body.data._id);
      expect(ticket.userRole).toBe('transporter');
    });
  });

  describe('GET /api/tickets/my', () => {
    it('returns current user tickets', async () => {
      const { customer } = await createCustomerTicket();

      const res = await request(app)
        .get('/api/tickets/my')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/tickets/:id', () => {
    it('forbids non-owner user from reading ticket details', async () => {
      const { ticketId } = await createCustomerTicket();
      const anotherCustomer = await bootstrapCustomerAuth(app, { phone: '9333344444' });

      await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${anotherCustomer.token}`)
        .expect(403);
    });
  });

  describe('POST /api/tickets/:id/reply', () => {
    it('forbids non-owner user from posting reply', async () => {
      const { ticketId } = await createCustomerTicket();
      const anotherCustomer = await bootstrapCustomerAuth(app, { phone: '9444455555' });

      await request(app)
        .post(`/api/tickets/${ticketId}/reply`)
        .set('Authorization', `Bearer ${anotherCustomer.token}`)
        .send({ text: 'unauthorized reply' })
        .expect(403);
    });
  });

  describe('POST /api/tickets/manager/:id/reply', () => {
    it('adds manager reply and moves ticket to in_progress', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const manager = await bootstrapManagerAuth(app, { categories: ['Technical Issue'] });

      const createRes = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          category: 'Technical Issue',
          subject: 'Cannot open dashboard',
          message: 'App shows blank screen',
        })
        .expect(201);

      const ticketId = createRes.body.data._id;

      await request(app)
        .post(`/api/tickets/manager/${ticketId}/reply`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ text: 'Acknowledged. Investigating.' })
        .expect(200);

      const ticket = await Ticket.findById(ticketId);
      expect(ticket.status).toBe('in_progress');
      expect(ticket.messages[ticket.messages.length - 1].sender).toBe('manager');
    });
  });

  describe('PATCH /api/tickets/manager/:id/status', () => {
    it('updates ticket status to closed', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const manager = await bootstrapManagerAuth(app, { categories: ['Technical Issue'] });

      const createRes = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          category: 'Technical Issue',
          subject: 'Cannot open dashboard',
          message: 'App shows blank screen',
        })
        .expect(201);

      const ticketId = createRes.body.data._id;

      await request(app)
        .patch(`/api/tickets/manager/${ticketId}/status`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ status: 'closed' })
        .expect(200);

      const ticket = await Ticket.findById(ticketId);
      expect(ticket.status).toBe('closed');
    });
  });

  describe('POST /api/tickets/:id/reopen', () => {
    it('reopens closed ticket back to in_progress', async () => {
      const customer = await bootstrapCustomerAuth(app);
      const manager = await bootstrapManagerAuth(app, { categories: ['Technical Issue'] });

      const createRes = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          category: 'Technical Issue',
          subject: 'Cannot open dashboard',
          message: 'App shows blank screen',
        })
        .expect(201);

      const ticketId = createRes.body.data._id;

      await request(app)
        .patch(`/api/tickets/manager/${ticketId}/status`)
        .set('Authorization', `Bearer ${manager.token}`)
        .send({ status: 'closed' })
        .expect(200);

      await request(app)
        .post(`/api/tickets/${ticketId}/reopen`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      const ticket = await Ticket.findById(ticketId);
      expect(ticket.status).toBe('in_progress');
    });
  });
});
