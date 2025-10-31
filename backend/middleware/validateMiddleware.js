const { body, validationResult } = require('express-validator');
const { matchedData } = require('express-validator');

// Helper for validating pickup and delivery
const validateAddress = (prefix) => [
  body(`${prefix}.street`).trim().notEmpty().withMessage(`${prefix} street is required`)
    .custom((value, { req }) => {
      console.log(`${prefix}.street validated:`, value);
      return true;
    }),
  body(`${prefix}.city`).trim().notEmpty().withMessage(`${prefix} city is required`)
    .custom((value, { req }) => {
      console.log(`${prefix}.city validated:`, value);
      return true;
    }),
  body(`${prefix}.state`).trim().notEmpty().withMessage(`${prefix} state is required`)
    .custom((value, { req }) => {
      console.log(`${prefix}.state validated:`, value);
      return true;
    }),
  body(`${prefix}.zip`)
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage(`Invalid ${prefix} pin code`)
    .custom((value, { req }) => {
      console.log(`${prefix}.zip validated:`, value);
      return true;
    }),
];

const validateOrder = [
  // 🏠 Pickup and Delivery
  ...validateAddress('pickup'),
  ...validateAddress('delivery'),

  // 📆 Transit
  body('transit.date')
    .isISO8601()
    .withMessage('Pickup date must be in ISO format')
    .custom((value) => {
      console.log('transit.date validated:', value);
      const pickupDate = new Date(value);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 4);
      minDate.setHours(0, 0, 0, 0);
      pickupDate.setHours(0, 0, 0, 0);
      if (pickupDate < minDate) {
        return false;
      }
      return true;
    }).withMessage('Pickup date must be at least 4 days from today'),

  body('transit.time').trim().notEmpty().withMessage('Pickup time is required')
    .custom((value, { req }) => {
      console.log('transit.time validated:', value);
      return true;
    }),
  body('transit.distance')
    .trim()
    .notEmpty().withMessage('Distance is required')
    .isFloat({ gt: 0 }).withMessage('Distance must be a positive number')
    .custom((value, { req }) => {
      console.log('transit.distance validated:', value);
      return true;
    }),

  // 📦 Cargo
  body('cargo.type').trim().notEmpty().withMessage('Goods type is required')
    .custom((value, { req }) => {
      console.log('cargo.type validated:', value);
      return true;
    }),
  body('cargo.vehicle').trim().notEmpty().withMessage('Vehicle type is required')
    .custom((value, { req }) => {
      console.log('cargo.vehicle validated:', value);
      return true;
    }),
  body('cargo.weight')
    .trim().notEmpty().withMessage('Weight is required')
    .isFloat({ gt: 0 }).withMessage('Weight must be a positive number')
    .custom((value, { req }) => {
      console.log('cargo.weight validated:', value);
      return true;
    }),
  body('cargo.description')
    .trim().notEmpty().withMessage('Cargo description is required')
    .custom((value, { req }) => {
      console.log('cargo.description validated:', value);
      return true;
    }),
  body('cargo.maxPrice')
    .trim().notEmpty().withMessage('Maximum price is required')
    .isFloat({ gt: 0 }).withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      console.log('cargo.maxPrice validated:', value);
      return true;
    }),

  // 📦 Shipment items
  body('shipments')
    .isArray({ min: 1 }).withMessage('At least one shipment item is required')
    .custom((value, { req }) => {
      console.log('shipments validated:', value);
      return true;
    }),
  body('shipments.*.name')
    .trim().notEmpty().withMessage('Item name is required')
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),
  body('shipments.*.quantity')
    .isInt({ gt: 0 }).withMessage('Item quantity must be a positive integer')
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),
  body('shipments.*.price')
    .isFloat({ gt: 0 }).withMessage('Item price must be a positive number')
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

  // ✅ Final reshaping and error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { pickup, delivery, transit, cargo, shipments } = req.body;

    req.body = {
      pickup: {
        street: pickup.street,
        city: pickup.city,
        state: pickup.state,
        pin: pickup.zip
      },
      delivery: {
        street: delivery.street,
        city: delivery.city,
        state: delivery.state,
        pin: delivery.zip
      },
      scheduled_at: new Date(`${transit.date}T${transit.time}`),
      distance: parseFloat(transit.distance),
      max_price: parseFloat(cargo.maxPrice),
      goods_type: cargo.type,
      truck_type: cargo.vehicle,
      weight: parseFloat(cargo.weight),
      description: cargo.description,
      shipments: shipments.map(s => ({
        item_name: s.name,
        quantity: parseInt(s.quantity),
        price: parseFloat(s.price),
      })),
    };

    console.log('✅ Order reshaped:', req.body);
    next();
  }
];

