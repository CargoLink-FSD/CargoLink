import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../core/app.js';
import Order from '../../models/order.js';
import Bid from '../../models/bids.js';
import Customer from '../../models/customer.js';
import Transporter from '../../models/transporter.js';
import { checkAndExpireOrders } from '../../core/scheduler.js';

let customerId;
let transporterId;
let customerToken;
let transporterToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  // Clean database after each test
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Order Expiry Integration Tests', () => {
  
  beforeEach(async () => {
    // Create a test customer
    const customerData = {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'customer@test.com',
      password: 'Test@1234',
      phone: '1234567890'
    };
    
    const customerRes = await request(app)
      .post('/api/customers/register')
      .send(customerData);
    
    customerId = customerRes.body.data._id;
    
    // Login customer
    const customerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: customerData.email, password: customerData.password });
    
    customerToken = customerLoginRes.body.data.token;

    // Create a test transporter
    const transporterData = {
      name: 'Test Transporter',
      email: 'transporter@test.com',
      password: 'Test@1234',
      primary_contact: '9876543210',
      fleet: [{
        truck_type: 'Open Body',
        registration: 'TEST1234',
        capacity: 1000,
        status: 'Available'
      }]
    };
    
    const transporterRes = await request(app)
      .post('/api/transporters/register')
      .send(transporterData);
    
    transporterId = transporterRes.body.data._id;
    
    // Login transporter
    const transporterLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: transporterData.email, password: transporterData.password });
    
    transporterToken = transporterLoginRes.body.data.token;
  });

  describe('Order Model Expiry Fields', () => {
    it('should automatically set bidding_closes_at and expires_at when order is created', async () => {
      const scheduledDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      
      const orderData = {
        pickup: { street: '123 Main St', city: 'TestCity', state: 'TestState', pin: '12345' },
        delivery: { street: '456 Oak Ave', city: 'TestCity', state: 'TestState', pin: '12345' },
        scheduled_at: scheduledDate,
        distance: 100,
        max_price: 5000,
        goods_type: 'Electronics',
        weight: 50,
        truck_type: 'Open Body',
        description: 'Test order'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      const orderId = response.body.data.orderId;
      const order = await Order.findById(orderId);

      expect(order.bidding_closes_at).toBeDefined();
      expect(order.expires_at).toBeDefined();
      
      // bidding_closes_at should be 2 days before scheduled_at
      const expectedBiddingClosesAt = new Date(scheduledDate.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(Math.abs(order.bidding_closes_at.getTime() - expectedBiddingClosesAt.getTime())).toBeLessThan(1000);
      
      // expires_at should be 1 day after bidding_closes_at
      const expectedExpiresAt = new Date(order.bidding_closes_at.getTime() + 24 * 60 * 60 * 1000);
      expect(Math.abs(order.expires_at.getTime() - expectedExpiresAt.getTime())).toBeLessThan(1000);
    });
  });

  describe('Order Expiry Scheduler', () => {
    it('should mark order as Rejected when expires_at is passed and no bids exist', async () => {
      // Create an order with expires_at in the past
      const scheduledDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
      const expiredDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      const order = new Order({
        customer_id: customerId,
        pickup: { street: '123 Main St', city: 'TestCity', state: 'TestState', pin: '12345' },
        delivery: { street: '456 Oak Ave', city: 'TestCity', state: 'TestState', pin: '12345' },
        scheduled_at: scheduledDate,
        distance: 100,
        max_price: 5000,
        goods_type: 'Electronics',
        weight: 50,
        truck_type: 'Open Body',
        description: 'Test order',
        status: 'Placed',
        expires_at: expiredDate,
        bidding_closes_at: new Date(expiredDate.getTime() - 24 * 60 * 60 * 1000)
      });
      
      await order.save();

      // Run the scheduler
      await checkAndExpireOrders();

      // Check that order is marked as Rejected
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('Rejected');
    });

    it('should mark order as Expired when expires_at is passed and bids exist but not accepted', async () => {
      // Create an order with expires_at in the past
      const scheduledDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
      const expiredDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      const order = new Order({
        customer_id: customerId,
        pickup: { street: '123 Main St', city: 'TestCity', state: 'TestState', pin: '12345' },
        delivery: { street: '456 Oak Ave', city: 'TestCity', state: 'TestState', pin: '12345' },
        scheduled_at: scheduledDate,
        distance: 100,
        max_price: 5000,
        goods_type: 'Electronics',
        weight: 50,
        truck_type: 'Open Body',
        description: 'Test order',
        status: 'Placed',
        expires_at: expiredDate,
        bidding_closes_at: new Date(expiredDate.getTime() - 24 * 60 * 60 * 1000)
      });
      
      await order.save();

      // Create a bid for this order
      const bid = new Bid({
        order_id: order._id,
        transporter_id: transporterId,
        bid_amount: 4500,
        notes: 'Test bid'
      });
      await bid.save();

      // Run the scheduler
      await checkAndExpireOrders();

      // Check that order is marked as Expired
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('Expired');
    });

    it('should not mark orders as expired if expires_at has not passed', async () => {
      // Create an order with expires_at in the future
      const scheduledDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const futureExpiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      
      const order = new Order({
        customer_id: customerId,
        pickup: { street: '123 Main St', city: 'TestCity', state: 'TestState', pin: '12345' },
        delivery: { street: '456 Oak Ave', city: 'TestCity', state: 'TestState', pin: '12345' },
        scheduled_at: scheduledDate,
        distance: 100,
        max_price: 5000,
        goods_type: 'Electronics',
        weight: 50,
        truck_type: 'Open Body',
        description: 'Test order',
        status: 'Placed',
        expires_at: futureExpiryDate,
        bidding_closes_at: new Date(futureExpiryDate.getTime() - 24 * 60 * 60 * 1000)
      });
      
      await order.save();

      // Run the scheduler
      await checkAndExpireOrders();

      // Check that order is still Placed
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('Placed');
    });

    it('should not affect orders that are already Assigned or in other statuses', async () => {
      // Create an order with expires_at in the past but status is Assigned
      const scheduledDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
      const expiredDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      const order = new Order({
        customer_id: customerId,
        pickup: { street: '123 Main St', city: 'TestCity', state: 'TestState', pin: '12345' },
        delivery: { street: '456 Oak Ave', city: 'TestCity', state: 'TestState', pin: '12345' },
        scheduled_at: scheduledDate,
        distance: 100,
        max_price: 5000,
        goods_type: 'Electronics',
        weight: 50,
        truck_type: 'Open Body',
        description: 'Test order',
        status: 'Assigned',
        assigned_transporter_id: transporterId,
        final_price: 4500,
        expires_at: expiredDate,
        bidding_closes_at: new Date(expiredDate.getTime() - 24 * 60 * 60 * 1000)
      });
      
      await order.save();

      // Run the scheduler
      await checkAndExpireOrders();

      // Check that order is still Assigned
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe('Assigned');
    });
  });
});
