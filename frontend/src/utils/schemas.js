import { z } from 'zod';

// Regex patterns
export const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@([a-zA-Z]+[a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/,
  PHONE: /^(\+91\s)?[6-9]\d{9}$/,
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PIN: /^[1-9][0-9]{5}$/,
  VEHICLE_REG: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*,?&])[A-Za-z\d@$!%*,?&]{8,}$/,
  NAME: /^[A-Za-z\s'-]+$/,
};

// Base schemas
export const emailSchema = z.string().min(1, 'Email is required').regex(REGEX.EMAIL, 'Please enter a valid email address');
export const phoneSchema = z.string().min(1, 'Phone number is required').regex(REGEX.PHONE, 'Please enter a valid 10-digit phone number');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').regex(REGEX.PASSWORD, 'Password must contain uppercase, lowercase, number and special character');
export const gstSchema = z.string().min(1, 'GST number is required').regex(REGEX.GST, 'Please enter a valid GSTIN (e.g., 22AAAAA0000A1Z5)');
export const panSchema = z.string().min(1, 'PAN is required').regex(REGEX.PAN, 'Please enter a valid PAN (e.g., ABCDE1234F)');
export const pinSchema = z.string().min(1, 'PIN code is required').regex(REGEX.PIN, 'Please enter a valid 6-digit PIN code');
export const vehicleRegSchema = z.string().min(1, 'Registration number is required').regex(REGEX.VEHICLE_REG, 'Please enter a valid registration (e.g., AB12CD3456)');
export const dobSchema = z.string().min(1, 'Date of birth is required').refine((dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}, 'You must be at least 18 years old');

// Login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Customer signup
export const customerSignupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters').max(50, 'First name is too long').regex(REGEX.NAME, 'First name can only contain letters, spaces, hyphens and apostrophes'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters').max(50, 'Last name is too long').regex(REGEX.NAME, 'Last name can only contain letters, spaces, hyphens and apostrophes'),
  gender: z.string().min(1, 'Gender is required'),
  phone: phoneSchema,
  email: emailSchema,
  dob: dobSchema,
  street_address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pin: pinSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const customerStep1Schema = customerSignupSchema.pick({ firstName: true, lastName: true, gender: true, email: true });
export const customerStep2Schema = customerSignupSchema.pick({ phone: true, dob: true });
export const customerStep3Schema = customerSignupSchema.pick({ street_address: true, city: true, state: true, pin: true });
export const customerStep4Schema = customerSignupSchema.pick({ password: true, confirmPassword: true, terms: true });

// Transporter signup
export const vehicleSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required'),
  type: z.string().min(1, 'Vehicle type is required'),
  registrationNumber: vehicleRegSchema,
  capacity: z.string().min(1, 'Vehicle capacity is required').refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: 'Vehicle capacity must be greater than 0' }),
  manufacture_year: z.string().min(1, 'Manufacture year is required').refine((val) => val.length === 4 && !isNaN(Number(val)), { message: 'Enter a valid 4 digit year' }).refine((val) => {
    const year = Number(val);
    const currentYear = new Date().getFullYear();
    return year >= 1980 && year <= currentYear;
  }, `Enter a year between 1980 and ${new Date().getFullYear()}`),
});

export const transporterSignupSchema = z.object({
  name: z.string().min(1, 'Full name is required').min(2, 'Name must be at least 2 characters').max(50, 'Name is too long').regex(REGEX.NAME, 'Name can only contain letters, spaces, hyphens and apostrophes'),
  primary_contact: phoneSchema,
  secondary_contact: phoneSchema,
  email: emailSchema,
  gst_in: gstSchema,
  pan: panSchema,
  street_address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pin: pinSchema,
  vehicles: z.array(vehicleSchema).min(1, 'At least one vehicle is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const transporterStep1Schema = transporterSignupSchema.pick({ name: true, primary_contact: true, secondary_contact: true, email: true });
export const transporterStep2Schema = transporterSignupSchema.pick({ gst_in: true, pan: true, street_address: true, city: true, state: true, pin: true });
export const transporterStep3Schema = transporterSignupSchema.pick({ vehicles: true });
export const transporterStep4Schema = transporterSignupSchema.pick({ password: true, confirmPassword: true, terms: true });

// Forgot password
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Profile field update schemas
export const profileFieldSchemas = {
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters').max(50, 'First name is too long').regex(/^[A-Za-z\s'-]+$/, 'First name can only contain letters, spaces, hyphens and apostrophes'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name is too long').regex(/^[A-Za-z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens and apostrophes'),
  email: emailSchema,
  phone: phoneSchema,
  dob: z.string().min(1, 'Date of birth is required').refine((dob) => {
    const selectedDate = new Date(dob);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    if (selectedDate > today) return false;
    if (selectedDate < minDate) return false;
    return true;
  }, 'Please enter a valid date of birth'),
  gender: z.enum(['Male', 'Female', 'Other'], { errorMap: () => ({ message: 'Please select a valid gender' }) }),
};

// Transporter profile field update schemas
export const transporterProfileFieldSchemas = {
  name: z.string().min(1, 'Company name is required').min(2, 'Name must be at least 2 characters').max(100, 'Company name is too long').regex(REGEX.NAME, 'Name can only contain letters, spaces, hyphens and apostrophes'),
  email: emailSchema,
  primary_contact: phoneSchema,
  secondary_contact: phoneSchema.optional().or(z.literal('')),
  pan: panSchema,
  gst_in: gstSchema,
  street: z.string().min(5, 'Street address is too short').max(200, 'Street address is too long'),
  city: z.string().min(1, 'City is required').regex(/^[a-zA-Z\s-]+$/, 'City name can only contain letters, spaces, and hyphens'),
  state: z.string().min(1, 'State is required').regex(/^[a-zA-Z\s-]+$/, 'State name can only contain letters, spaces, and hyphens'),
  pin: pinSchema,
};

// Address schema
export const addressSchema = z.object({
  address_label: z.string().min(1, 'Address label is required').max(20, 'Address label is too long'),
  street: z.string().min(5, 'Street address is too short').max(200, 'Street address is too long'),
  city: z.string().min(1, 'City is required').regex(/^[a-zA-Z\s-]+$/, 'City name can only contain letters, spaces, and hyphens'),
  state: z.string().min(1, 'State is required').regex(/^[a-zA-Z\s-]+$/, 'State name can only contain letters, spaces, and hyphens'),
  pin: pinSchema,
  phone: phoneSchema,
});

// Password update schema
export const passwordUpdateSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
