import { body, validationResult, matchedData } from "express-validator";
import { AppError, logger } from "../utils/misc.js";

export const validate = (validationSchema) => {
  return async (req, res, next) => {
    // Run each validation rule sequentially
    for (const validationRule of validationSchema) {
      await validationRule.run(req);
    }

    // Check if there are any validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION', errors.array());
      return next(error);
    }
    req.body = matchedData(req, { locations: ['body'] });
    next();
  };
};


const addressSchema = (prefix = '') => [
  body(prefix + 'street')
    .notEmpty().withMessage('Street is required'),
  body(prefix + 'city')
    .notEmpty().withMessage('City is required'),
  body(prefix + 'state')
    .notEmpty().withMessage('State is required'),
  body(prefix + 'pin')
    .notEmpty().withMessage('Pin code is required')
    .matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pin code')
];


const customer = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone')
    .trim()
    .replace(' ', '')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const now = new Date();
      if (inputDate >= now) {
        return false;
      }
      return true;
    }).withMessage('Invalid Date of Birth'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('address')
    .optional()
    .isObject().withMessage('Address must be an object')
    .custom((value) => {
      const requiredFields = ['street', 'city', 'state', 'pin'];
      for (const field of requiredFields) {
        if (!value[field]) {
          throw new Error(`Address field '${field}' is required`);
        }
      }
      return true;
    }),
];


// Update profile validation
const updateCustomer = [
  body('firstName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
  body('lastName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email address'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('dob')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Invalid date format (use YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const now = new Date();
      if (inputDate >= now) {
        return false;
      }
      return true;
    }).withMessage('Invalid Date of Birth'),
  body('gender')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other')
];


// Add address validation
const address = [
  ...addressSchema(""),

  body('address_label')
    .trim().notEmpty().withMessage('Address type is required'),
  body('phone')
    .optional().trim().trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number')
];


const vehicleSchema = (prefix = '') => [

  body(prefix + 'name')
    .trim().notEmpty().withMessage('Vehicle name is required'),

  body(prefix + 'truck_type')
    .trim().notEmpty().withMessage('Vehicle type is required'),

  body(prefix + 'registration')
    .trim().notEmpty().withMessage('Registration number is required')
    .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/).withMessage('Invalid registration number'),

  body(prefix + 'capacity')
    .toFloat().isFloat({ gt: 0 }).withMessage('Capacity must be a positive number'),

  body(prefix + 'manufacture_year')
    .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Invalid manufacture year')
    .toInt()
];



const transporter = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('primary_contact')
    .trim().replace(' ', '')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('secondary_contact')
    .optional().trim().replace(' ', '')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('pan')
    .trim()
    .notEmpty().withMessage('PAN number is required')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number'),

  body('gst_in')
    .trim()
    .notEmpty().withMessage('GST number is required')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number'),

  ...addressSchema(''),

  // Vehicles array
  body('vehicles')
    .isArray({ min: 1 }).withMessage('At least one vehicle is required'),

  ...vehicleSchema('vehicles.*.')
];



const updateTransporter = [
  body('name')
    .optional().trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .optional().trim()
    .isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('primary_contact')
    .optional().trim().replace(' ', '')
    .notEmpty().withMessage('Phone number cannot be empty')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('secondary_contact')
    .optional().trim().replace(' ', '')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('pan')
    .optional().trim()
    .notEmpty().withMessage('PAN number cannot be empty')
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number'),

  body('gst_in')
    .optional().trim()
    .notEmpty().withMessage('GST number cannot be empty')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number'),

  body('street')
    .optional().trim()
    .notEmpty().withMessage('Street cannot be empty'),
  body('city')
    .optional().trim()
    .notEmpty().withMessage('City cannot be empty'),
  body('state')
    .optional().trim()
    .notEmpty().withMessage('State cannot be empty'),
  body('pin')
    .optional().trim()
    .notEmpty().withMessage('Pin code cannot be empty')
    .matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pin code')

];


const truck = [
  ...vehicleSchema('')
]

const updateTruck = [

  body('name')
    .optional()
    .trim().notEmpty().withMessage('Vehicle cannot be empty'),

  body('truck_type')
    .optional()
    .trim().notEmpty().withMessage('Vehicle cannot be empty'),

  body('registration')
    .optional()
    .trim().notEmpty().withMessage('Registration cannot be empty')
    .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/).withMessage('Invalid registration number'),

  body('capacity')
    .optional()
    .toFloat().isFloat({ gt: 0 }).withMessage('Capacity must be a positive number'),

  body('manufacture_year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Invalid manufacture year')
    .toInt()
]

