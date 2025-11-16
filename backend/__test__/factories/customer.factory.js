// =========================
//  BASE CONSTANT FIXTURE
// =========================

const BASE_CUSTOMER = {
  _id: "64abcdef1234567890abcdef",
  firstName: "Rajesh",
  lastName: "Kumar",
  email: "rajesh.kumar@example.com",
  phone: "9123456789",
  dob: "1990-05-20",
  gender: "Male",
  password: "Password1",
  address: {
    street: "1 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pin: "560001",
  },
  addresses: [
    {
      street: "1 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pin: "560001",
    },
  ],
  createdAt: "2020-01-01T10:00:00.000Z",
  updatedAt: "2025-01-01T10:00:00.000Z",
};


// deep clone utility
const clone = (x) => JSON.parse(JSON.stringify(x));



export const createMockAddress = (overrides = {}) => {
  return {
    street: "1 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pin: "560001",
    ...overrides,
  };
};


export const createMockCustomer = (overrides = {}) => {
  return {
    ...clone(BASE_CUSTOMER),
    ...overrides,
  };
};


export const createMockCustomerArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) =>
    createMockCustomer({
      _id: `64abcdef1234567890abcde${i}`,
      email: `rajesh${i}@example.com`,
      phone: `91234567${80 + i}`,  // deterministic unique last 2 digits
    })
  );
};



export const createMockCustomerInput = (overrides = {}) => {
  return {
    firstName: BASE_CUSTOMER.firstName,
    lastName: BASE_CUSTOMER.lastName,
    email: BASE_CUSTOMER.email,
    phone: BASE_CUSTOMER.phone,
    dob: BASE_CUSTOMER.dob,
    gender: BASE_CUSTOMER.gender,
    password: BASE_CUSTOMER.password,
    address: createMockAddress(),
    ...overrides,
  };
};


export const createMockCustomerProfile = (customer) => {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    dob: customer.dob,
    memberSince: customer.createdAt,
    gender: customer.gender,
    addresses: customer.addresses,
    profileImage: '/img/Mr.H.jpg',
    orderCount: 10, // constant deterministic
  };
};


export const createMockPasswordUpdate = () => {
  return {
    oldPassword: "OldPassword1",
    newPassword: "NewPassword123",
  };
};
