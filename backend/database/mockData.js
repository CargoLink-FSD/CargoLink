/**
 * MongoDB Mock Data Generation
 * 
 * This script creates mock data for a logistics/transportation application with:
 * - 4 Customers (each with 1-3 addresses)
 * - 3 Transporters (each with 3-5 trucks in their fleet)
 * - 17 Orders (with different statuses, cargo types, and locations)
 * - Multiple bids for orders in 'Placed' status
 */
const mongoose = require('mongoose')
const Customer = require('../models/customer')
const Transporter = require('../models/transporter')
const Order = require('../models/order')
const Bids = require('../models/bids')
const bcrypt = require('bcrypt')


async function seedDatabase() {

  try {

    const db = await mongoose.connect('mongodb://127.0.0.1:27017/CargoLink');
    console.log('MongoDB connected');            
    
    // Step 1: Insert Customers
    await Customer.deleteMany(); // Clear existing customers
    const hashedPassword = await bcrypt.hash('hello12', 10);

    const customers = [
      {
        firstName: "Rajesh",
        lastName: "Sharma",
        email: "rajesh.sharma@example.com",
        phone: "9876543210",
        dob: new Date("1985-07-12"),
        gender: "Male",
        password: hashedPassword,
        addresses: [
          {
            address_label: "Home",
            street_address: "42, Park Avenue, Bandra",
            city: "Mumbai",
            state: "Maharashtra",
            pin: "400050",
            contact_phone: "9876543210",
          },
          {
            address_label: "Office",
            street_address: "Infinity Park, Building 4, Malad",
            city: "Mumbai",
            state: "Maharashtra",
            pin: "400064",
            contact_phone: "9876543211",
          },
        ],
      },
      {
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@example.com",
        phone: "8765432109",
        dob: new Date("1990-03-25"),
        gender: "Female",
        password: hashedPassword,
        addresses: [
          {
            address_label: "Home",
            street_address: "703, Silver Heights, Hiranandani",
            city: "Mumbai",
            state: "Maharashtra",
            pin: "400076",
            contact_phone: "8765432109",
          },
          {
            address_label: "Parents",
            street_address: "12, Green Valley, Satellite Road",
            city: "Ahmedabad",
            state: "Gujarat",
            pin: "380015",
            contact_phone: "8765432110",
          },
          {
            address_label: "Warehouse",
            street_address: "Plot 27, MIDC Industrial Area, Andheri East",
            city: "Mumbai",
            state: "Maharashtra",
            pin: "400093",
            contact_phone: "8765432111",
          },
        ],
      },
      {
        firstName: "Amit",
        lastName: "Singh",
        email: "amit.singh@example.com",
        phone: "7654321098",
        dob: new Date("1988-11-03"),
        gender: "Male",
        password: hashedPassword,
        addresses: [
          {
            address_label: "Office",
            street_address: "Tower B, DLF Cyber City",
            city: "Gurugram",
            state: "Haryana",
            pin: "122002",
            contact_phone: "7654321098",
          },
        ],
      },
      {
        firstName: "Sunita",
        lastName: "Verma",
        email: "sunita.verma@example.com",
        phone: "6543210987",
        dob: new Date("1982-09-18"),
        gender: "Female",
        password: hashedPassword, // Fixed: Use hashed password
        addresses: [
          {
            address_label: "Home",
            street_address: "8, Raj Grandeur, Powai",
            city: "Mumbai",
            state: "Maharashtra",
            pin: "400076",
            contact_phone: "6543210987",
          },
          {
            address_label: "Factory",
            street_address: "Plot 15, Phase II, Chakan Industrial Area",
            city: "Pune",
            state: "Maharashtra",
            pin: "410501",
            contact_phone: "6543210988",
          },
        ],
      },
    ];

    const insertedCustomers = await Customer.insertMany(customers);
    console.log("✅ Customers inserted successfully");

    // Step 2: Insert Transporters
    await Transporter.deleteMany(); // Clear existing transporters
    const transporters = [
      {
        name: "SpeedCargo Logistics",
        gst_in: "27AAFCS2207R1ZP",
        pan: "AAFCS2207R",
        street_address: "Plot 43, MIDC Industrial Area",
        city: "Navi Mumbai",
        state: "Maharashtra",
        pin: "400708",
        primary_contact: "9988776655",
        secondary_contact: "9988776656",
        email: "operations@speedcargo.com",
        password: hashedPassword,
        fleet: [
          {
            name: "SC-TRK-001",
            registration: "MH43 AB 1234",
            capacity: 14,
            manufacture_year: 2021,
            truck_type: "Open Body",
            status: "Available",
            last_service_date: new Date("2023-04-15"),
            next_service_date: new Date("2023-07-15"),
          },
          {
            name: "SC-TRK-002",
            registration: "MH43 AB 5678",
            capacity: 26,
            manufacture_year: 2022,
            truck_type: "Container",
            status: "Available",
            last_service_date: new Date("2023-05-20"),
            next_service_date: new Date("2023-08-20"),
          },
          {
            name: "SC-TRK-003",
            registration: "MH43 CD 9012",
            capacity: 32,
            manufacture_year: 2020,
            truck_type: "Refrigerated",
            status: "In Maintenance",
            last_service_date: new Date("2023-06-10"),
            next_service_date: new Date("2023-09-10"),
          },
          {
            name: "SC-TRK-004",
            registration: "MH43 CD 3456",
            capacity: 18,
            manufacture_year: 2021,
            truck_type: "Tanker",
            status: "Available",
            last_service_date: new Date("2023-05-05"),
            next_service_date: new Date("2023-08-05"),
          },
        ],
      },
      {
        name: "FastTrack Transport Services",
        gst_in: "29AADCF2846D1ZB",
        pan: "AADCF2846D",
        street_address: "75, Electronic City, Phase 1",
        city: "Bangalore",
        state: "Karnataka",
        pin: "560100",
        primary_contact: "8877665544",
        secondary_contact: "8877665545",
        email: "contact@fasttrack-transport.com",
        password: hashedPassword,
        fleet: [
          {
            name: "FT-TRUCK-A1",
            registration: "KA01 MR 7890",
            capacity: 22,
            manufacture_year: 2022,
            truck_type: "Container",
            status: "Available",
            last_service_date: new Date("2023-03-25"),
            next_service_date: new Date("2023-06-25"),
          },
          {
            name: "FT-TRUCK-A2",
            registration: "KA01 MR 1234",
            capacity: 16,
            manufacture_year: 2020,
            truck_type: "Open Body",
            status: "Assigned",
            last_service_date: new Date("2023-04-12"),
            next_service_date: new Date("2023-07-12"),
          },
          {
            name: "FT-TRUCK-B1",
            registration: "KA01 NS 5678",
            capacity: 24,
            manufacture_year: 2021,
            truck_type: "Flatbed",
            status: "Available",
            last_service_date: new Date("2023-05-18"),
            next_service_date: new Date("2023-08-18"),
          },
          {
            name: "FT-TRUCK-B2",
            registration: "KA01 NS 9012",
            capacity: 28,
            manufacture_year: 2023,
            truck_type: "Container",
            status: "Available",
            last_service_date: new Date("2023-06-05"),
            next_service_date: new Date("2023-09-05"),
          },
          {
            name: "FT-TRUCK-C1",
            registration: "KA02 PQ 3456",
            capacity: 30,
            manufacture_year: 2022,
            truck_type: "Refrigerated",
            status: "Available",
            last_service_date: new Date("2023-06-22"),
            next_service_date: new Date("2023-09-22"),
          },
        ],
      },
      {
        name: "North Star Carriers",
        gst_in: "07AABCU9603R1ZP",
        pan: "AABCU9603R",
        street_address: "B-12, Transport Nagar",
        city: "Delhi",
        state: "Delhi",
        pin: "110041",
        primary_contact: "7766554433",
        secondary_contact: "7766554434",
        email: "dispatch@northstarcarriers.in",
        password: hashedPassword,
        fleet: [
          {
            name: "NS-T-101",
            registration: "DL1C AB 7890",
            capacity: 20,
            manufacture_year: 2021,
            truck_type: "Open Body",
            status: "Available",
            last_service_date: new Date("2023-03-10"),
            next_service_date: new Date("2023-06-10"),
        },
          {
            name: "NS-T-102",
            registration: "DL1C AB 1234",
            capacity: 18,
            manufacture_year: 2022,
            truck_type: "Container",
            status: "Assigned",
            last_service_date: new Date("2023-04-05"),
            next_service_date: new Date("2023-07-05"),
          },
          {
            name: "NS-T-103",
            registration: "DL1C CD 5678",
            capacity: 25,
            manufacture_year: 2021,
            truck_type: "Tanker",
            status: "Available",
            last_service_date: new Date("2023-05-15"),
            next_service_date: new Date("2023-08-15"),
          },
        ],
      },
    ];

    const insertedTransporters = await Transporter.insertMany(transporters);
    console.log("✅ Transporters inserted successfully");

    // Step 3: Map customer and transporter IDs
    const customerMap = {
      "Rajesh Sharma": insertedCustomers.find(c => c.firstName === "Rajesh" && c.lastName === "Sharma")._id,
      "Priya Patel": insertedCustomers.find(c => c.firstName === "Priya" && c.lastName === "Patel")._id,
      "Amit Singh": insertedCustomers.find(c => c.firstName === "Amit" && c.lastName === "Singh")._id,
      "Sunita Verma": insertedCustomers.find(c => c.firstName === "Sunita" && c.lastName === "Verma")._id,
    };

    const transporterMap = {
      "SpeedCargo Logistics": insertedTransporters.find(t => t.name === "SpeedCargo Logistics")._id,
      "FastTrack Transport Services": insertedTransporters.find(t => t.name === "FastTrack Transport Services")._id,
      "North Star Carriers": insertedTransporters.find(t => t.name === "North Star Carriers")._id,
    };

    // Step 4: Update orders with dynamic IDs
    const orders = [
      // ---- PLACED ORDERS ----
      {
        customer_id: customerMap["Rajesh Sharma"],
        pickup: {
          street: "42, Park Avenue, Bandra",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400050",
        },
        delivery: {
          street: "75, Electronic City, Phase 1",
          city: "Bangalore",
          state: "Karnataka",
          pin: "560100",
        },
        scheduled_at: new Date("2025-05-11T09:00:00Z"),
        distance: 982,
        order_date: new Date("2025-05-05T14:30:00Z"),
        max_price: 25000,
        goods_type: "Electronics",
        weight: 1800,
        truck_type: "Container",
        description: "Shipment of laptops and computer accessories",
        special_instructions: "Handle with care. Keep away from moisture.",
        status: "Placed",
        shipments: [
          {
            item_name: "Laptop Computers",
            quantity: 50,
            price: 15000,
          },
          {
            item_name: "Monitors",
            quantity: 30,
            price: 9000,
          },
        ],
      },

      {
        customer_id: customerMap["Sunita Verma"],
        pickup: {
          street: "8, Raj Grandeur, Powai",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400076",
        },
        delivery: {
          street: "Sector 62",
          city: "Noida",
          state: "Uttar Pradesh",
          pin: "201309",
        },
        scheduled_at: new Date("2025-05-14T08:30:00Z"),
        distance: 1380,
        order_date: new Date("2025-05-07T10:20:00Z"),
        max_price: 33000,
        goods_type: "Medical Equipment",
        weight: 1200,
        truck_type: "Container",
        description: "Sensitive medical diagnostic equipment",
        special_instructions: "Fragile equipment. Avoid sudden movements and shocks.",
        status: "Placed",
        shipments: [
          {
            item_name: "X-Ray Machines",
            quantity: 3,
            price: 18000,
          },
          {
            item_name: "Laboratory Equipment",
            quantity: 15,
            price: 15000,
          },
        ],
      },
      {
        customer_id: customerMap["Amit Singh"],
        pickup: {
          street: "Tower B, DLF Cyber City",
          city: "Gurugram",
          state: "Haryana",
          pin: "122002",
        },
        delivery: {
          street: "IT Park, Hinjawadi",
          city: "Pune",
          state: "Maharashtra",
          pin: "411057",
        },
        scheduled_at: new Date("2025-05-15T09:00:00Z"),
        distance: 1460,
        order_date: new Date("2025-05-08T13:45:00Z"),
        max_price: 38000,
        goods_type: "Data Center Equipment",
        weight: 2600,
        truck_type: "Container",
        description: "Server racks and networking equipment for new data center",
        special_instructions: "Equipment is sensitive to humidity. Maintain dry environment.",
        status: "Placed",
        shipments: [
          {
            item_name: "Server Racks",
            quantity: 10,
            price: 22000,
          },
          {
            item_name: "Network Switches",
            quantity: 25,
            price: 12000,
          },
          {
            item_name: "UPS Systems",
            quantity: 5,
            price: 4000,
          },
        ],
      },
      {
        customer_id: customerMap["Priya Patel"],
        pickup: {
          street: "Plot 27, MIDC Industrial Area, Andheri East",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400093",
        },
        delivery: {
          street: "Industrial Area, Whitefield",
          city: "Bangalore",
          state: "Kamaraka",
          pin: "560066",
        },
        scheduled_at: new Date("2025-05-12T10:00:00Z"),
        distance: 990,
        order_date: new Date("2025-05-06T09:15:00Z"),
        max_price: 35000,
        goods_type: "Textiles",
        weight: 2500,
        truck_type: "Open Body",
        description: "Shipment of textile goods for retail stores",
        status: "Placed",
        shipments: [
          {
            item_name: "Cotton Fabric Rolls",
            quantity: 100,
            price: 20000,
          },
          {
            item_name: "Ready-made Garments",
            quantity: 500,
            price: 15000,
          },
        ],
      },
      {
        customer_id: customerMap["Amit Singh"],
        pickup: {
          street: "Tower B, DLF Cyber City",
          city: "Gurugram",
          state: "Haryana",
          pin: "122002",
        },
        delivery: {
          street: "B-12, Transport Nagar",
          city: "Delhi",
          state: "Delhi",
          pin: "110041",
        },
        scheduled_at: new Date("2025-05-13T08:30:00Z"),
        distance: 32,
        order_date: new Date("2025-05-07T11:45:00Z"),
        max_price: 8000,
        goods_type: "Office Supplies",
        weight: 800,
        truck_type: "Open Body",
        description: "Office furniture and supplies",
        special_instructions: "Delivery to be made during office hours only (9 AM - 5 PM)",
        status: "Placed",
        shipments: [
          {
            item_name: "Office Chairs",
            quantity: 20,
            price: 3000,
          },
          {
            item_name: "Desks",
            quantity: 10,
            price: 4000,
          },
          {
            item_name: "Filing Cabinets",
            quantity: 5,
            price: 1000,
          },
        ],
      },
      // ---- ASSIGNED ORDERS ----
      {
        customer_id: customerMap["Sunita Verma"],
        pickup: {
          street: "Plot 15, Phase II, Chakan Industrial Area",
          city: "Pune",
          state: "Maharashtra",
          pin: "410501",
        },
        delivery: {
          street: "Electronic City Phase 2",
          city: "Bangalore",
          state: "Karnataka",
          pin: "560100",
        },
        scheduled_at: new Date("2025-05-10T07:00:00Z"),
        distance: 840,
        order_date: new Date("2025-05-03T10:30:00Z"),
        max_price: 30000,
        goods_type: "Auto Parts",
        weight: 3200,
        truck_type: "Container",
        description: "Automotive components for assembly plant",
        status: "Assigned",
        assigned_transporter_id: transporterMap["FastTrack Transport Services"],
        final_price: 28500,
        shipments: [
          {
            item_name: "Engine Components",
            quantity: 200,
            price: 15000,
          },
          {
            item_name: "Transmission Parts",
            quantity: 150,
            price: 13500,
          },
        ],
      },
      {
        customer_id: customerMap["Rajesh Sharma"],
        pickup: {
          street: "Infinity Park, Building 4, Malad",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400064",
        },
        delivery: {
          street: "Hosur Road, Near Silk Board",
          city: "Bangalore",
          state: "Karnataka",
          pin: "560068",
        },
        scheduled_at: new Date("2025-05-11T08:00:00Z"),
        distance: 980,
        order_date: new Date("2025-05-04T09:45:00Z"),
        max_price: 22000,
        goods_type: "Pharmaceuticals",
        weight: 1200,
        truck_type: "Refrigerated",
        description: "Temperature-sensitive pharmaceutical products",
        special_instructions: "Maintain temperature between 2-8°C at all times",
        status: "Assigned",
        assigned_transporter_id: transporterMap["SpeedCargo Logistics"],
        final_price: 21500,
        shipments: [
          {
            item_name: "Vaccines",
            quantity: 5000,
            price: 12000,
          },
          {
            item_name: "Medical Supplies",
            quantity: 2000,
            price: 9500,
          },
        ],
      },
      // ---- IN TRANSIT ORDERS ----
      {
        customer_id: customerMap["Priya Patel"],
        pickup: {
          street: "703, Silver Heights, Hiranandani",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400076",
        },
        delivery: {
          street: "12, Green Valley, Satellite Road",
          city: "Ahmedabad",
          state: "Gujarat",
          pin: "380015",
        },
        scheduled_at: new Date("2025-05-08T10:00:00Z"),
        distance: 525,
        order_date: new Date("2025-05-01T13:20:00Z"),
        max_price: 15000,
        goods_type: "Household Goods",
        weight: 1500,
        truck_type: "Container",
        description: "Personal household items for relocation",
        special_instructions: "Fragile items included",
        status: "In Transit",
        assigned_transporter_id: transporterMap["SpeedCargo Logistics"],
        final_price: 14200,
        shipments: [
          {
            item_name: "Furniture",
            quantity: 15,
            price: 8000,
          },
          {
            item_name: "Electronics",
            quantity: 10,
            price: 4000,
          },
          {
            item_name: "Personal Effects",
            quantity: 25,
            price: 2200,
          },
        ],
      },
      {
        customer_id: customerMap["Amit Singh"],
        pickup: {
          street: "Tower B, DLF Cyber City",
          city: "Gurugram",
          state: "Haryana",
          pin: "122002",
        },
        delivery: {
          street: "Sector 63",
          city: "Noida",
          state: "Uttar Pradesh",
          pin: "201301",
        },
        scheduled_at: new Date("2025-05-09T09:30:00Z"),
        distance: 35,
        order_date: new Date("2025-05-02T15:40:00Z"),
        max_price: 7500,
        goods_type: "IT Equipment",
        weight: 600,
        truck_type: "Open Body",
        description: "Servers and networking equipment",
        special_instructions: "Handle with extreme care. Avoid exposure to dust.",
        status: "In Transit",
        assigned_transporter_id: transporterMap["North Star Carriers"],
        final_price: 7000,
        shipments: [
          {
            item_name: "Server Racks",
            quantity: 3,
            price: 4500,
          },
          {
            item_name: "Network Switches",
            quantity: 10,
            price: 2500,
          },
        ],
      },
      {
        customer_id: customerMap["Sunita Verma"],
        pickup: {
          street: "8, Raj Grandeur, Powai",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400076",
        },
        delivery: {
          street: "Civil Lines",
          city: "Jaipur",
          state: "Rajasthan",
          pin: "302006",
        },
        scheduled_at: new Date("2025-05-08T06:00:00Z"),
        distance: 1145,
        order_date: new Date("2025-05-03T14:15:00Z"),
        max_price: 32000,
        goods_type: "Fashion Merchandise",
        weight: 1800,
        truck_type: "Container",
        description: "Branded clothing and accessories for retail store",
        status: "In Transit",
        assigned_transporter_id: transporterMap["FastTrack Transport Services"],
        final_price: 31000,
        shipments: [
          {
            item_name: "Women's Apparel",
            quantity: 500,
            price: 18000,
          },
          {
            item_name: "Men's Apparel",
            quantity: 300,
            price: 13000,
          },
        ],
      },
      // ---- COMPLETED ORDERS ----
      {
        customer_id: customerMap["Rajesh Sharma"],
        pickup: {
          street: "42, Park Avenue, Bandra",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400050",
        },
        delivery: {
          street: "B-12, Transport Nagar",
          city: "Delhi",
          state: "Delhi",
          pin: "110041",
        },
        scheduled_at: new Date("2025-05-04T08:00:00Z"),
        distance: 1400,
        order_date: new Date("2025-04-25T10:30:00Z"),
        max_price: 38000,
        goods_type: "Consumer Electronics",
        weight: 2200,
        truck_type: "Container",
        description: "High-end consumer electronics for retail store",
        status: "Completed",
        assigned_transporter_id: transporterMap["North Star Carriers"],
        final_price: 37500,
        shipments: [
          {
            item_name: "Smart TVs",
            quantity: 20,
            price: 20000,
            delivery_status: "Delivered",
          },
          {
            item_name: "Home Theater Systems",
            quantity: 15,
            price: 12000,
            delivery_status: "Delivered",
          },
          {
            item_name: "Gaming Consoles",
            quantity: 10,
            price: 5500,
            delivery_status: "Delivered",
          },
        ],
        transaction: {
          transaction_id: "TRANS123456789",
          amount: 37500,
        },
      },
      {
        customer_id: customerMap["Priya Patel"],
        pickup: {
          street: "Plot 27, MIDC Industrial Area, Andheri East",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400093",
        },
        delivery: {
          street: "Model Town",
          city: "Ludhiana",
          state: "Punjab",
          pin: "141002",
        },
        scheduled_at: new Date("2025-05-05T07:30:00Z"),
        distance: 1725,
        order_date: new Date("2025-04-26T11:15:00Z"),
        max_price: 45000,
        goods_type: "Machinery Parts",
        weight: 4500,
        truck_type: "Flatbed",
        description: "Industrial machinery parts for textile mill",
        special_instructions: "Heavy equipment, requires crane for unloading",
        status: "Completed",
        assigned_transporter_id: transporterMap["FastTrack Transport Services"],
        final_price: 44000,
        shipments: [
          {
            item_name: "Spinning Machine Parts",
            quantity: 5,
            price: 25000,
            delivery_status: "Delivered",
          },
          {
            item_name: "Weaving Machine Components",
            quantity: 8,
            price: 19000,
            delivery_status: "Delivered",
          },
        ],
        transaction: {
          transaction_id: "TRANS987654321",
          amount: 44000,
        },
      },
      {
        customer_id: customerMap["Amit Singh"],
        pickup: {
          street: "Tower B, DLF Cyber City",
          city: "Gurugram",
          state: "Haryana",
          pin: "122002",
        },
        delivery: {
          street: "Phase 8, Industrial Area",
          city: "Mohali",
          state: "Punjab",
          pin: "160059",
        },
        scheduled_at: new Date("2025-05-06T09:00:00Z"),
        distance: 260,
        order_date: new Date("2025-04-27T16:20:00Z"),
        max_price: 12000,
        goods_type: "Software Products",
        weight: 300,
        truck_type: "Open Body",
        description: "Software installation kits and hardware dongles",
        status: "Completed",
        assigned_transporter_id: transporterMap["North Star Carriers"],
        final_price: 11500,
        shipments: [
          {
            item_name: "Software Installation Kits",
            quantity: 100,
            price: 7500,
            delivery_status: "Damaged",
          },
          {
            item_name: "License Dongles",
            quantity: 100,
            price:  4000,
            delivery_status: "Delivered",
          },
        ],
        transaction: {
          transaction_id: "TRANS567891234",
          amount: 11500,
        },
      },
      {
        customer_id: customerMap["Sunita Verma"],
        pickup: {
          street: "Plot 15, Phase II, Chakan Industrial Area",
          city: "Pune",
          state: "Maharashtra",
          pin: "410501",
        },
        delivery: {
          street: "GIDC, Makarpura",
          city: "Vadodara",
          state: "Gujarat",
          pin: "390010",
        },
        scheduled_at: new Date("2025-05-07T11:00:00Z"),
        distance: 435,
        order_date: new Date("2025-04-28T10:00:00Z"),
        max_price: 18000,
        goods_type: "Chemical Products",
        weight: 2000,
        truck_type: "Tanker",
        description: "Industrial chemicals for manufacturing plant",
        special_instructions: "Hazardous material, follow safety protocols",
        status: "Completed",
        assigned_transporter_id: transporterMap["SpeedCargo Logistics"],
        final_price: 17800,
        shipments: [
          {
            item_name: "Industrial Chemicals",
            quantity: 2000,
            price: 17800,
            delivery_status: "Delivered",
          },
        ],
        transaction: {
          transaction_id: "TRANS345678912",
          amount: 17800,
        },
      },
      // ---- CANCELLED ORDERS ----
      {
        customer_id: customerMap["Rajesh Sharma"],
        pickup: {
          street: "Infinity Park, Building 4, Malad",
          city: "Mumbai",
          state: "Maharashtra",
          pin: "400064",
        },
        delivery: {
          street: "Kaloor",
          city: "Kochi",
          state: "Kerala",
          pin: "682017",
        },
        scheduled_at: new Date("2025-05-14T08:00:00Z"),
        distance: 1375,
        order_date: new Date("2025-05-07T16:45:00Z"),
        max_price: 36000,
        goods_type: "Paper Products",
        weight: 3000,
        truck_type: "Container",
        description: "Stationery and paper products for wholesale distribution",
        status: "Cancelled",
        shipments: [
          {
            item_name: "Copy Paper Reams",
            quantity: 1000,
            price: 20000,
          },
          {
            item_name: "Notebooks",
            quantity: 5000,
            price: 10000,
          },
          {
            item_name: "Office Stationery",
            quantity: 2000,
            price: 6000,
          },
        ],
      },
      {
        customer_id: customerMap["Priya Patel"],
        pickup: {
          street: "12, Green Valley, Satellite Road",
          city: "Ahmedabad",
          state: "Gujarat",
          pin: "380015",
        },
        delivery: {
          street: "Anna Salai",
          city: "Chennai",
          state: "Tamil Nadu",
          pin: "600002",
        },
        scheduled_at: new Date("2025-05-15T10:00:00Z"),
        distance: 1640,
        order_date: new Date("2025-05-06T14:30:00Z"),
        max_price: 42000,
        goods_type: "Food Products",
        weight: 1800,
        truck_type: "Refrigerated",
        description: "Packaged food products requiring temperature control",
        special_instructions: "Maintain temperature below 5°C",
        status: "Cancelled",
        shipments: [
          {
            item_name: "Dairy Products",
            quantity: 500,
            price: 25000,
          },
          {
            item_name: "Frozen Foods",
            quantity: 300,
            price: 17000,
          },
        ],
      },
    ];

    // Step 5: Insert Orders
    await Order.deleteMany(); // Clear existing orders
    const insertedOrders = await Order.insertMany(orders);
    console.log("✅ Orders inserted successfully");

    // Step 6: Create Bids for Placed Orders
    // First, create an array to store all bids
    const bids = [];
    
    // Map to store order IDs
    const orderMap = {
      // For the three original placed orders
      "RajeshElectronics": insertedOrders.find(o => 
        o.customer_id.equals(customerMap["Rajesh Sharma"]) && 
        o.goods_type === "Electronics" && 
        o.status === "Placed")._id,
      
      "PriyaTextiles": insertedOrders.find(o => 
        o.customer_id.equals(customerMap["Priya Patel"]) && 
        o.goods_type === "Textiles" && 
        o.status === "Placed")._id,
      
      "AmitOfficeSupplies": insertedOrders.find(o => 
        o.customer_id.equals(customerMap["Amit Singh"]) && 
        o.goods_type === "Office Supplies" && 
        o.status === "Placed")._id,
      
      // For the two new placed orders
      "SunitaMedical": insertedOrders.find(o => 
        o.customer_id.equals(customerMap["Sunita Verma"]) && 
        o.goods_type === "Medical Equipment" && 
        o.status === "Placed")._id,
      
      "AmitDataCenter": insertedOrders.find(o => 
        o.customer_id.equals(customerMap["Amit Singh"]) && 
        o.goods_type === "Data Center Equipment" && 
        o.status === "Placed")._id
    };

    // Add bids for first order (RajeshElectronics)
    bids.push({
      order_id: orderMap["RajeshElectronics"],
      transporter_id: transporterMap["SpeedCargo Logistics"],
      bid_amount: 24200,
      notes: "Can provide container truck with proper cushioning for electronics. Will ensure temperature control."
    });
    
    bids.push({
      order_id: orderMap["RajeshElectronics"],
      transporter_id: transporterMap["FastTrack Transport Services"],
      bid_amount: 23800,
      notes: "We have experience with electronics transport. Can guarantee delivery within 48 hours."
    });
    
    bids.push({
      order_id: orderMap["RajeshElectronics"],
      transporter_id: transporterMap["North Star Carriers"],
      bid_amount: 24500,
      notes: "Will provide extra packaging material and insurance coverage for sensitive electronics."
    });
    
    // Add bids for second order (PriyaTextiles)
    bids.push({
      order_id: orderMap["PriyaTextiles"],
      transporter_id: transporterMap["SpeedCargo Logistics"],
      bid_amount: 33500,
      notes: "Our open body trucks are suitable for textiles transportation. Will ensure proper covering against dust and rain."
    });
    
    bids.push({
      order_id: orderMap["PriyaTextiles"],
      transporter_id: transporterMap["FastTrack Transport Services"],
      bid_amount: 34200,
      notes: "Have transported textiles previously on this route. Will provide tarps to protect from weather conditions."
    });
    
    // Add bids for third order (AmitOfficeSupplies)
    bids.push({
      order_id: orderMap["AmitOfficeSupplies"],
      transporter_id: transporterMap["North Star Carriers"],
      bid_amount: 7800,
      notes: "Local delivery within Delhi-NCR region. Can deliver same day."
    });
    
    bids.push({
      order_id: orderMap["AmitOfficeSupplies"],
      transporter_id: transporterMap["SpeedCargo Logistics"],
      bid_amount: 7900,
      notes: "Will ensure careful handling of office furniture. Available for delivery during specified office hours."
    });
    
    // Add bids for fourth order (SunitaMedical)
    bids.push({
      order_id: orderMap["SunitaMedical"],
      transporter_id: transporterMap["SpeedCargo Logistics"],
      bid_amount: 32000,
      notes: "Specialized in transporting fragile medical equipment. Will provide shock-absorbing packaging."
    });
    
    bids.push({
      order_id: orderMap["SunitaMedical"],
      transporter_id: transporterMap["FastTrack Transport Services"],
      bid_amount: 31500,
      notes: "Can arrange for temperature-controlled container and specialized handling equipment."
    });
    
    bids.push({
      order_id: orderMap["SunitaMedical"],
      transporter_id: transporterMap["North Star Carriers"],
      bid_amount: 32800,
      notes: "Have experience with medical equipment transport. Will ensure minimal vibration during transit."
    });
    
    // Add bids for fifth order (AmitDataCenter)
    bids.push({
      order_id: orderMap["AmitDataCenter"],
      transporter_id: transporterMap["FastTrack Transport Services"],
      bid_amount: 37200,
      notes: "Our fleet has humidity control systems perfect for sensitive data center equipment."
    });
    
    bids.push({
      order_id: orderMap["AmitDataCenter"],
      transporter_id: transporterMap["North Star Carriers"],
      bid_amount: 37500,
      notes: "Can provide specialized containers with environmental controls for server equipment."
    });
    
    // Now add this to the seeding function
    // After inserting orders and before closing the function:
      
    // Step 6: Inser  t Bids
    await mongoose.model('Bid').deleteMany(); // Clear existing bids if any
    await mongoose.model('Bid').insertMany(bids);
    console.log("✅ Bids inserted successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    mongoose.connection.close()
  }

}

// Run the seeding function
seedDatabase();