// Auth related schemas
const login = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  body('role').isIn(['customer','transporter','driver','admin', 'manager']).withMessage('Role must be customer, transporter, driver, manager or admin'),
]
const forgotPassword = [
  body('email').trim().isEmail().withMessage('Valid email required'),
  body('userType').trim().isIn(['customer', 'transporter', 'driver']).withMessage('Valid user type required (customer, transporter, driver)'),
]
const resetPassword = [
  body('token').notEmpty().withMessage('Reset token required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
]
const password = [
  body('oldPassword').notEmpty().withMessage('Old password required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
]

const bid = [
  body('bidAmount')
    .isInt({ min: 1 }).withMessage('Bid amount must be a positive integer'),
  body('notes')
    .optional().isString().withMessage('Notes must be a string'),
  body('quoteBreakdown')
    .notEmpty().withMessage('A detailed quote breakdown is required')
    .isObject().withMessage('Quote breakdown must be an object'),
  body('quoteBreakdown.transportation_charges')
    .isFloat({ min: 1 }).withMessage('Transportation charges are required and must be greater than 0'),
  body('quoteBreakdown.packing_cost')
    .optional().isFloat({ min: 0 }).withMessage('Packing cost must be a non-negative number'),
  body('quoteBreakdown.loading_charges')
    .optional().isFloat({ min: 0 }).withMessage('Loading charges must be a non-negative number'),
  body('quoteBreakdown.unloading_charges')
    .optional().isFloat({ min: 0 }).withMessage('Unloading charges must be a non-negative number'),
  body('quoteBreakdown.unpacking_charges')
    .optional().isFloat({ min: 0 }).withMessage('Unpacking charges must be a non-negative number'),
  body('quoteBreakdown.escort_charges')
    .optional().isFloat({ min: 0 }).withMessage('Escort charges must be a non-negative number'),
  body('quoteBreakdown.car_transportation')
    .optional().isFloat({ min: 0 }).withMessage('Car transportation must be a non-negative number'),
  body('quoteBreakdown.octroi_entry_tax')
    .optional().isFloat({ min: 0 }).withMessage('Octroi / entry tax must be a non-negative number'),
  body('quoteBreakdown.storage_charges')
    .optional().isFloat({ min: 0 }).withMessage('Storage charges must be a non-negative number'),
  body('quoteBreakdown.gst.rate_percent')
    .optional().isInt({ min: 0 }).withMessage('GST rate must be a non-negative integer'),
  body('quoteBreakdown.custom_items')
    .optional().isArray({ max: 5 }).withMessage('Maximum 5 custom charge items allowed'),
]

const order = [
  ...addressSchema('pickup.'),
  ...addressSchema('delivery.'),

  // Optional coordinate fields from geocoding
  body('pickup_coordinates')
    .optional()
    .isObject().withMessage('pickup_coordinates must be an object'),
  body('pickup.coordinates')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object' && value.lat !== undefined && value.lng !== undefined) return true;
      throw new Error('pickup.coordinates must be {lat,lng}');
    }),
  body('pickup_coordinates.lat')
    .optional()
    .isFloat().withMessage('Invalid latitude'),
  body('pickup_coordinates.lng')
    .optional()
    .isFloat().withMessage('Invalid longitude'),
  body('delivery_coordinates')
    .optional()
    .isObject().withMessage('delivery_coordinates must be an object'),
  body('delivery.coordinates')
    .optional()
    .custom((value) => {
      if (value && typeof value === 'object' && value.lat !== undefined && value.lng !== undefined) return true;
      throw new Error('delivery.coordinates must be {lat,lng}');
    }),
  body('delivery_coordinates.lat')
    .optional()
    .isFloat().withMessage('Invalid latitude'),
  body('delivery_coordinates.lng')
    .optional()
    .isFloat().withMessage('Invalid longitude'),

  body('scheduled_at')
    .notEmpty().withMessage('Scheduled pickup time is required')
    .isISO8601().withMessage('Scheduled time must be in ISO format')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 4);
      if (scheduledDate < minDate) {
        return false;
      }
      return true;
    }).withMessage('Pickup must be scheduled at least 4 days from now'),

  body('distance')
    .notEmpty().withMessage('Distance is required')
    .isFloat({ gt: 0 }).withMessage('Distance must be a positive number'),

  body('max_price')
    .notEmpty().withMessage('Maximum price is required')
    .isFloat({ min: 2000 }).withMessage('Maximum price must be at least 2000'),

  body('goods_type')
    .trim().notEmpty().withMessage('Goods type is required'),

  body('truck_type')
    .trim().notEmpty().withMessage('Truck type is required'),

  // Weight
  body('weight')
    .notEmpty().withMessage('Weight is required')
    .isFloat({ gt: 0 }).withMessage('Weight must be a positive number'),

  body('description')
    .trim().notEmpty().withMessage('Cargo description is required'),

  // Shipment items
  body('shipments')
    .isArray({ min: 1 }).withMessage('At least one shipment item is required'),
  body('shipments.*.item_name')
    .trim().notEmpty().withMessage('Item name is required'),
  body('shipments.*.quantity')
    .isInt({ gt: 0 }).withMessage('Item quantity must be a positive integer'),
  body('shipments.*.price')
    .isFloat({ gt: 0 }).withMessage('Item price must be a positive number'),
]

const driver = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('phone')
    .trim()
    .replace(' ', '')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('licenseNumber')
    .trim()
    .notEmpty().withMessage('License number is required'),

  ...addressSchema('address.'),
];


const updateDriver = [
  body('firstName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
  body('lastName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email address'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('gender')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other'),
  body('licenseNumber')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('License number cannot be empty'),
  body('address.street')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('Address cannot be empty'),
  body('address.city')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('City cannot be empty'),
  body('address.state')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('State cannot be empty'),
  body('address.pin')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('PIN code cannot be empty')
    .matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pin code'),
];

const scheduleBlock = [
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be in ISO format'),
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('End time must be in ISO format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title must be under 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be under 500 characters'),
];

const fleetScheduleBlock = [
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be in ISO format'),
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('End time must be in ISO format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('type')
    .notEmpty().withMessage('Block type is required')
    .isIn(['maintenance', 'unavailable', 'trip']).withMessage('Type must be maintenance, unavailable, or trip'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title must be under 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be under 500 characters'),
];


export const validationSchema = {
  customer,
  updateCustomer,
  address,
  transporter,
  updateTransporter,
  truck,
  updateTruck,
  login,
  forgotPassword,
  resetPassword,
  password,
  order,
  bid,
    driver,
    updateDriver,
    scheduleBlock,
    fleetScheduleBlock,
}