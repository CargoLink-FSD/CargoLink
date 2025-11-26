import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../core/app.js';
import Customer from '../../models/customer.js';
import { createMockCustomerInput, createMockAddress } from '../factories/customer.factory.js';

let authToken;
let customerId;

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

describe('Customer Routes Integration Tests', () => {
  
  describe('POST /api/customers/register', () => {
    it('should register a new customer successfully', async () => {
      const customerData = createMockCustomerInput();
      
      const response = await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(201);      

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('email', customerData.email);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.message).toBe('Customer registered successfully');

      // Verify customer exists in database
      const customer = await Customer.findById(response.body.data._id);
      expect(customer).toBeTruthy();
      expect(customer.email).toBe(customerData.email);
    });

    it('should create customer with address', async () => {
      const customerData = createMockCustomerInput();

      const response = await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(201);

      expect(response.body.data.addresses).toBeDefined();
      expect(response.body.data.addresses).toHaveLength(1);
      expect(response.body.data.addresses[0].address_label).toBe('Home');
    });

    it('should create customer without address', async () => {
      const customerData = createMockCustomerInput({ address: undefined });

      const response = await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(201);
      expect(response.body.data.addresses).toBeDefined();
      expect(response.body.data.addresses).toHaveLength(0);
    });

    it('should return 409 if email already exists', async () => {
      const customerData = createMockCustomerInput();
            
      // Register first customer
      const res1 = await request(app)
      .post('/api/customers/register')
      .send(customerData)
      .expect(201);
      

      // Try to register with same email
      const response = await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(409);  

      

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Key already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/customers/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const customerData = createMockCustomerInput({ email: 'invalid-email' });

      await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(400);
    });

    it('should hash password before saving', async () => {
      const customerData = createMockCustomerInput();

      const response = await request(app)
        .post('/api/customers/register')
        .send(customerData)
        .expect(201);

      const customer = await Customer.findById(response.body.data._id);
      expect(customer.password).not.toBe(customerData.password);
      expect(customer.password).toHaveLength(60); // bcrypt hash length
    });
  });

  describe('Authenticated Routes', () => {
    beforeEach(async () => {
      // Register and login a customer for authenticated tests
      const customerData = createMockCustomerInput();
      
      const registerResponse = await request(app)
        .post('/api/customers/register')
        .send(customerData);
      
      customerId = registerResponse.body.data._id;

      // Mock login to get token (adjust based on your auth implementation)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: customerData.email, 
          password: customerData.password,
          role: 'customer'
        });
      
      authToken = loginResponse.body.data.accessToken;
    });

    describe('GET /api/customers/profile', () => {
      it('should return customer profile', async () => {
        const response = await request(app)
          .get('/api/customers/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('firstName');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('orderCount');
        expect(response.body.data).toHaveProperty('profileImage');
        expect(response.body.data).not.toHaveProperty('password');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get('/api/customers/profile')
          .expect(401);
      });
    });

    describe('PUT /api/customers/profile', () => {
      it('should update customer profile', async () => {
        const updates = { 
          firstName: 'UpdatedName',
          phone: '9876543210'
        };

        const response = await request(app)
          .put('/api/customers/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.firstName).toBe(updates.firstName);
        expect(response.body.data.phone).toBe(updates.phone);

        // Verify update in database
        const customer = await Customer.findById(customerId);
        expect(customer.firstName).toBe(updates.firstName);
      });

      it('should return 400 for empty update', async () => {
        await request(app)
          .put('/api/customers/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });

      it('should validate email format on update', async () => {
        const updates = { email: 'invalid-email' };

        const response = await request(app)
          .put('/api/customers/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(400);

        expect(response.body.success).toBe(false);

        // Verify no update in database
        const customer = await Customer.findById(customerId);
        expect(customer.email).not.toBe(updates.email);
      });

    });

    describe('GET /api/customers/addresses', () => {
      it('should return all customer addresses', async () => {
        const response = await request(app)
          .get('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('customerAddresses');
        expect(Array.isArray(response.body.data.customerAddresses.addresses)).toBe(true);
        expect(response.body.data.customerAddresses.addresses.length).toBeGreaterThan(0);
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get('/api/customers/addresses')
          .expect(401);
      });
    });

    describe('POST /api/customers/addresses', () => {
      it('should add new address', async () => {
        const newAddress = createMockAddress({ address_label: 'Work' });

        const response = await request(app)
          .post('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newAddress)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.addresses).toBeDefined();

        // Verify address was added
        const customer = await Customer.findById(customerId);
        expect(customer.addresses.length).toBeGreaterThan(1);
        expect(customer.addresses.some(addr => addr.address_label === 'Work')).toBe(true);
      });

      it('should return 400 for invalid address data', async () => {
          const newAddress = createMockAddress({ address_label: 'Work', randomExtraField: 'Should be ignored'});

          const response = await request(app)
          .post('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newAddress)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Verify address was added without extra field
        const customer = await Customer.findById(customerId);
        const addedAddress = customer.addresses.find(addr => addr.address_label === 'Work');
        expect(addedAddress).toBeDefined();
        expect(addedAddress.randomExtraField).toBeUndefined();
      });

      it('should add address ignoring extra data', async () => {
        await request(app)
          .post('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ street: 'Incomplete' })
          .expect(400);
      });


      it('should validate pin code format', async () => {
        const invalidAddress = createMockAddress({ pin: 'invalid' });

        await request(app)
          .post('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAddress)
          .expect(400);
      });
    });

    describe('DELETE /api/customers/addresses/:addressId', () => {
      it('should remove address by index', async () => {
        // First add multiple addresses
        const address1 = createMockAddress({ address_label: 'Work' });
        await request(app)
          .post('/api/customers/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(address1);

        // Remove first address
        const response = await request(app)
          .delete('/api/customers/addresses/0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify address was removed
        const customer = await Customer.findById(customerId);
        expect(customer.addresses.length).toBe(1);
        expect(customer.addresses[0].address_label).toBe('Work');
      });

      it('should return 400 for invalid address index', async () => {
        await request(app)
          .delete('/api/customers/addresses/invalid')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return 400 for out of range index', async () => {
        await request(app)
          .delete('/api/customers/addresses/9')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return 400 for negative index', async () => {
        await request(app)
          .delete('/api/customers/addresses/-1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('PATCH /api/customers/password', () => {
      it('should update password successfully', async () => {
        const passwordData = {
          oldPassword: 'Password1',
          newPassword: 'newPassword123'
        };

        const response = await request(app)
          .patch('/api/customers/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send(passwordData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Password changed successfully');
      });

      it('should return 400 for missing old password', async () => {
        await request(app)
          .patch('/api/customers/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ newPassword: 'newPassword123' })
          .expect(400);
      });

      it('should return 401 for incorrect password', async () => {
        await request(app)
          .patch('/api/customers/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ oldPassword: 'Password3', newPassword: 'newPassword123' })
          .expect(401);
      });

      it('should return 400 for weak new password', async () => {
        await request(app)
          .patch('/api/customers/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ oldPassword: 'Password1', newPassword: '123' })
          .expect(400);
      });
    });
  });
});