// Transporter signup
const validateTransporterSignup = [
  // Basic transporter info
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .custom((value, { req }) => {
      console.log('name validated:', value);
      return true;
    }),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
    .custom((value, { req }) => {
      console.log('email validated:', value);
      return true;
    }),

  body('primary_contact')
    .notEmpty().withMessage('Primary contact is required')
    .matches(/^(\+91\s?)?[6-9]\d{9}$/)
    .withMessage('Primary contact must be a valid 10-digit Indian number')
    .custom((value, { req }) => {
      console.log('primary_contact validated:', value);
      return true;
    }),

  body('secondary_contact')
    .optional({ nullable: true })
    .matches(/^(\+91\s?)?[6-9]\d{9}$/)
    .withMessage('Secondary contact must be a valid 10-digit Indian number')
    .custom((value, { req }) => {
      console.log('secondary_contact validated:', value);
      return true;
    }),

  // IDs
  body('pan')
    .notEmpty().withMessage('PAN is required')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('PAN format should be ABCDE1234F')
    .custom((value, { req }) => {
      console.log('pan validated:', value);
      return true;
    }),

  body('gst_in')
    .notEmpty().withMessage('GSTIN is required')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format')
    .custom((value, { req }) => {
      console.log('gst_in validated:', value);
      return true;
    }),

  // Address
  body('street_address')
    .notEmpty().withMessage('Street address is required')
    .trim()
    .custom((value, { req }) => {
      console.log('street_address validated:', value);
      return true;
    }),

  body('city')
    .notEmpty().withMessage('City is required')
    .trim()
    .custom((value, { req }) => {
      console.log('city validated:', value);
      return true;
    }),

  body('state')
    .notEmpty().withMessage('State is required')
    .trim()
    .custom((value, { req }) => {
      console.log('state validated:', value);
      return true;
    }),

  body('pin')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('PIN must be a valid 6-digit Indian code')
    .custom((value, { req }) => {
      console.log('pin validated:', value);
      return true;
    }),

  // Password
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .custom((value, { req }) => {
      console.log('password validated:', value);
      return true;
    }),

  // Vehicles array
  body('vehicles')
    .isArray({ min: 1 }).withMessage('At least one vehicle is required')
    .custom((value, { req }) => {
      console.log('vehicles validated:', value);
      return true;
    }),

  body('vehicles.*.name')
    .notEmpty().withMessage('Vehicle name is required')
    .trim()
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

    body('vehicles.*.truck_type')
    .trim()
    .notEmpty()
    .withMessage('Vehicle type is required')
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

  body('vehicles.*.registration')
    .notEmpty().withMessage('Registration number is required')
    .trim()
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

  body('vehicles.*.capacity')
    .isFloat({ gt: 0 }).withMessage('Capacity must be a positive number')
    .toFloat()
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

  body('vehicles.*.manufacture_year')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Enter a valid manufacture year')
    .toInt()
    .custom((value, { req, path }) => {
      console.log(`${path} validated:`, value);
      return true;
    }),

  // Error handler + sanitize & reshape
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    // Keep only validated fields (including optional ones)
    const safe = matchedData(req, { locations: ['body'], includeOptionals: true });

    // Reshape for controller
    req.body = {
      name: safe.name,
      gst_in: safe.gst_in,
      pan: safe.pan,
      street_address: safe.street_address,
      city: safe.city,
      state: safe.state,
      pin: safe.pin,
      primary_contact: safe.primary_contact,
      secondary_contact: safe.secondary_contact || null,
      email: safe.email,
      password: safe.password,
      fleet: Array.isArray(safe.vehicles)
        ? safe.vehicles.map(v => ({
            name: v.name,
            truck_type: v.truck_type,
            registration: v.registration,
            capacity: v.capacity,
            manufacture_year: v.manufacture_year
          }))
        : []
    };

    console.log('Reshaped req.body:', req.body);
    next();
  }
];

