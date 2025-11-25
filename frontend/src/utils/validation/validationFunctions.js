/**
 * Form Validation Functions
 * Centralized validators for all form fields with regex patterns
 */

// --------------------------------------------------------------------------
// Regex Patterns
// --------------------------------------------------------------------------

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z]+[a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(\+91\s)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PIN_REGEX = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;
const VEHICLE_REG_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// --------------------------------------------------------------------------
// Validators
// --------------------------------------------------------------------------

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email)) return 'Invalid email format';
  return '';
}

export function validatePhone(phone) {
  if (!phone || !phone.trim()) return 'Phone number is required';
  if (!PHONE_REGEX.test(phone)) return 'Invalid phone number (10 digits, starting with 6-9)';
  return '';
}

export function validateGST(gst) {
  if (!gst || !gst.trim()) return 'GST number is required';
  if (!GST_REGEX.test(gst)) return 'Invalid GST format (e.g., 27AAPFU0939F1ZV)';
  return '';
}

export function validatePAN(pan) {
  if (!pan || !pan.trim()) return 'PAN number is required';
  if (!PAN_REGEX.test(pan)) return 'Invalid PAN format (e.g., ABCDE1234F)';
  return '';
}

export function validatePIN(pin) {
  if (!pin || !pin.trim()) return 'PIN code is required';
  if (!PIN_REGEX.test(pin)) return 'Invalid PIN code (6 digits)';
  return '';
}

export function validateVehicleReg(registration) {
  if (!registration || !registration.trim()) return 'Vehicle registration is required';
  if (!VEHICLE_REG_REGEX.test(registration)) return 'Invalid registration format (e.g., KA01AB1234)';
  return '';
}

export function validatePassword(password) {
  if (!password || !password.trim()) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!PASSWORD_REGEX.test(password)) return 'Password must have uppercase, lowercase, number & special character';
  return '';
}

export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword || !confirmPassword.trim()) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}

export function validateRequired(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && !value.trim())) return `${fieldName} is required`;
  return '';
}

// Validate date of birth (must be 18+ years old)
export function validateDOB(dob) {
  if (!dob || !dob.trim()) {
    return 'Date of birth is required';
  }
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) {
    return 'Invalid date format';
  }
  
  if (birthDate > today) {
    return 'Date of birth cannot be in the future';
  }
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  
  if (age < 18) {
    return 'You must be at least 18 years old to register';
  }
  
  if (age > 120) {
    return 'Please enter a valid date of birth';
  }
  
  return '';
}

// --------------------------------------------------------------------------
// Helper Functions
// --------------------------------------------------------------------------

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(phone);
}

export function isValidPIN(pin) {
  return PIN_REGEX.test(pin);
}

export const REGEX = {
  EMAIL: EMAIL_REGEX,
  PHONE: PHONE_REGEX,
  GST: GST_REGEX,
  PAN: PAN_REGEX,
  PIN: PIN_REGEX,
  VEHICLE_REG: VEHICLE_REG_REGEX,
  PASSWORD: PASSWORD_REGEX,
};
