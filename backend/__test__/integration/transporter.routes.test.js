import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../core/app.js';
import Transporter from '../../models/transporter.js';
import { createMockTransporterInput, createMockVehicle } from '../factories/transporter.factory.js';

let authToken;
let transporterId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
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

describe('Transporter Routes Tests', () => {
  
  describe('POST /api/transporters/register', () => {
    it('should register a new transporter successfully', async () => {
      const transporterData = createMockTransporterInput();
      transporterData.vehicles = [createMockVehicle()]
            
      const response = await request(app)
        .post('/api/transporters/register')
        .send(transporterData)
        .expect(201);              

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('email', transporterData.email);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.message).toBe('Transporter registered successfully');

      // Verify transporter exists in database
      const transporter = await Transporter.findById(response.body.data._id);
      expect(transporter).toBeTruthy();
      expect(transporter.email).toBe(transporterData.email);
    });

    it('should add transporters vehicle', async () => {
        const transporterData = createMockTransporterInput();
        transporterData.vehicles = [createMockVehicle()];

        const response = await request(app)
          .post('/api/transporters/register')
          .send(transporterData)
          .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.fleet).toHaveLength(1);
      expect(response.body.data.fleet[0].name).toBe('truck 1');

      // Verify in database
      const transporter = await Transporter.findById(response.body.data._id);
      expect(transporter.fleet).toHaveLength(1);
      expect(transporter.fleet[0].name).toBe('truck 1');
    });

    it('should create transporter with multiple vehicles', async () => {
        const transporterData = createMockTransporterInput();
        transporterData.vehicles = [createMockVehicle(), createMockVehicle({ name: 'truck 2', registration: 'TN01B2345' })];

        const response = await request(app)
          .post('/api/transporters/register')
          .send(transporterData)
          .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.fleet).toHaveLength(2);

      // Verify in database
      const transporter = await Transporter.findById(response.body.data._id);
      expect(transporter.fleet).toHaveLength(2);
      expect(transporter.fleet[0].name).toBe('truck 1');
      expect(transporter.fleet[1].name).toBe('truck 2');
    });

    it('should reject transporters without vehicles', async () => {
        const transporterData = createMockTransporterInput();
        
        const response = await request(app)
          .post('/api/transporters/register')
          .send(transporterData)
          .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Input Validation failed');

      // verify no change in database
      const transporter = await Transporter.findOne({ email: transporterData.email });
      expect(transporter).toBeNull();
    });

    it('should return 409 if email already exists', async () => {
      const transporterData = createMockTransporterInput();
      transporterData.vehicles = [createMockVehicle()];
      
      // Register first transporter
      await request(app)
        .post('/api/transporters/register')
        .send(transporterData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/transporters/register')
        .send(transporterData)
        .expect(409);  

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Key already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/transporters/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const transporterData = createMockTransporterInput({ email: 'invalid-email' });
      transporterData.vehicles = [createMockVehicle()];

      await request(app)
        .post('/api/transporters/register')
        .send(transporterData)
        .expect(400);
    });

    it('should hash password before saving', async () => {
      const transporterData = createMockTransporterInput();
      transporterData.vehicles = [createMockVehicle()];

      const response = await request(app)
        .post('/api/transporters/register')
        .send(transporterData)
        .expect(201);


      const transporter = await Transporter.findById(response.body.data._id);
      expect(transporter.password).not.toBe(transporterData.password);
      expect(transporter.password).toHaveLength(60); // bcrypt hash length
    });
  });

  describe('Authenticated Routes', () => {
    beforeEach(async () => {
      // Register and login a transporter for authenticated tests
      const transporterData = createMockTransporterInput();
      transporterData.vehicles = [createMockVehicle()];
      
      const registerResponse = await request(app)
        .post('/api/transporters/register')
        .send(transporterData);
      
      transporterId = registerResponse.body.data._id;

      // Mock login to get token (adjust based on your auth implementation)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: transporterData.email, 
          password: transporterData.password,
          role: 'transporter'
        });
      
      authToken = loginResponse.body.data.accessToken;
    });

    describe('GET /api/transporters/profile', () => {
      it('should return trnapsorters profile', async () => {
        const response = await request(app)
          .get('/api/transporters/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('companyName');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('orderCount');
        expect(response.body.data).toHaveProperty('profileImage');
        expect(response.body.data).toHaveProperty('fleetCount');
        expect(response.body.data).not.toHaveProperty('password');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get('/api/transporters/profile')
          .expect(401);
      });
    });

    describe('PUT /api/transporters/profile', () => {
      it('should update transporter profile', async () => {
        const updates = { 
          name: 'UpdatedName',
          primary_contact: '9876543210'
        };

        const response = await request(app)
          .put('/api/transporters/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updates.name);
        expect(response.body.data.primart_contact).toBe(updates.primart_contact);

        // Verify update in database
        const transporter = await Transporter.findById(transporterId);
        expect(transporter.name).toBe(updates.name);
      });

      it('should return 400 for empty update', async () => {
        await request(app)
          .put('/api/transporters/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });

      it('should validate email format on update', async () => {
        const updates = { email: 'invalid-email' };

        const response = await request(app)
          .put('/api/transporters/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(400);

        expect(response.body.success).toBe(false);

        // Verify no update in database
        const transporter = await Transporter.findById(transporterId);
        expect(transporter.email).not.toBe(updates.email);
        });
    
    });

    describe('PATCH /api/transporters/password', () => {
        it('should update password successfully', async () => {
            const passwordData = {
            oldPassword: 'Password1',
            newPassword: 'newPassword123'
            };

            const response = await request(app)
            .patch('/api/transporters/password')
            .set('Authorization', `Bearer ${authToken}`)
            .send(passwordData)
            .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password changed successfully');
        });

        it('should return 400 for missing old password', async () => {
            await request(app)
            .patch('/api/transporters/password')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ newPassword: 'newPassword123' })
            .expect(400);
        });

        it('should return 401 for incorrect password', async () => {
            await request(app)
            .patch('/api/transporters/password')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ oldPassword: 'Password3', newPassword: 'newPassword123' })
            .expect(401);
        });

        it('should return 400 for weak new password', async () => {
            await request(app)
            .patch('/api/transporters/password')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ oldPassword: 'Password1', newPassword: '123' })
            .expect(400);
        });
    });
  });
});