// Customer signup
const validateCustomerSignup = [
  // 1️⃣ Personal info
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .custom((value, { req }) => {
      console.log('firstName validated:', value);
      return true;
    }),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .custom((value, { req }) => {
      console.log('lastName validated:', value);
      return true;
    }),
  body('gender')
    .trim()
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other')
    .custom((value, { req }) => {
      console.log('gender validated:', value);
      return true;
    }),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be in YYYY-MM-DD format')
    .custom(val => {
      console.log('dob validated:', val);
      const dob = new Date(val);
      const today = new Date();
      if (dob >= today) return false;
      return true;
    }).withMessage('Date of birth must be in the past'),

  // 2️⃣ Contact
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .custom((value, { req }) => {
      console.log('email validated:', value);
      return true;
    }),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+91\s?)?[6-9]\d{9}$/)
    .withMessage('Phone must be a valid 10-digit Indian number')
    .custom((value, { req }) => {
      console.log('phone validated:', value);
      return true;
    }),

  // 3️⃣ Password
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .custom((value, { req }) => {
      console.log('password validated:', value);
      return true;
    }),

  // 4️⃣ Address object
  body('address.street_address')
    .trim()
    .notEmpty().withMessage('Street address is required')
    .custom((value, { req }) => {
      console.log('address.street_address validated:', value);
      return true;
    }),
  body('address.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .custom((value, { req }) => {
      console.log('address.city validated:', value);
      return true;
    }),
  body('address.state')
    .trim()
    .notEmpty().withMessage('State is required')
    .custom((value, { req }) => {
      console.log('address.state validated:', value);
      return true;
    }),
  body('address.pin')
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('PIN must be a valid 6-digit code')
    .custom((value, { req }) => {
      console.log('address.pin validated:', value);
      return true;
    }),

  // 5️⃣ Error handler + sanitize & reshape
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    // Sanitize and pull only validated fields
    const safe = matchedData(req, {
      locations: ['body'],
      includeOptionals: true
    });

    // Reshape for controller
    req.body = {
      firstName: safe.firstName,
      lastName: safe.lastName,
      email: safe.email,
      phone: safe.phone,
      dob: safe.dob,
      gender: safe.gender,
      password: safe.password,
      addresses: {
        street_address: safe.address.street_address,
        city: safe.address.city,
        state: safe.address.state,
        pin: safe.address.pin
      }
    };

    console.log('Reshaped req.body for controller:', req.body);
    next();
  }
];

// Login validation
const validateLogin = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .custom((value, { req }) => {
      console.log('email validated:', value);
      return true;
    }),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .custom((value, { req }) => {
      console.log('password validated:', value);
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    // Keep only validated fields
    const safe = matchedData(req, { locations: ['body'] });

    // Reshape for controller
    req.body = {
      email: safe.email,
      password: safe.password
    };
    console.log('Logged in Successfully:', req.body);
    next();
  }
];

// Update profile validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .custom((value, { req }) => {
      console.log('firstName validated:', value);
      return true;
    }),

  body('lastName')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .custom((value, { req }) => {
      console.log('lastName validated:', value);
      return true;
    }),

  body('email')
    .optional()
    .isEmail().withMessage('Valid email is required')
    .custom((value, { req }) => {
      console.log('email validated:', value);
      return true;
    }),

  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone number cannot be empty')
    .custom((value, { req }) => {
      console.log('phone validated:', value);
      return true;
    }),

  body('date_of_birth')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      console.log('date_of_birth validated:', value);
      const inputDate = new Date(value);
      const now = new Date();
      if (inputDate >= now) {
        return false;
      }
      return true;
    }).withMessage('Date of birth must be in the past'),

  body('gender')
    .optional()
    .trim()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other')
    .custom((value, { req }) => {
      console.log('gender validated:', value);
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const safe = matchedData(req, { locations: ['body'], includeOptionals: false });

    req.body = {
      ...(safe.firstName && { firstName: safe.firstName }),
      ...(safe.lastName && { lastName: safe.lastName }),
      ...(safe.email && { email: safe.email }),
      ...(safe.phone && { phone: safe.phone }),
      ...(safe.date_of_birth && { dob: safe.date_of_birth }),
      ...(safe.gender && { gender: safe.gender })
    };

    console.log('Reshaped profile update:', req.body);
    next();
  }
];

