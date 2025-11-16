


// =========================
//  BASE CONSTANT FIXTURE
// =========================

const BASE_TRANSPORTER = {
  _id: "64abcdef1234567890abcdef",
  name: "Rajesh Kumar",
  email: "rajesh.kumar@example.com",
  primary_contact: "9123456789",
  secondary_contact:"9865471235",
  pan:"ABCDE1234F",
  gst_in:"22AAAAA0000A1Z5",
  street:"10, ABC Avenue",
  city:"Kumbakonam",
  state:"Tamil Nadu",
  pin:"612001",
  password: "Password1",
  fleet: [
    {   
        name: "truck 1",
        registration: "TN68A3300",
        capacity: 10,
        truck_type: "mini-truck",
        manufacture_year: "2005",
    }, 
    {
        name: "truck2",
        registration: "TN34S2345",
        capacity: 14,
        truck_type: "container",
        manufacture_year: "2014"
    }
  ],
  createdAt: "2020-01-01T10:00:00.000Z",
  updatedAt: "2025-01-01T10:00:00.000Z",
};


// deep clone utility
const clone = (x) => JSON.parse(JSON.stringify(x));



export const createMockVehicle = (overrides = {}) => {
  return {
    name: "truck 1",
    registration: "TN68A3300",
    capacity: 10,
    truck_type: "mini-truck",
    manufacture_year: "2005",
    ...overrides,
  };
};


export const createMockTransporter = (overrides = {}) => {
  return {
    ...clone(BASE_TRANSPORTER),
    ...overrides,
  };
};


export const createMockTrnasporterArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) =>
    createMockTransporter({
      _id: `64abcdef1234567890abcde${i}`,
      email: `rajesh${i}@example.com`,
      primary_contact: `91234567${80 + i}`,  // deterministic unique last 2 digits
    })
  );
};



export const createMockTransporterInput = (overrides = {}) => {
  return {
    name: BASE_TRANSPORTER.name,
    email: BASE_TRANSPORTER.email,
    primary_contact: BASE_TRANSPORTER.primary_contact,
    secondary_contact: BASE_TRANSPORTER.secondary_contact,
    pan: BASE_TRANSPORTER.pan,
    gst_in: BASE_TRANSPORTER.gst_in,
    street: BASE_TRANSPORTER.street,
    city: BASE_TRANSPORTER.city,
    state: BASE_TRANSPORTER.state,
    pin: BASE_TRANSPORTER.pin,
    password: BASE_TRANSPORTER.password,
    fleet: [],
    ...overrides,
  };
};


export const createMockTransporterProfile = (transporter) => {
  return {
    name: transporter.name,
    email: transporter.email,
    primary_contact: transporter.primary_contact,
    secondary_contact: transporter.secondary_contact,
    pan: transporter.pan,
    gst_in: transporter.gst_in,
    street_address: transporter.street_address,
    city: transporter.city,
    state: transporter.state,
    pin: transporter.pin,
    fleet: transporter.fleet,
    memberSince: transporter.createdAt,
    profileImage: '/img/Mr.H.jpg',
    orderCount: 10
  };
};


export const createMockPasswordUpdate = () => {
  return {
    oldPassword: "OldPassword1",
    newPassword: "NewPassword123",
  };
};
