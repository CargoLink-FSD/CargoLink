import request from 'supertest';
import app from '../../../core/app.js';
import Chat from '../../../models/chat.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockBidInput, createMockOrderInput } from '../../factories/order.factory.js';

describe('Chat Integration', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  const createAssignedOrder = async () => {
    const customer = await bootstrapCustomerAuth(app);
    const transporter = await bootstrapTransporterAuth(app, { verified: true });

    const placeRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(createMockOrderInput())
      .expect(201);

    const orderId = placeRes.body.data.orderId;

    const bidRes = await request(app)
      .post(`/api/orders/${orderId}/bids`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .send(createMockBidInput())
      .expect(201);

    await request(app)
      .post(`/api/orders/${orderId}/bids/${bidRes.body.data.bidId}/accept`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);

    return { customer, transporter, orderId };
  };

  describe('POST /api/chat/orders/:orderId', () => {
    it('creates chat with first message', async () => {
      const { customer, orderId } = await createAssignedOrder();

      await request(app)
        .post(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ message: 'Please confirm pickup timing.' })
        .expect(200);

      const chatDoc = await Chat.findOne({ order: orderId });
      expect(chatDoc).toBeTruthy();
      expect(chatDoc.messages).toHaveLength(1);
    });

    it('forbids unrelated transporter from posting', async () => {
      const { orderId } = await createAssignedOrder();
      const outsider = await bootstrapTransporterAuth(app, {
        verified: true,
        overrides: { primary_contact: '9012345678' },
      });

      await request(app)
        .post(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({ message: 'Unauthorized message' })
        .expect(403);

      const chatDoc = await Chat.findOne({ order: orderId });
      expect(chatDoc).toBeNull();
    });
  });

  describe('GET /api/chat/orders/:orderId', () => {
    it('returns message history for participant', async () => {
      const { customer, transporter, orderId } = await createAssignedOrder();

      await request(app)
        .post(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ message: 'Please confirm pickup timing.' })
        .expect(200);

      await request(app)
        .post(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${transporter.token}`)
        .send({ message: 'Pickup will happen tomorrow morning.' })
        .expect(200);

      const historyRes = await request(app)
        .get(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(historyRes.body.success).toBe(true);
      expect(historyRes.body.data.messages).toHaveLength(2);
    });

    it('forbids unrelated transporter from reading chat', async () => {
      const { orderId } = await createAssignedOrder();
      const outsider = await bootstrapTransporterAuth(app, {
        verified: true,
        overrides: { primary_contact: '9023456789' },
      });

      await request(app)
        .get(`/api/chat/orders/${orderId}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(403);
    });
  });
});