// Update password validation
const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required')
    .custom((value, { req }) => {
      console.log('currentPassword validated:', value);
      return true;
    }),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((value, { req }) => {
      console.log('newPassword validated:', value);
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    const safe = matchedData(req, { locations: ['body'], includeOptionals: false });

    console.log('Changed password', safe);

    // Reshaping for controller
    req.body = {
      currentPassword: safe.currentPassword,
      newPassword: safe.newPassword
    };
    next();
  }
];

// Add address validation
const addAddressValidation = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Address type is required')
    .custom((value, { req }) => {
      console.log('type validated:', value);
      return true;
    }),
  body('street').trim().notEmpty().withMessage('Street is required')
    .custom((value, { req }) => {
      console.log('street validated:', value);
      return true;
    }),
  body('city').trim().notEmpty().withMessage('City is required')
    .custom((value, { req }) => {
      console.log('city validated:', value);
      return true;
    }),
  body('state').trim().notEmpty().withMessage('State is required')
    .custom((value, { req }) => {
      console.log('state validated:', value);
      return true;
    }),
  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required')
    .isPostalCode('any')
    .withMessage('Invalid zip code')
    .custom((value, { req }) => {
      console.log('zipCode validated:', value);
      return true;
    }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Invalid phone number')
    .custom((value, { req }) => {
      console.log('phone validated:', value);
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const safe = matchedData(req, { locations: ['body'], includeOptionals: true });
    console.log('Add address:', safe);

    // Reshaping for controller
    req.body = {
      address_label: safe.type,
      street_address: safe.street,
      city: safe.city,
      state: safe.state,
      pin: safe.zipCode,
      contact_phone: safe.phone
    };

    next();
  }
];

// Middleware for validating and reshaping profile update data
const validateProfileUpdate = [
  // Name validation
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-zA-Z\s.&'-]{3,100}$/)
    .withMessage('Name must be 3-100 characters, letters, spaces, and some special characters allowed')
    .custom((value, { req }) => {
      console.log('Validating name:', value);
      return true;
    }),

  // GSTIN validation
  body('gst_in')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format (e.g., 27AAPFU0939F1ZV)')
    .custom((value, { req }) => {
      console.log('Validating GSTIN:', value);
      return true;
    }),

  // PAN validation
  body('pan')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN format (e.g., ABCDE1234F)')
    .custom((value, { req }) => {
      console.log('Validating PAN:', value);
      return true;
    }),

  // Email validation
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address (e.g., user@example.com)')
    .custom((value, { req }) => {
      console.log('Validating email:', value);
      return true;
    }),

  // Primary contact (phone) validation
  body('primary_contact')
    .optional()
    .matches(/^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/)
    .withMessage('Invalid phone number (e.g., 9876543210 or +919876543210)')
    .custom((value, { req }) => {
      console.log('Validating primary contact:', value);
      return true;
    }),

  // Street address validation
  body('street_address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street address cannot be empty')
    .custom((value, { req }) => {
      console.log('Validating street address:', value);
      return true;
    }),

  // City validation
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty')
    .custom((value, { req }) => {
      console.log('Validating city:', value);
      return true;
    }),

  // State validation
  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty')
    .custom((value, { req }) => {
      console.log('Validating state:', value);
      return true;
    }),

  // PIN code validation
  body('pin')
    .optional()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Invalid PIN code (e.g., 123456)')
    .custom((value, { req }) => {
      console.log('Validating PIN code:', value);
      return true;
    }),

  // Secondary contact (phone) validation
  body('secondary_contact')
    .optional()
    .matches(/^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/)
    .withMessage('Invalid secondary phone number (e.g., 9876543210 or +919876543210)')
    .custom((value, { req }) => {
      console.log('Validating secondary contact:', value);
      return true;
    }),

  // Error handler and data reshaping
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors in profile update:', errors.array());
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

  // Get validated data
  const validatedData = matchedData(req, { locations: ['body'], includeOptionals: true });
  console.log('Validated profile update data:', validatedData);

  // Reshape data to match schema fields
  const reshapedData = {
    ...(validatedData.name && { name: validatedData.name }),
    ...(validatedData.gst_in && { gst_in: validatedData.gst_in }),
    ...(validatedData.pan && { pan: validatedData.pan }),
    ...(validatedData.street_address && { street_address: validatedData.street_address }),
    ...(validatedData.city && { city: validatedData.city }),
    ...(validatedData.state && { state: validatedData.state }),
    ...(validatedData.pin && { pin: validatedData.pin }),
    ...(validatedData.primary_contact && { primary_contact: validatedData.primary_contact }),
    ...(validatedData.secondary_contact && { secondary_contact: validatedData.secondary_contact }),
    ...(validatedData.email && { email: validatedData.email }),
  };

  console.log('Reshaped data for controller:', reshapedData);
  req.validatedData = reshapedData;
  next();
}
];


