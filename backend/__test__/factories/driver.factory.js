const BASE_DRIVER = {
  firstName: 'Arjun',
  lastName: 'Kumar',
  email: 'driver@example.com',
  phone: '9876543210',
  gender: 'Male',
  password: 'Password1',
  licenseNumber: 'DL0420110149646',
  address: {
    street: '42 Residency Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pin: '560025',
  },
};

export const createMockDriverInput = (overrides = {}) => ({
  ...BASE_DRIVER,
  street: BASE_DRIVER.address.street,
  city: BASE_DRIVER.address.city,
  state: BASE_DRIVER.address.state,
  pin: BASE_DRIVER.address.pin,
  ...overrides,
  address: {
    ...BASE_DRIVER.address,
    ...(overrides.address || {}),
  },
  street: overrides.street ?? overrides.address?.street ?? BASE_DRIVER.address.street,
  city: overrides.city ?? overrides.address?.city ?? BASE_DRIVER.address.city,
  state: overrides.state ?? overrides.address?.state ?? BASE_DRIVER.address.state,
  pin: overrides.pin ?? overrides.address?.pin ?? BASE_DRIVER.address.pin,
});
