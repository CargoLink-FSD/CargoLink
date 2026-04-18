/**
 * CargoLink – Comprehensive Mock Data Seed Script
 * ================================================
 * Creates:
 *   • 10 Customers
 *   • 10 Transporters (each with 2-4 fleet vehicles)
 *   • 20 Drivers  (2 per transporter)
 *   • 100 Orders  (10 per customer, spread across transporters)
 *   • Bids for unassigned orders
 *   • 15 Trips    (variable orders per trip, realistic Indian routes)
 *   • Reviews for completed orders
 *   • Payments for completed orders
 *   • Chats between customers & transporters on assigned orders
 *   • A default Manager + invitation code
 *   • Tickets (sample support tickets)
 *
 * Usage:
 *   node seed.js            –  seed (drops existing data first)
 *   node seed.js --drop     –  only drop all collections
 *
 * All passwords default to "Password@123"
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

// ─── Models ────────────────────────────────────────────────────────────────────
import Customer from "../models/customer.js";
import Transporter from "../models/transporter.js";
import Driver from "../models/driver.js";
import Fleet from "../models/fleet.js";
import Order from "../models/order.js";
import Bid from "../models/bids.js";
import Trip from "../models/trip.js";
import Payment from "../models/payment.js";
import Review from "../models/review.js";
import Chat from "../models/chat.js";
import Manager from "../models/manager.js";
import InvitationCode from "../models/invitationCode.js";
import Ticket from "../models/ticket.js";
import ThresholdConfig from "../models/thresholdConfig.js";
import DriverApplication from "../models/driverApplication.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/CargoLink_V2";
const DEFAULT_PASSWORD = "Password@123";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hashSync(pw, 10);
const hashedPw = hash(DEFAULT_PASSWORD);

const oid = () => new mongoose.Types.ObjectId();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));
const pastDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400000);
const futureDate = (daysAhead) => new Date(Date.now() + daysAhead * 86400000);

// ─── Indian cities with realistic coordinates [lng, lat] ──────────────────────
const INDIAN_LOCATIONS = [
  // ── North India corridor ──
  { city: "New Delhi",      state: "Delhi",            pin: "110001", street: "Connaught Place",         coords: [77.2090, 28.6139] },
  { city: "Gurugram",       state: "Haryana",          pin: "122001", street: "Cyber City, Sector 24",   coords: [77.0266, 28.4595] },
  { city: "Jaipur",         state: "Rajasthan",        pin: "302001", street: "MI Road",                 coords: [75.7873, 26.9124] },
  { city: "Lucknow",        state: "Uttar Pradesh",    pin: "226001", street: "Hazratganj",              coords: [80.9462, 26.8467] },
  { city: "Chandigarh",     state: "Chandigarh",       pin: "160001", street: "Sector 17",               coords: [76.7794, 30.7333] },
  { city: "Amritsar",       state: "Punjab",           pin: "143001", street: "Hall Bazaar",             coords: [74.8723, 31.6340] },

  // ── West India corridor ──
  { city: "Mumbai",         state: "Maharashtra",      pin: "400001", street: "Fort, CST Road",          coords: [72.8777, 19.0760] },
  { city: "Pune",           state: "Maharashtra",      pin: "411001", street: "Shivaji Nagar",           coords: [73.8567, 18.5204] },
  { city: "Ahmedabad",      state: "Gujarat",          pin: "380001", street: "Relief Road",             coords: [72.5714, 23.0225] },
  { city: "Surat",          state: "Gujarat",          pin: "395001", street: "Ring Road",               coords: [72.8311, 21.1702] },
  { city: "Nashik",         state: "Maharashtra",      pin: "422001", street: "College Road",            coords: [73.7898, 19.9975] },

  // ── South India corridor ──
  { city: "Bengaluru",      state: "Karnataka",        pin: "560001", street: "MG Road",                 coords: [77.5946, 12.9716] },
  { city: "Chennai",        state: "Tamil Nadu",       pin: "600001", street: "Anna Salai",              coords: [80.2707, 13.0827] },
  { city: "Hyderabad",      state: "Telangana",        pin: "500001", street: "Abids",                   coords: [78.4867, 17.3850] },
  { city: "Kochi",          state: "Kerala",           pin: "682001", street: "MG Road, Ernakulam",      coords: [76.2673, 9.9312]  },
  { city: "Coimbatore",     state: "Tamil Nadu",       pin: "641001", street: "RS Puram",                coords: [76.9558, 11.0168] },
  { city: "Mysuru",         state: "Karnataka",        pin: "570001", street: "Sayyaji Rao Road",        coords: [76.6394, 12.2958] },
  { city: "Visakhapatnam",  state: "Andhra Pradesh",   pin: "530001", street: "Dwaraka Nagar",           coords: [83.2185, 17.6868] },

  // ── East India corridor ──
  { city: "Kolkata",        state: "West Bengal",      pin: "700001", street: "Park Street",             coords: [88.3639, 22.5726] },
  { city: "Bhubaneswar",    state: "Odisha",           pin: "751001", street: "Janpath",                 coords: [85.8245, 20.2961] },
  { city: "Patna",          state: "Bihar",            pin: "800001", street: "Exhibition Road",         coords: [85.1376, 25.6093] },

  // ── Central India ──
  { city: "Nagpur",         state: "Maharashtra",      pin: "440001", street: "Sitabuldi",               coords: [79.0882, 21.1458] },
  { city: "Indore",         state: "Madhya Pradesh",   pin: "452001", street: "MG Road",                 coords: [75.8577, 22.7196] },
  { city: "Bhopal",         state: "Madhya Pradesh",   pin: "462001", street: "New Market",              coords: [77.4126, 23.2599] },
  { city: "Raipur",         state: "Chhattisgarh",     pin: "492001", street: "Pandri",                  coords: [81.6296, 21.2514] },
];

// ─── Realistic route corridors (indices into INDIAN_LOCATIONS) ─────────────────
// Each corridor is a contiguous sequence of cities that a truck would actually drive through.
const ROUTE_CORRIDORS = [
  // Delhi → Jaipur → Ahmedabad → Mumbai
  [0, 1, 2, 8, 9, 10, 7, 6],
  // Delhi → Lucknow → Patna → Kolkata
  [0, 3, 20, 18],
  // Mumbai → Pune → Bengaluru → Chennai
  [6, 7, 11, 12],
  // Bengaluru → Mysuru → Kochi → Coimbatore
  [11, 16, 14, 15],
  // Hyderabad → Visakhapatnam → Bhubaneswar → Kolkata
  [13, 17, 19, 18],
  // Delhi → Chandigarh → Amritsar
  [0, 4, 5],
  // Nagpur → Bhopal → Indore
  [21, 23, 22],
  // Mumbai → Nashik → Nagpur → Raipur
  [6, 10, 21, 24],
  // Chennai → Coimbatore → Kochi
  [12, 15, 14],
  // Kolkata → Bhubaneswar → Visakhapatnam → Hyderabad
  [18, 19, 17, 13],
  // Ahmedabad → Surat → Mumbai
  [8, 9, 6],
  // Lucknow → Delhi → Chandigarh
  [3, 0, 4],
  // Pune → Nagpur → Raipur → Bhubaneswar
  [7, 21, 24, 19],
  // Jaipur → Delhi → Lucknow
  [2, 0, 3],
  // Bengaluru → Hyderabad → Nagpur → Bhopal → Delhi
  [11, 13, 21, 23, 0],
];

const GOODS_TYPES = ["general", "fragile", "perishable", "hazardous", "machinery", "furniture", "agricultural", "construction"];
const TRUCK_TYPES = ["van", "truck-small", "truck-medium", "truck-large", "refrigerated", "flatbed", "container"];
const TRUCK_DISPLAY_NAMES = {
  van: "Mini Truck (Up to 1 Ton)",
  "truck-small": "Pickup Truck (1-3 Tons)",
  "truck-medium": "Light Lorry (3-7 Tons)",
  "truck-large": "Heavy Lorry (7-15 Tons)",
  refrigerated: "Refrigerated Truck",
  flatbed: "Flatbed Trailer",
  container: "Container (20ft)",
};
const CAPACITIES = { van: 1000, "truck-small": 3000, "truck-medium": 7000, "truck-large": 15000, refrigerated: 5000, flatbed: 20000, container: 18000 };

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
                      "Ananya", "Priya", "Meera", "Kavya", "Diya", "Riya", "Neha", "Pooja", "Shreya", "Tanvi"];
const LAST_NAMES = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Nair", "Joshi", "Iyer",
                     "Agarwal", "Chopra", "Malhotra", "Banerjee", "Desai", "Kulkarni", "Mehta", "Rao", "Shetty", "Bhatt"];
const COMPANY_NAMES = [
  "Bharat Logistics Pvt Ltd", "Sagar Transport Co", "Hindustan Freight Solutions",
  "Rajputana Carriers", "Deccan Express Logistics", "Ganga Transport Services",
  "Western Star Movers", "Southern Express Cargo", "Indo Freight Lines",
  "National Highway Transport"
];

const DESCRIPTIONS = [
  "Electronics shipment – handle with care, contains fragile items",
  "Bulk agricultural produce – rice and wheat bags",
  "Construction material – steel bars and cement bags",
  "Household furniture relocation – sofas, tables, beds",
  "Pharmaceutical supplies – temperature sensitive",
  "Textile raw materials – cotton bales",
  "Auto parts shipment – engine components",
  "FMCG goods – packaged food items",
  "Industrial machinery parts – heavy equipment",
  "Perishable goods – fruits and vegetables, needs quick delivery",
];

// ─── Build data ────────────────────────────────────────────────────────────────

function buildCustomers() {
  return Array.from({ length: 10 }, (_, i) => {
    const loc = INDIAN_LOCATIONS[i % INDIAN_LOCATIONS.length];
    return {
      _id: oid(),
      firstName: FIRST_NAMES[i],
      lastName: LAST_NAMES[i],
      email: `customer${i + 1}@cargolink.test`,
      phone: `98${String(1000000 + i * 111111).slice(0, 8)}`,
      dob: new Date(1985 + i, i % 12, 10 + i),
      gender: i % 3 === 0 ? "Male" : i % 3 === 1 ? "Female" : "Other",
      password: hashedPw,
      authProvider: "local",
      isEmailVerified: true,
      addresses: [
        {
          address_label: "Home",
          street: loc.street,
          city: loc.city,
          state: loc.state,
          pin: loc.pin,
          phone: `98${String(1000000 + i * 111111).slice(0, 8)}`,
          coordinates: loc.coords,
        },
      ],
    };
  });
}

function buildTransporters() {
  return Array.from({ length: 10 }, (_, i) => {
    const loc = INDIAN_LOCATIONS[i + 6]; // start from Mumbai so transporters are spread
    return {
      _id: oid(),
      name: COMPANY_NAMES[i],
      email: `transporter${i + 1}@cargolink.test`,
      password: hashedPw,
      authProvider: "local",
      isEmailVerified: true,
      gst_in: `${22 + i}AABCT${1000 + i}R1Z${i}`,
      pan: `AABCT${1000 + i}R`,
      street: loc.street,
      city: loc.city,
      state: loc.state,
      pin: loc.pin,
      primary_contact: `97${String(2000000 + i * 111111).slice(0, 8)}`,
      verificationStatus: "approved",
      isVerified: true,
      documents: {
        pan_card: { url: "/uploads/transporter-docs/pan-sample.jpg", adminStatus: "approved", autoVerified: false },
        driving_license: { url: "/uploads/transporter-docs/dl-sample.jpg", adminStatus: "approved", autoVerified: false },
        vehicle_rcs: [],
      },
    };
  });
}

function buildFleet(transporters) {
  const fleets = [];
  transporters.forEach((t, ti) => {
    const count = 2 + (ti % 3); // 2-4 vehicles per transporter
    for (let v = 0; v < count; v++) {
      const truckType = TRUCK_TYPES[(ti * 3 + v) % TRUCK_TYPES.length];
      const stateCode = t.state.slice(0, 2).toUpperCase();
      fleets.push({
        _id: oid(),
        transporter_id: t._id,
        name: `${TRUCK_DISPLAY_NAMES[truckType] || truckType} #${v + 1}`,
        registration: `${stateCode}${10 + ti}${String.fromCharCode(65 + v)}${String.fromCharCode(66 + v)}${1000 + ti * 10 + v}`,
        capacity: CAPACITIES[truckType] || 5000,
        manufacture_year: 2018 + (v % 5),
        truck_type: truckType,
        status: "Available",
        last_service_date: pastDate(30 + v * 15),
        next_service_date: futureDate(60 + v * 15),
        currentLocation: `${t.city}, ${t.state}`,
        rc_status: "approved",
        scheduleBlocks: [],
      });
    }
  });
  return fleets;
}

function buildDrivers(transporters) {
  const drivers = [];
  transporters.forEach((t, ti) => {
    for (let d = 0; d < 2; d++) {
      const idx = ti * 2 + d;
      const loc = INDIAN_LOCATIONS[(ti + 6) % INDIAN_LOCATIONS.length]; // near transporter HQ
      drivers.push({
        _id: oid(),
        transporter_id: t._id,
        firstName: FIRST_NAMES[10 + (idx % 10)],
        lastName: LAST_NAMES[10 + (idx % 10)],
        email: `driver${idx + 1}@cargolink.test`,
        phone: `96${String(3000000 + idx * 111111).slice(0, 8)}`,
        password: hashedPw,
        authProvider: "local",
        isEmailVerified: true,
        licenseNumber: `DL${String(10000000 + idx * 1111111).slice(0, 10)}`,
        licenseExpiry: futureDate(365 + idx * 30),
        verificationStatus: "approved",
        isVerified: true,
        employment_type: d === 0 ? "Salary" : "Commission",
        salary_amount: d === 0 ? 25000 + ti * 2000 : undefined,
        commission_percentage: d === 1 ? 8 + ti : undefined,
        status: "Available",
        street: loc.street,
        city: loc.city,
        state: loc.state,
        pin: loc.pin,
        location: { type: "Point", coordinates: loc.coords },
        scheduleBlocks: [],
        documents: {
          pan_card: { url: "/uploads/driver-docs/pan-sample.jpg", adminStatus: "approved" },
          driving_license: { url: "/uploads/driver-docs/dl-sample.jpg", adminStatus: "approved" },
        },
      });
    }
  });
  return drivers;
}

function buildOrders(customers, transporters) {
  const orders = [];
  const statuses = ["Placed", "Assigned", "In Transit", "Completed", "Cancelled"];

  // Distribute 100 orders: 10 per customer
  customers.forEach((cust, ci) => {
    for (let o = 0; o < 10; o++) {
      const orderIdx = ci * 10 + o;
      // Pick a corridor and use it to generate pickup/delivery along that route
      const corridor = ROUTE_CORRIDORS[orderIdx % ROUTE_CORRIDORS.length];
      const pickupIdx = corridor[0];
      const deliveryIdx = corridor[corridor.length - 1];
      const pickupLoc = INDIAN_LOCATIONS[pickupIdx];
      const deliveryLoc = INDIAN_LOCATIONS[deliveryIdx];

      // Calculate rough distance from coords (Haversine approx)
      const dlat = (deliveryLoc.coords[1] - pickupLoc.coords[1]) * 111;
      const dlng = (deliveryLoc.coords[0] - pickupLoc.coords[0]) * 85;
      const roughDist = Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 1.3); // road factor ~1.3

      const truckType = TRUCK_TYPES[orderIdx % TRUCK_TYPES.length];
      const goodsType = GOODS_TYPES[orderIdx % GOODS_TYPES.length];
      const weight = randInt(500, 15000);
      const cargoValue = randInt(50000, 500000);

      // Determine status distribution
      let status;
      if (o < 3) status = "Completed";
      else if (o < 5) status = "Assigned";
      else if (o < 7) status = "In Transit";
      else if (o < 9) status = "Placed";
      else status = "Cancelled";

      // Assign transporter for non-Placed and non-Cancelled orders
      let assignedTransporter = null;
      let finalPrice = null;
      let quoteBreakdown = null;
      if (["Assigned", "In Transit", "Completed"].includes(status)) {
        assignedTransporter = transporters[(ci + o) % transporters.length]._id;
        finalPrice = randInt(5000, 80000);
        quoteBreakdown = {
          transportation_charges: Math.round(finalPrice * 0.6),
          packing_cost: Math.round(finalPrice * 0.05),
          loading_charges: Math.round(finalPrice * 0.05),
          gst: { rate_percent: 18, amount: Math.round(finalPrice * 0.18) },
          toll_cost: randInt(200, 2000),
          risk_coverage: { rate_percent: 1, on_declared_value: cargoValue, amount: Math.round(cargoValue * 0.01) },
        };
      }

      const scheduledDays = status === "Completed" ? -randInt(5, 60) : randInt(3, 30);
      const orderDate = status === "Completed" ? pastDate(randInt(10, 90)) : pastDate(randInt(0, 5));

      const maxPrice = finalPrice ? finalPrice + randInt(2000, 10000) : randInt(5000, 100000);

      const order = {
        _id: oid(),
        customer_id: cust._id,
        pickup: {
          street: pickupLoc.street,
          city: pickupLoc.city,
          state: pickupLoc.state,
          pin: pickupLoc.pin,
          coordinates: pickupLoc.coords,
        },
        delivery: {
          street: deliveryLoc.street,
          city: deliveryLoc.city,
          state: deliveryLoc.state,
          pin: deliveryLoc.pin,
          coordinates: deliveryLoc.coords,
        },
        pickup_coordinates: { lat: pickupLoc.coords[1], lng: pickupLoc.coords[0] },
        delivery_coordinates: { lat: deliveryLoc.coords[1], lng: deliveryLoc.coords[0] },
        scheduled_at: new Date(Date.now() + scheduledDays * 86400000),
        distance: Math.max(roughDist, 50),
        order_date: orderDate,
        max_price: Math.max(maxPrice, 2000),
        goods_type: goodsType,
        weight,
        volume: randInt(1, 50),
        cargo_value: cargoValue,
        toll_cost: randInt(100, 2000),
        truck_type: truckType,
        description: DESCRIPTIONS[orderIdx % DESCRIPTIONS.length],
        special_instructions: o % 3 === 0 ? "Handle with extra care" : undefined,
        status,
        assigned_transporter_id: assignedTransporter,
        final_price: finalPrice,
        accepted_quote_breakdown: quoteBreakdown,
        payment_status: status === "Completed" ? "Paid" : "Unpaid",
        pickup_otp: ["Assigned", "In Transit", "Completed"].includes(status) ? generateOTP() : undefined,
        delivery_otp: ["Assigned", "In Transit", "Completed"].includes(status) ? generateOTP() : undefined,
        is_reviewed: false,
        shipments: [
          { item_name: `${goodsType} item 1`, quantity: randInt(1, 50), price: randInt(500, 10000), delivery_status: status === "Completed" ? "Delivered" : undefined },
          { item_name: `${goodsType} item 2`, quantity: randInt(1, 20), price: randInt(200, 5000), delivery_status: status === "Completed" ? "Delivered" : undefined },
        ],
      };

      orders.push(order);
    }
  });

  return orders;
}

function buildBids(orders, transporters) {
  const bids = [];
  // For "Placed" orders, create 2-4 bids from different transporters
  const placedOrders = orders.filter((o) => o.status === "Placed");
  placedOrders.forEach((order, oi) => {
    const bidCount = 2 + (oi % 3);
    const usedTransporters = new Set();
    for (let b = 0; b < bidCount; b++) {
      let ti = (oi + b) % transporters.length;
      while (usedTransporters.has(ti)) ti = (ti + 1) % transporters.length;
      usedTransporters.add(ti);

      const bidAmount = randInt(
        Math.round(order.max_price * 0.5),
        Math.round(order.max_price * 0.95)
      );

      bids.push({
        _id: oid(),
        order_id: order._id,
        transporter_id: transporters[ti]._id,
        bid_amount: bidAmount,
        quote_breakdown: {
          transportation_charges: Math.round(bidAmount * 0.6),
          packing_cost: Math.round(bidAmount * 0.05),
          loading_charges: Math.round(bidAmount * 0.05),
          gst: { rate_percent: 18, amount: Math.round(bidAmount * 0.18) },
          toll_cost: randInt(200, 1500),
        },
        notes: `Competitive rate for ${order.goods_type} shipment`,
      });
    }
  });
  return bids;
}

function buildTrips(orders, transporters, drivers, fleets) {
  const trips = [];

  // Group assigned/in-transit/completed orders by transporter
  const transporterOrders = {};
  orders
    .filter((o) => ["Scheduled", "Active", "Completed"].includes(o.status))
    .forEach((o) => {
      const tid = o.assigned_transporter_id.toString();
      if (!transporterOrders[tid]) transporterOrders[tid] = [];
      transporterOrders[tid].push(o);
    });

  let tripCount = 0;
  const MAX_TRIPS = 15;

  for (const [tid, tOrders] of Object.entries(transporterOrders)) {
    if (tripCount >= MAX_TRIPS) break;

    const transporter = transporters.find((t) => t._id.toString() === tid);
    if (!transporter) continue;

    const tDrivers = drivers.filter((d) => d.transporter_id.toString() === tid);
    const tFleets = fleets.filter((f) => f.transporter_id.toString() === tid);
    if (tDrivers.length === 0 || tFleets.length === 0) continue;

    // Split orders into trips of 2-5 orders each
    let orderPool = [...tOrders];
    while (orderPool.length > 0 && tripCount < MAX_TRIPS) {
      const tripSize = Math.min(randInt(2, 5), orderPool.length);
      const tripOrders = orderPool.splice(0, tripSize);
      const driver = tDrivers[tripCount % tDrivers.length];
      const vehicle = tFleets[tripCount % tFleets.length];

      // Determine trip status from orders
      const hasCompleted = tripOrders.some((o) => o.status === "Completed");
      const hasInTransit = tripOrders.some((o) => o.status === "Active");
      let tripStatus = "Scheduled";
      if (hasCompleted && !hasInTransit) tripStatus = "Completed";
      else if (hasInTransit) tripStatus = "Active";
      else tripStatus = "Scheduled";

      // Build stops from order pickup/delivery in sequence
      const stops = [];
      let seq = 1;
      tripOrders.forEach((order, oi) => {
        stops.push({
          sequence: seq++,
          type: "Pickup",
          order_id: order._id,
          address: {
            street: order.pickup.street,
            city: order.pickup.city,
            state: order.pickup.state,
            pin: order.pickup.pin,
            coordinates: order.pickup.coordinates,
          },
          status: tripStatus === "Completed" ? "Completed" : oi === 0 && tripStatus === "En Route" ? "Completed" : "Pending",
        });
      });
      tripOrders.forEach((order) => {
        stops.push({
          sequence: seq++,
          type: "Dropoff",
          order_id: order._id,
          address: {
            street: order.delivery.street,
            city: order.delivery.city,
            state: order.delivery.state,
            pin: order.delivery.pin,
            coordinates: order.delivery.coordinates,
          },
          status: tripStatus === "Completed" ? "Completed" : "Pending",
        });
      });

      // Compute ETAs
      const startDate = tripStatus === "Completed" ? pastDate(randInt(5, 40)) : futureDate(randInt(1, 15));
      const durationHours = randInt(8, 72);
      const endDate = new Date(startDate.getTime() + durationHours * 3600000);

      stops.forEach((s, i) => {
        const fraction = i / Math.max(stops.length - 1, 1);
        const etaMs = startDate.getTime() + fraction * durationHours * 3600000;
        s.scheduled_arrival_at = new Date(etaMs);
        s.eta_at = new Date(etaMs);
        if (s.status === "Completed") {
          s.actual_arrival_at = new Date(etaMs + randInt(-30, 60) * 60000);
          s.actual_departure_at = new Date(etaMs + randInt(30, 90) * 60000);
        }
      });

      // Total distance: sum of order distances in trip
      const totalDist = tripOrders.reduce((sum, o) => sum + o.distance, 0);

      const trip = {
        _id: oid(),
        transporter_id: transporter._id,
        assigned_vehicle_id: vehicle._id,
        assigned_driver_id: driver._id,
        order_ids: tripOrders.map((o) => o._id),
        status: tripStatus,
        stops,
        current_stop_index: tripStatus === "Completed" ? stops.length - 1 : tripStatus === "Active" ? Math.floor(stops.length / 2) : 0,
        current_location: {
          coordinates: tripOrders[0].pickup.coordinates,
          updated_at: new Date(),
        },
        planned_start_at: startDate,
        actual_start_at: ["Active", "Completed"].includes(tripStatus) ? startDate : undefined,
        planned_end_at: endDate,
        actual_end_at: tripStatus === "Completed" ? endDate : undefined,
        total_distance_km: totalDist,
        total_duration_minutes: durationHours * 60,
      };

      trips.push(trip);
      tripCount++;
    }
  }

  return trips;
}

function buildReviews(orders, transporters) {
  const reviews = [];
  const completedOrders = orders.filter((o) => o.status === "Completed");
  completedOrders.forEach((order, i) => {
    if (i % 2 === 0) {
      // ~50% of completed orders get reviewed
      reviews.push({
        _id: oid(),
        order_id: order._id,
        customer_id: order.customer_id,
        transporter_id: order.assigned_transporter_id,
        rating: randInt(3, 5),
        comment: pick([
          "Excellent service! Goods delivered on time and in perfect condition.",
          "Good experience overall. Minor delay but driver was professional.",
          "Very satisfied with the transport service. Will use again.",
          "Decent service. Communication could be better.",
          "Outstanding! The transporter went above and beyond expectations.",
        ]),
      });
      order.is_reviewed = true;
    }
  });
  return reviews;
}

function buildPayments(orders) {
  const payments = [];
  orders
    .filter((o) => o.status === "Completed" && o.payment_status === "Paid")
    .forEach((order) => {
      payments.push({
        _id: oid(),
        order_id: order._id,
        customer_id: order.customer_id,
        amount: order.final_price,
        payment_type: "final",
        razorpay_order_id: `order_mock_${order._id.toString().slice(-8)}`,
        razorpay_payment_id: `pay_mock_${order._id.toString().slice(-8)}`,
        razorpay_signature: `sig_mock_${order._id.toString().slice(-8)}`,
        method: pick(["card", "upi", "netbanking", "wallet"]),
        status: "Completed",
      });
    });
  return payments;
}

function buildChats(orders, customers, transporters) {
  const chats = [];
  orders
    .filter((o) => ["Assigned", "In Transit", "Completed"].includes(o.status))
    .slice(0, 30) // limit to 30 chats
    .forEach((order) => {
      const customer = customers.find((c) => c._id.toString() === order.customer_id.toString());
      chats.push({
        _id: oid(),
        order: order._id,
        customer: order.customer_id,
        transporter: order.assigned_transporter_id,
        messages: [
          {
            senderType: "customer",
            sender_id: order.customer_id,
            content: `Hi, I have placed order for ${order.goods_type} from ${order.pickup.city} to ${order.delivery.city}. Please confirm pickup timing.`,
            timestamp: order.order_date,
          },
          {
            senderType: "transporter",
            sender_id: order.assigned_transporter_id,
            content: `Hello ${customer?.firstName || "Customer"}! We'll arrange pickup as per the scheduled date. Our driver will contact you before arrival.`,
            timestamp: new Date(order.order_date.getTime() + 3600000),
          },
          {
            senderType: "customer",
            sender_id: order.customer_id,
            content: "Thank you! Please handle the goods carefully.",
            timestamp: new Date(order.order_date.getTime() + 7200000),
          },
        ],
      });
    });
  return chats;
}

function buildManager() {
  return {
    _id: oid(),
    name: "Default Manager",
    email: "manager@cargolink.test",
    password: hashedPw,
    categories: ["Shipment Issue", "Payment Issue", "Transporter Complaint", "Customer Complaint", "Technical Issue", "Account Issue", "Other"],
    verificationCategories: ["transporter_verification", "driver_verification", "vehicle_verification"],
    status: "active",
    isDefault: true,
    openTicketCount: 0,
    totalResolved: 0,
    openVerificationCount: 0,
    totalVerified: 0,
  };
}

function buildTickets(customers, transporters, orders, managerId) {
  const tickets = [];
  const categories = ["Shipment Issue", "Payment Issue", "Technical Issue", "Account Issue"];
  const subjects = [
    "Order delayed – need update",
    "Payment not reflected",
    "App crashing on order page",
    "Cannot update profile information",
    "Driver not responding",
    "Wrong pickup location shown",
  ];

  for (let i = 0; i < 8; i++) {
    const isCustomer = i < 4;
    const user = isCustomer ? customers[i] : transporters[i - 4];
    const relatedOrder = orders[i * 10]; // pick an order

    tickets.push({
      _id: oid(),
      ticketId: `TCK${String(1001 + i).padStart(5, "0")}`,
      userId: user._id,
      userModel: isCustomer ? "Customer" : "Transporter",
      userRole: isCustomer ? "customer" : "transporter",
      userName: isCustomer ? `${user.firstName} ${user.lastName}` : user.name,
      userEmail: user.email,
      category: categories[i % categories.length],
      subject: subjects[i % subjects.length],
      orderId: relatedOrder?._id || null,
      status: i < 3 ? "open" : i < 6 ? "in_progress" : "closed",
      priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
      assignedManager: managerId,
      messages: [
        {
          sender: isCustomer ? "customer" : "transporter",
          senderName: isCustomer ? `${user.firstName} ${user.lastName}` : user.name,
          text: `I need help with: ${subjects[i % subjects.length]}. Order reference available.`,
        },
        {
          sender: "manager",
          senderName: "Default Manager",
          text: "Thank you for reaching out. We are looking into your issue and will update you shortly.",
        },
      ],
    });
  }
  return tickets;
}

function buildDriverApplications(drivers, transporters) {
  // A few accepted applications (matching current assignments)
  return drivers.map((d) => ({
    _id: oid(),
    driver_id: d._id,
    transporter_id: d.transporter_id,
    status: "Accepted",
    message: "I have 5+ years of experience in long-haul transport.",
  }));
}

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌 Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  // Drop all collections
  console.log("🗑️  Dropping existing data...");
  const collections = [
    Customer, Transporter, Driver, Fleet, Order, Bid, Trip,
    Payment, Review, Chat, Manager, InvitationCode, Ticket,
    ThresholdConfig, DriverApplication,
  ];
  for (const Model of collections) {
    try {
      await Model.collection.drop();
    } catch (e) {
      // collection might not exist yet
    }
  }
  console.log("   Done.\n");

  if (process.argv.includes("--drop")) {
    console.log("🏁 --drop flag: exiting after drop.");
    await mongoose.disconnect();
    return;
  }

  // Build data
  console.log("🔨 Building mock data...");
  const customers = buildCustomers();
  const transporters = buildTransporters();
  const fleets = buildFleet(transporters);
  const drivers = buildDrivers(transporters);
  const orders = buildOrders(customers, transporters);
  const bids = buildBids(orders, transporters);
  const trips = buildTrips(orders, transporters, drivers, fleets);
  const reviews = buildReviews(orders, transporters);
  const payments = buildPayments(orders);
  const chats = buildChats(orders, customers, transporters);
  const manager = buildManager();
  const tickets = buildTickets(customers, transporters, orders, manager._id);
  const driverApps = buildDriverApplications(drivers, transporters);

  // Assign vehicles to trips (update fleet status)
  trips.forEach((trip) => {
    const fleet = fleets.find((f) => f._id.toString() === trip.assigned_vehicle_id?.toString());
    if (fleet && trip.status !== "Completed") {
      fleet.status = "Assigned";
      fleet.current_trip_id = trip._id;
    }
    const driver = drivers.find((d) => d._id.toString() === trip.assigned_driver_id?.toString());
    if (driver && trip.status !== "Completed") {
      driver.status = "Assigned";
      driver.current_trip_id = trip._id;
    }
  });

  // Insert data
  console.log("📥 Inserting data...\n");

  const inserted = {};

  inserted.customers = await Customer.insertMany(customers);
  console.log(`   ✅ ${inserted.customers.length} Customers`);

  // Transporters need special handling (password hashing is in pre-save, but insertMany bypasses hooks)
  // We already hashed the passwords manually so insertMany is fine.
  inserted.transporters = await Transporter.insertMany(transporters);
  console.log(`   ✅ ${inserted.transporters.length} Transporters`);

  inserted.fleets = await Fleet.insertMany(fleets);
  console.log(`   ✅ ${inserted.fleets.length} Fleet Vehicles`);

  inserted.drivers = await Driver.insertMany(drivers);
  console.log(`   ✅ ${inserted.drivers.length} Drivers`);

  inserted.orders = await Order.insertMany(orders);
  console.log(`   ✅ ${inserted.orders.length} Orders`);

  inserted.bids = await Bid.insertMany(bids);
  console.log(`   ✅ ${inserted.bids.length} Bids`);

  inserted.trips = await Trip.insertMany(trips);
  console.log(`   ✅ ${inserted.trips.length} Trips`);

  inserted.reviews = await Review.insertMany(reviews);
  console.log(`   ✅ ${inserted.reviews.length} Reviews`);

  inserted.payments = await Payment.insertMany(payments);
  console.log(`   ✅ ${inserted.payments.length} Payments`);

  inserted.chats = await Chat.insertMany(chats);
  console.log(`   ✅ ${inserted.chats.length} Chats`);

  // Manager (use save to trigger password hash via pre-save hook — already hashed so insertMany is fine)
  inserted.manager = await Manager.create(manager);
  console.log(`   ✅ 1 Manager (manager@cargolink.test / ${DEFAULT_PASSWORD})`);

  // Invitation code for new managers
  const invCode = await InvitationCode.create({
    code: "SEED2026INVITE",
    categories: ["Shipment Issue", "Payment Issue", "Technical Issue"],
    verificationCategories: ["transporter_verification", "driver_verification"],
    createdBy: "admin",
    expiresAt: futureDate(365),
    used: false,
  });
  console.log(`   ✅ 1 Invitation Code: ${invCode.code}`);

  inserted.tickets = await Ticket.insertMany(tickets);
  console.log(`   ✅ ${inserted.tickets.length} Tickets`);

  inserted.driverApps = await DriverApplication.insertMany(driverApps);
  console.log(`   ✅ ${inserted.driverApps.length} Driver Applications`);

  // Threshold configs
  const thresholdCategories = ["Shipment Issue", "Payment Issue", "Transporter Complaint", "Customer Complaint", "Technical Issue", "Account Issue", "Other"];
  await ThresholdConfig.insertMany(
    thresholdCategories.map((cat) => ({ category: cat, maxTicketsPerHour: 10 }))
  );
  console.log(`   ✅ ${thresholdCategories.length} Threshold Configs`);

  // ── Summary ──
  console.log("\n" + "═".repeat(60));
  console.log("  🎉  SEED COMPLETE  ");
  console.log("═".repeat(60));
  console.log(`
  Customers:       ${customers.length}
  Transporters:    ${transporters.length}
  Fleet Vehicles:  ${fleets.length}
  Drivers:         ${drivers.length}
  Orders:          ${orders.length}
  Bids:            ${bids.length}
  Trips:           ${trips.length}
  Reviews:         ${reviews.length}
  Payments:        ${payments.length}
  Chats:           ${chats.length}
  Tickets:         ${tickets.length}
  Manager:         1
  
  🔑 Default credentials:
     All users:     Password@123
     Manager:       manager@cargolink.test / Password@123
     Customers:     customer1@cargolink.test  …  customer10@cargolink.test
     Transporters:  transporter1@cargolink.test  …  transporter10@cargolink.test
     Drivers:       driver1@cargolink.test  …  driver20@cargolink.test
  
  📌 Invitation Code for new managers: SEED2026INVITE
`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
