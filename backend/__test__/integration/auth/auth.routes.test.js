import request from 'supertest';
import app from '../../../core/app.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';

describe('Auth Routes', () => {
  const base = '/api/auth';

  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  it('returns 400 on missing login fields', async () => {
    const res = await request(app).post(base + '/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app).post(base + '/login').send({
      email: 'unknown@example.com',
      password: 'WrongPass1',
      role: 'customer',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
