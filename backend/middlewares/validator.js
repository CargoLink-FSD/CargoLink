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
    .matches(/^[A-Za-z\s-]+$/).withMessage('Invalid charachters in first name'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s-]+$/).withMessage('Invalid charachters in first name'),
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
    .optional().trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[A-Za-z\s-]+$/).withMessage('Invalid charachters in first name'),
  body('lastName')
    .optional().trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[A-Za-z\s-]+$/).withMessage('Invalid charachters in last name'),
  body('email')
    .optional()
    .isEmail().withMessage('Valid email cannot be empty'),
  body('phone')
    .optional().trim().replace(' ', '')
    .notEmpty().withMessage('Phone number cannot be empty')
    .matches(/^(\+?91|0)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),
  body('dob')
    .optional()
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
    .optional().trim()
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
    .matches(/^[A-Za-z0-9\s-]+$/).withMessage('Invalid charachters in name'),
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
    .matches(/^[A-Za-z0-9\s-]+$/).withMessage('Invalid charachters in name'),
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
const login =  [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  body('role').isIn(['customer','transporter']).withMessage('Role must be customer or transporter'),
]
const forgotPassword =  [
  body('email').isEmail().withMessage('Valid email required'),
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
}