const validateAddVehicle = [
  // Validate and sanitize vehicle name
  body('name')
    .trim()
    .notEmpty().withMessage('Vehicle name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Vehicle name must be between 3 and 100 characters'),

  // Validate and sanitize truck type (as a string)
  body('truck_type')
    .trim()
    .notEmpty().withMessage('Vehicle type is required')
    .isLength({ min: 1, max: 50 }).withMessage('Vehicle type must be between 1 and 50 characters'),

  // Validate and sanitize registration number
  body('registration')
    .trim()
    .notEmpty().withMessage('Registration number is required')
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/).withMessage('Invalid registration number format. Expected format: XX99XX9999 (e.g., KA01AB1234)'),

  // Validate and sanitize capacity (converted to float)
  body('capacity')
    .notEmpty().withMessage('Capacity is required')
    .isFloat({ gt: 0 }).withMessage('Capacity must be a positive number')
    .toFloat(),

  // Validate and sanitize manufacture year (converted to integer)
  body('manufacture_year')
    .notEmpty().withMessage('Manufacture year is required')
    .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage(`Manufacture year must be between 1900 and ${new Date().getFullYear()}`)
    .toInt(),

  // Validate status (must be 'Available' as per frontend)
  body('status')
    .equals('Available').withMessage('Status must be Available'),

  // Validate and sanitize last service date (optional, nullable)
  body('last_service_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD'),

  // Handle validation results, log, and prepare data
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors in add vehicle:', errors.array());
      return res.status(422).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }

    // Extract validated data
    const validatedData = matchedData(req, { locations: ['body'], includeOptionals: true });
    console.log('Validated vehicle data:', validatedData);

    // Attach validated data to request for controller use
    req.validatedData = validatedData;
    next();
  },
];
const validateSubmitBid = [

  // Validate bidAmount: must be a positive integer
  body('bidAmount')
    .isInt({ min: 1 }).withMessage('Bid amount must be a positive integer')
    .custom((value) => {
      console.log('Validating bidAmount:', value);
      return true;
    }),

  // Validate notes: optional string
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .custom((value) => {
      if (value !== undefined) {
        console.log('Validating notes:', value);
      }
      return true;
    }),

  // Validate truckId: must be a non-empty string
  body('truckId')
    .isString().withMessage('Truck ID must be a string')
    .notEmpty().withMessage('Truck ID is required')
    .custom((value) => {
      console.log('Validating truckId:', value);
      return true;
    }),

  // Final validation check and response handling
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const validatedData = matchedData(req);
    console.log('Validated bid data:', validatedData);

    // Reshape data for the controller based on BidSchema
    const reshapedData = {
      bid_amount: validatedData.bidAmount,
      notes: validatedData.notes || '',
    };
    next();
  }
];



module.exports = {
  validateOrder,
  validateTransporterSignup,
  validateCustomerSignup,
  validateLogin,
  updateProfileValidation,
  updatePasswordValidation,
  addAddressValidation,
  validateProfileUpdate,
  validateAddVehicle,
  validateSubmitBid
};