import request from 'supertest';
import app from '../../../core/app.js';
import Order from '../../../models/order.js';
import Bid from '../../../models/bids.js';
import Trip from '../../../models/trip.js';
import { clearInMemoryDb, connectInMemoryDb, disconnectInMemoryDb } from '../../utils/inMemoryDb.js';
import { bootstrapCustomerAuth, bootstrapDriverAuth, bootstrapTransporterAuth } from '../../utils/auth-flow.js';
import { createMockBidInput, createMockOrderInput } from '../../factories/order.factory.js';

describe('Orders + Trips Lifecycle Pipeline', () => {
  beforeAll(async () => {
    await connectInMemoryDb();
  });

  afterEach(async () => {
    await clearInMemoryDb();
  });

  afterAll(async () => {
    await disconnectInMemoryDb();
  });

  it('place -> bid -> accept -> assigned -> start -> transit -> completed', async () => {
    const customer = await bootstrapCustomerAuth(app);
    const transporter = await bootstrapTransporterAuth(app, { verified: true });
    const driver = await bootstrapDriverAuth(app);

    await request(app)
      .post(`/api/drivers/apply/${transporter.user._id}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ message: 'Ready for assignment' })
      .expect(201);

    const pendingRes = await request(app)
      .get('/api/transporters/driver-requests')
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    const applicationId = pendingRes.body.data[0]._id;

    await request(app)
      .post(`/api/transporters/driver-requests/${applicationId}/accept`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    const placeOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send(createMockOrderInput())
      .expect(201);

    const orderId = placeOrderRes.body.data.orderId;

    let orderDoc = await Order.findById(orderId);
    expect(orderDoc.status).toBe('Placed');
    expect(orderDoc.assigned_transporter_id).toBeFalsy();

    const outsiderTransporter = await bootstrapTransporterAuth(app, {
      verified: true,
      overrides: {
        primary_contact: '9001122334',
      },
    });

    await request(app)
      .post(`/api/orders/${orderId}/bids`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .send(createMockBidInput())
      .expect(201);

    const outsiderBidRes = await request(app)
      .post(`/api/orders/${orderId}/bids`)
      .set('Authorization', `Bearer ${outsiderTransporter.token}`)
      .send(createMockBidInput({ bidAmount: 24000 }))
      .expect(201);

    let allBids = await Bid.find({ order_id: orderId });
    expect(allBids).toHaveLength(2);

    const bidsRes = await request(app)
      .get(`/api/orders/${orderId}/bids`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);

    expect(Array.isArray(bidsRes.body.data)).toBe(true);
    const bidId = bidsRes.body.data[0]._id;

    await request(app)
      .delete(`/api/orders/${orderId}/bids/${outsiderBidRes.body.data.bidId}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);

    allBids = await Bid.find({ order_id: orderId });
    expect(allBids).toHaveLength(1);
    expect(allBids[0]._id.toString()).toBe(bidId.toString());

    await request(app)
      .post(`/api/orders/${orderId}/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);

    const orderAfterAccept = await Order.findById(orderId);
    expect(orderAfterAccept.status).toBe('Assigned');
    expect(orderAfterAccept.assigned_transporter_id.toString()).toBe(transporter.user._id.toString());
    expect(typeof orderAfterAccept.pickup_otp).toBe('string');
    expect(typeof orderAfterAccept.delivery_otp).toBe('string');

    const bidsPostAccept = await Bid.find({ order_id: orderId });
    expect(bidsPostAccept).toHaveLength(0);

    const transporterOrderView = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);
    expect(transporterOrderView.body.success).toBe(true);
    expect(transporterOrderView.body.data._id.toString()).toBe(orderId.toString());

    await request(app)
      .post(`/api/orders/${orderId}/bids`)
      .set('Authorization', `Bearer ${outsiderTransporter.token}`)
      .send(createMockBidInput({ bidAmount: 23000 }))
      .expect(400);

    const tripPayload = {
      order_ids: [orderId],
      assigned_vehicle_id: transporter.fleet[0]._id,
      assigned_driver_id: driver.user._id,
      planned_start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      stops: [
        {
          type: 'Pickup',
          order_id: orderId,
          address: {
            street: orderAfterAccept.pickup.street,
            city: orderAfterAccept.pickup.city,
            state: orderAfterAccept.pickup.state,
            pin: orderAfterAccept.pickup.pin,
            coordinates: orderAfterAccept.pickup.coordinates,
          },
        },
        {
          type: 'Dropoff',
          order_id: orderId,
          address: {
            street: orderAfterAccept.delivery.street,
            city: orderAfterAccept.delivery.city,
            state: orderAfterAccept.delivery.state,
            pin: orderAfterAccept.delivery.pin,
            coordinates: orderAfterAccept.delivery.coordinates,
          },
        },
      ],
    };

    const createTripRes = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${transporter.token}`)
      .send(tripPayload)
      .expect(201);

    const tripId = createTripRes.body.data._id;

    const tripDocAfterCreate = await Trip.findById(tripId);
    expect(tripDocAfterCreate.status).toBe('Scheduled');
    expect(tripDocAfterCreate.order_ids.map(id => id.toString())).toContain(orderId.toString());

    const orderAfterTripCreate = await Order.findById(orderId);
    expect(orderAfterTripCreate.status).toBe('Scheduled');

    await request(app)
      .post(`/api/trips/driver/${tripId}/start`)
      .set('Authorization', `Bearer ${driver.token}`)
      .expect(200);

    let tripDoc = await Trip.findById(tripId);
    expect(tripDoc.status).toBe('Active');

    const orderAfterStart = await Order.findById(orderId);
    expect(orderAfterStart.status).toBe('Started');

    const tripDetailsRes = await request(app)
      .get(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    const pickupStop = tripDetailsRes.body.data.stops.find((s) => s.type === 'Pickup');

    const orderWithOtp = await Order.findById(orderId);

    await request(app)
      .post(`/api/trips/driver/${tripId}/stops/${pickupStop._id}/confirm-pickup`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ otp: '111111' })
      .expect(400);

    await request(app)
      .post(`/api/trips/driver/${tripId}/stops/${pickupStop._id}/confirm-pickup`)
      .set('Authorization', `Bearer ${driver.token}`)
      .send({ otp: orderWithOtp.pickup_otp })
      .expect(200);

    const orderInTransit = await Order.findById(orderId);
    expect(orderInTransit.status).toBe('In Transit');

    const driverTripView = await request(app)
      .get(`/api/trips/driver/${tripId}`)
      .set('Authorization', `Bearer ${driver.token}`)
      .expect(200);
    expect(driverTripView.body.success).toBe(true);
    expect(driverTripView.body.data._id.toString()).toBe(tripId.toString());
    expect(driverTripView.body.data.status).toBe('Active');

    const transporterTripView = await request(app)
      .get(`/api/trips/${tripId}`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);
    expect(transporterTripView.body.success).toBe(true);
    expect(transporterTripView.body.data._id.toString()).toBe(tripId.toString());

    await request(app)
      .post(`/api/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${transporter.token}`)
      .expect(200);

    const finalOrder = await Order.findById(orderId);
    expect(finalOrder.status).toBe('Payment Pending');

    tripDoc = await Trip.findById(tripId);
    expect(tripDoc.status).toBe('Completed');

    const customerOrderView = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200);
    expect(customerOrderView.body.data.status).toBe('Payment Pending');
  });
});
