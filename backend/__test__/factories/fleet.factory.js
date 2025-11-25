// =========================
//  BASE CONSTANT FIXTURE
// =========================

const BASE_VEHICLE = {
    _id: "64abcdef1234567890abcdef",
    name: "truck 1",
    registration: "TN68A3300",
    capacity: 10,
    truck_type: "mini-truck",
    manufacture_year: "2005",

    status: "Available",
    last_service_date: "2025-10-01",
    next_service_date: "2025-12-01",
    currentLocation: null,
};

// deep clone utility
const clone = (x) => JSON.parse(JSON.stringify(x));


export const createMockVehicle = (overrides = {}) => {
  return {
    ...clone(BASE_VEHICLE),
    ...overrides,
  };
};

export const createMockVehicleArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) =>
    createMockVehicle({
        _id: `64abcdef1234567890abcde${i}`,
        name: `truck ${i + 1}`,
        registration: `TN68A33${i.toFixed(2)}`,
    })
  );
};

export const createMockVehicleInput = (overrides = {}) => {
  return {
    name: BASE_VEHICLE.name,
    registration: BASE_VEHICLE.registration,
    capacity: BASE_VEHICLE.capacity,
    truck_type: BASE_VEHICLE.truck_type,
    manufacture_year: BASE_VEHICLE.manufacture_year,
    ...overrides,
  };
};


