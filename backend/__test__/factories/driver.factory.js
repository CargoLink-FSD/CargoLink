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
  address: {
    ...BASE_DRIVER.address,
    ...(overrides.address || {}),
  },
  ...overrides,
});
