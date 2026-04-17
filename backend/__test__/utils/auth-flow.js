import request from 'supertest';
import Customer from '../../models/customer.js';
import Transporter from '../../models/transporter.js';
import Driver from '../../models/driver.js';
import Fleet from '../../models/fleet.js';
import { createMockCustomerInput } from '../factories/customer.factory.js';
import { createMockTransporterInput, createMockVehicle } from '../factories/transporter.factory.js';
import { createMockDriverInput } from '../factories/driver.factory.js';
import Manager from '../../models/manager.js';

const uniqueEmail = (prefix) => `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
const uniqueRegistration = () => {
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  const series = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `TN01${series}${suffix}`;
};

export const bootstrapCustomerAuth = async (app, overrides = {}) => {
  const payload = createMockCustomerInput({
    email: uniqueEmail('customer'),
    ...overrides,
  });

  await request(app).post('/api/customers/register').send(payload).expect(201);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: payload.email,
      password: payload.password,
      role: 'customer',
    })
    .expect(200);

  const customer = await Customer.findOne({ email: payload.email });

  return {
    token: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
    user: customer,
    payload,
  };
};

export const bootstrapTransporterAuth = async (app, { verified = true, overrides = {}, vehicle = null } = {}) => {
  const defaultVehicle = vehicle || createMockVehicle({
    registration: uniqueRegistration(),
    name: `truck-${Math.floor(Math.random() * 10000)}`,
  });

  const transporterPayload = createMockTransporterInput({
    email: uniqueEmail('transporter'),
    vehicles: [defaultVehicle],
    ...overrides,
  });

  await request(app).post('/api/transporters/register').send(transporterPayload).expect(201);

  let transporter = await Transporter.findOne({ email: transporterPayload.email });

  if (verified) {
    transporter = await Transporter.findByIdAndUpdate(
      transporter._id,
      {
        $set: {
          isVerified: true,
          verificationStatus: 'approved',
        },
      },
      { new: true }
    );
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: transporterPayload.email,
      password: transporterPayload.password,
      role: 'transporter',
    })
    .expect(200);

  const fleet = await Fleet.find({ transporter_id: transporter._id });

  return {
    token: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
    user: transporter,
    payload: transporterPayload,
    fleet,
  };
};

export const bootstrapDriverAuth = async (app, overrides = {}) => {
  const driverPayload = createMockDriverInput({
    email: uniqueEmail('driver'),
    ...overrides,
  });

  await request(app).post('/api/drivers/register').send(driverPayload).expect(201);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: driverPayload.email,
      password: driverPayload.password,
      role: 'driver',
    })
    .expect(200);

  const driver = await Driver.findOne({ email: driverPayload.email });

  return {
    token: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
    user: driver,
    payload: driverPayload,
  };
};

export const bootstrapAdminAuth = async (app) => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: process.env.ADMIN_EMAIL || 'admin@cargolink.com',
      password: process.env.ADMIN_PASSWORD || 'admin@123',
      role: 'admin',
    })
    .expect(200);

  return {
    token: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
  };
};

export const bootstrapManagerAuth = async (app, overrides = {}) => {
  const admin = await bootstrapAdminAuth(app);
  const email = overrides.email || uniqueEmail('manager');

  const inviteRes = await request(app)
    .post('/api/admin/managers/invite')
    .set('Authorization', `Bearer ${admin.token}`)
    .send({
      categories: overrides.categories || ['Technical Issue', 'Account Issue'],
      verificationCategories: overrides.verificationCategories || ['driver_verification', 'transporter_verification'],
      expiresInHours: 24,
    })
    .expect(201);

  const invitationCode = inviteRes.body.data.code;
  const password = overrides.password || 'Password1';
  const name = overrides.name || 'Manager User';

  const registerRes = await request(app)
    .post('/api/manager/register')
    .send({ name, email, password, invitationCode })
    .expect(201);

  const manager = await Manager.findOne({ email });

  return {
    token: registerRes.body.data.accessToken,
    refreshToken: registerRes.body.data.refreshToken,
    user: manager,
    invitationCode,
  };
};
