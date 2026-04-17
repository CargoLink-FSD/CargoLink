const daysFromNowIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const createMockOrderInput = (overrides = {}) => {
  const base = {
    pickup: {
      street: '1 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin: '560001',
      coordinates: [77.5946, 12.9716],
    },
    delivery: {
      street: '22 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pin: '600002',
      coordinates: [80.2707, 13.0827],
    },
    pickup_coordinates: { lat: 12.9716, lng: 77.5946 },
    delivery_coordinates: { lat: 13.0827, lng: 80.2707 },
    scheduled_at: daysFromNowIso(6),
    distance: 350,
    max_price: 25000,
    goods_type: 'general',
    truck_type: 'truck-medium',
    weight: 1200,
    description: 'Office equipment shipment',
    shipments: [
      {
        item_name: 'Monitors',
        quantity: 10,
        price: 120000,
      },
    ],
  };

  return {
    ...base,
    ...overrides,
    pickup: {
      ...base.pickup,
      ...(overrides.pickup || {}),
    },
    delivery: {
      ...base.delivery,
      ...(overrides.delivery || {}),
    },
    pickup_coordinates: {
      ...base.pickup_coordinates,
      ...(overrides.pickup_coordinates || {}),
    },
    delivery_coordinates: {
      ...base.delivery_coordinates,
      ...(overrides.delivery_coordinates || {}),
    },
    shipments: overrides.shipments || base.shipments,
  };
};

export const createMockBidInput = (overrides = {}) => ({
  bidAmount: 22000,
  notes: 'Competitive quote from transporter',
  quoteBreakdown: {
    transportation_charges: 16000,
    packing_cost: 1000,
    loading_charges: 800,
    gst: {
      rate_percent: 18,
      amount: 3168,
    },
    custom_items: [],
  },
  ...overrides,
});
