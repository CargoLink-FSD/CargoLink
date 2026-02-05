import request from 'supertest';
import app from '../../core/app.js';
import mongoose from 'mongoose';


let db;
beforeAll(async () => {
  db = await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  // clean database after each test
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Auth Routes', () => {
  const base = '/api/auth';
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
